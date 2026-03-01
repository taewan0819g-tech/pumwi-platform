'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Link, useRouter } from '@/i18n/navigation'
import { Mic, MicOff, Loader2, Sparkles, ExternalLink, RefreshCw, MapPin, Search } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useTranslations } from 'next-intl'
import { useJsApiLoader } from '@react-google-maps/api'
import type { ExperiencePlace } from '@/app/api/ai/concierge/places/route'
import type { Workshop } from '@/app/api/ai/concierge/workshops/route'
import { NearbyArtistsDrawer } from './NearbyArtistsDrawer'

type PlaceCard = (ExperiencePlace | Workshop) & {
  description?: string | null
  image_url?: string | null
  is_pumwi_verified?: boolean
  lat?: number | null
  lng?: number | null
  dist_meters?: number | null
  /** DB-original address (for Google Maps search). Never modified by AI. */
  address_en?: string | null
  /** If DB has a dedicated map URL, use it first for "View on Google Maps". */
  map_url?: string | null
}

export interface ConciergeFilters {
  categories: string[]
  /** DB category_l (대분류); strict category-first filter. */
  category_l?: string | null
  /** DB category_m (중분류); optional narrow. */
  category_m?: string | null
  /** DB category_s (소분류); optional narrow. */
  category_s?: string | null
  /** Main noun/entity from LLM for description_en fallback search. */
  main_entity?: string | null
  mood_keywords: string[]
  walk_in_only: boolean
  max_transit_minutes: number | null
  with_kids: boolean
  intent: 'experience' | 'purchase'
  /** LLM-generated greeting only; no place names. Places come from DB. */
  chatResponse?: string
}

const PURPLE = '#8E86F5'
const PLACE_DEBOUNCE_MS = 300

/** Mock PUMWI Selected Artist cards — 카드 클릭 시 /artist/[id] 이동 (로그인 불필요) */
const MOCK_SELECTION = [
  { id: '1', name: '도예가 김OO', role: 'Ceramic Artist', studio: 'Chuncheon Studio' },
  { id: '2', name: '유리공예 이XX', role: 'Glass Artist', studio: 'Gangneung Atelier' },
  { id: '3', name: '목공예 박OO', role: 'Woodcraft Artist', studio: 'Wonju Workshop' },
  { id: '4', name: '조향사 최OO', role: 'Perfumer', studio: 'Seoul Studio' },
]

function formatDistance(distMeters: number | null | undefined): string {
  if (distMeters == null || !Number.isFinite(distMeters)) return '—'
  if (distMeters < 1000) return `${Math.round(distMeters)} m`
  return `${(distMeters / 1000).toFixed(1)} km`
}

export default function AIConciergeClient() {
  const router = useRouter()
  const tConcierge = useTranslations('concierge')
  const [input, setInput] = useState('')
  const [recording, setRecording] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [places, setPlaces] = useState<PlaceCard[]>([])
  const [conciergeMessage, setConciergeMessage] = useState<string | null>(null)
  const [noExactMatch, setNoExactMatch] = useState(false)
  const [workshopOnlyMessage, setWorkshopOnlyMessage] = useState(false)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'getting' | 'ok' | 'denied'>('idle')
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isManualLocation, setIsManualLocation] = useState(false)
  const [selectedRegionName, setSelectedRegionName] = useState<string | null>(null)
  const [currentAddress, setCurrentAddress] = useState<string | null>(null)
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false)
  const [lastSearchText, setLastSearchText] = useState<string | null>(null)
  const [placeSearchValue, setPlaceSearchValue] = useState('')
  const [placePredictions, setPlacePredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [placeDropdownOpen, setPlaceDropdownOpen] = useState(false)
  const [placeLoading, setPlaceLoading] = useState(false)
  const [showNearbyDrawer, setShowNearbyDrawer] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const mapDivRef = useRef<HTMLDivElement | null>(null)
  const placeContainerRef = useRef<HTMLDivElement | null>(null)
  const placeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [mapDivReady, setMapDivReady] = useState(false)
  const setMapDivRef = useCallback((el: HTMLDivElement | null) => {
    mapDivRef.current = el
    setMapDivReady(!!el)
  }, [])

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded: isMapsLoaded, loadError: mapsLoadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
    libraries: ['places'],
  })

  const getLocation = useCallback((): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationStatus('denied')
        setLocation(null)
        setCurrentAddress(null)
        resolve({ lat: null, lng: null })
        return
      }
      setLocationStatus('getting')
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setLocationStatus('ok')
          setLocation(coords)
          resolve(coords)
        },
        () => {
          setLocationStatus('denied')
          setLocation(null)
          setCurrentAddress(null)
          resolve({ lat: null, lng: null })
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      )
    })
  }, [])

  useEffect(() => {
    getLocation()
  }, [getLocation])

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!window.google?.maps?.Geocoder) return
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
        setCurrentAddress(results[0].formatted_address ?? null)
      } else {
        setCurrentAddress(null)
      }
    })
  }, [])

  useEffect(() => {
    if (!isMapsLoaded || mapsLoadError) return
    if (location != null && !isManualLocation) {
      reverseGeocode(location.lat, location.lng)
    } else if (isManualLocation && selectedRegionName) {
      setCurrentAddress(selectedRegionName)
    } else {
      setCurrentAddress(null)
    }
  }, [isMapsLoaded, mapsLoadError, location, isManualLocation, selectedRegionName, reverseGeocode])

  const getCategories = useCallback(async (text: string): Promise<ConciergeFilters> => {
    const res = await fetch('/api/ai/concierge/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? data.details ?? 'Failed to get categories')
    }
    const data = await res.json()
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      category_l: typeof data.category_l === 'string' ? data.category_l.trim() || undefined : undefined,
      category_m: typeof data.category_m === 'string' ? data.category_m.trim() : undefined,
      category_s: typeof data.category_s === 'string' ? data.category_s.trim() || undefined : undefined,
      main_entity: typeof data.main_entity === 'string' ? data.main_entity.trim() || undefined : undefined,
      mood_keywords: Array.isArray(data.mood_keywords) ? data.mood_keywords : [],
      walk_in_only: Boolean(data.walk_in_only),
      max_transit_minutes: data.max_transit_minutes != null ? Number(data.max_transit_minutes) : null,
      with_kids: Boolean(data.with_kids),
      intent: data.intent === 'purchase' ? 'purchase' : 'experience',
      chatResponse: typeof data.chatResponse === 'string' ? data.chatResponse.trim() : undefined,
    }
  }, [])

  const getWorkshops = useCallback(
    async (
      filters: ConciergeFilters,
      lat: number | null,
      lng: number | null
    ): Promise<{ places: Workshop[]; noExactMatch: boolean; fallbackSuggested?: boolean; workshopOnlyMessage?: boolean }> => {
      const params = new URLSearchParams()
      if (filters.category_l) params.set('category_l', filters.category_l)
      if (filters.category_m) params.set('category_m', filters.category_m)
      if (filters.category_s) params.set('category_s', filters.category_s)
      if (filters.categories.length) params.set('categories', filters.categories.join(','))
      if (filters.mood_keywords.length) params.set('mood_keywords', filters.mood_keywords.join(','))
      if (lat != null && lng != null) {
        params.set('lat', String(lat))
        params.set('lng', String(lng))
      }
      if (filters.walk_in_only) params.set('walk_in_only', '1')
      if (filters.max_transit_minutes != null) params.set('max_transit_minutes', String(filters.max_transit_minutes))
      if (filters.with_kids) params.set('with_kids', '1')
      params.set('intent', filters.intent)
      const res = await fetch(`/api/ai/concierge/workshops?${params.toString()}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? data.details ?? 'Failed to get workshops')
      }
      const data = await res.json()
      return {
        places: Array.isArray(data.places) ? data.places : [],
        noExactMatch: Boolean(data.noExactMatch),
        fallbackSuggested: Boolean(data.fallbackSuggested),
        workshopOnlyMessage: Boolean(data.workshopOnlyMessage),
      }
    },
    []
  )

  const getPlaces = useCallback(async (filters: ConciergeFilters, lat: number | null, lng: number | null): Promise<{ places: ExperiencePlace[]; noExactMatch: boolean; fallbackSuggested?: boolean; workshopOnlyMessage?: boolean }> => {
    const params = new URLSearchParams()
    if (filters.category_l) params.set('category_l', filters.category_l)
    if (filters.category_m) params.set('category_m', filters.category_m)
    if (filters.category_s) params.set('category_s', filters.category_s)
    if (filters.main_entity) params.set('main_entity', filters.main_entity)
    if (filters.categories.length) params.set('categories', filters.categories.join(','))
    if (filters.mood_keywords.length) params.set('mood_keywords', filters.mood_keywords.join(','))
    if (lat != null && lng != null) {
      params.set('lat', String(lat))
      params.set('lng', String(lng))
    }
    const res = await fetch(`/api/ai/concierge/places?${params.toString()}`)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error ?? data.details ?? 'Failed to get places')
    }
    const data = await res.json()
    return {
      places: Array.isArray(data.places) ? data.places : [],
      noExactMatch: Boolean(data.noExactMatch),
      fallbackSuggested: Boolean(data.fallbackSuggested),
      workshopOnlyMessage: Boolean(data.workshopOnlyMessage),
    }
  }, [])

  const runSearch = useCallback(
    async (text: string, overrideCoords?: { lat: number; lng: number; regionName?: string }) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setError(null)
      setConciergeMessage(null)
      setLastSearchText(trimmed)
      setLoading(true)
      try {
        const filters = await getCategories(trimmed)
        let coords: { lat: number | null; lng: number | null }
        if (overrideCoords) {
          coords = { lat: overrideCoords.lat, lng: overrideCoords.lng }
        } else if (location != null && !isRefreshingLocation) {
          coords = location
        } else {
          coords = await getLocation()
        }
        const lat = coords.lat
        const lng = coords.lng

        const hasValidCoords =
          lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
        if (!hasValidCoords) {
          setError(
            "📍 현재 위치를 파악할 수 없습니다. 위치 권한을 허용하시거나, 우측 상단의 '지역 검색' 창에 원하시는 지역을 입력해 주세요."
          )
          setLoading(false)
          return
        }
        const latNum = lat as number
        const lngNum = lng as number

        let nextPlaces: PlaceCard[] = []
        let noExactMatch = false
        let fallbackSuggested = false
        let workshopOnlyMsg = false
        let usedWorkshops = false

        try {
          const workshopResult = await getWorkshops(filters, latNum, lngNum)
          if (workshopResult.places.length > 0) {
            nextPlaces = workshopResult.places
            noExactMatch = workshopResult.noExactMatch
            fallbackSuggested = workshopResult.fallbackSuggested ?? false
            workshopOnlyMsg = workshopResult.workshopOnlyMessage ?? false
            usedWorkshops = true
          }
        } catch {
          /* experience_spots (workshops) may fail; fall back to places API */
        }

        if (!usedWorkshops) {
          const placeResult = await getPlaces(filters, latNum, lngNum)
          nextPlaces = placeResult.places
          noExactMatch = placeResult.noExactMatch
          fallbackSuggested = placeResult.fallbackSuggested ?? false
          workshopOnlyMsg = placeResult.workshopOnlyMessage ?? false
        }

        setPlaces(nextPlaces)
        setNoExactMatch(noExactMatch)
        setWorkshopOnlyMessage(workshopOnlyMsg)

        if (nextPlaces.length === 0) {
          setConciergeMessage('조건에 맞는 공방을 찾지 못했어요. 다른 키워드로 검색해 보시겠어요?')
        } else if (fallbackSuggested) {
          setConciergeMessage('근처에는 없지만, 대표님의 취향에 딱 맞는 대한민국 최고의 공방들을 전국에서 엄선해 왔어요! 조금 거리는 있어도 꼭 가보실 가치가 있답니다. 📍')
        } else {
          const greeting =
            filters.chatResponse && filters.chatResponse.trim()
              ? filters.chatResponse.trim()
              : noExactMatch
                ? '근처에는 없지만, 가장 멋진 공방들을 찾아봤어요!'
                : '아래 공방 추천을 확인해 주세요.'
          setConciergeMessage(greeting)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setPlaces([])
        setNoExactMatch(false)
        setWorkshopOnlyMessage(false)
        setConciergeMessage(null)
      } finally {
        setLoading(false)
      }
    },
    [getCategories, getLocation, getWorkshops, getPlaces, location, isRefreshingLocation, isManualLocation, selectedRegionName]
  )

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        if (chunksRef.current.length === 0) {
          setError('No audio recorded')
          return
        }
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const form = new FormData()
        form.append('audio', blob, 'voice.webm')
        form.append('tab', 'exhibition')
        setLoading(true)
        setError(null)
        try {
          const res = await fetch('/api/ai/voice-generate', { method: 'POST', body: form })
          if (!res.ok) {
            const data = await res.json().catch(() => ({}))
            throw new Error(data.error ?? 'Transcription failed')
          }
          const data = await res.json()
          const text = [data.title, data.content].filter(Boolean).join(' ') || data.content
          if (text?.trim()) {
            setInput(text)
            router.push(`/search?q=${encodeURIComponent(text.trim())}`)
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Voice failed')
        } finally {
          setLoading(false)
        }
      }
      mediaRecorderRef.current = mr
      mr.start(1000)
      setRecording(true)
    } catch {
      setError('Microphone access denied')
    }
  }, [router])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setRecording(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = input.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleRefreshLocation = useCallback(() => {
    setIsManualLocation(false)
    setSelectedRegionName(null)
    setIsRefreshingLocation(true)
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      setLocation(null)
      setIsRefreshingLocation(false)
      return
    }
    setLocationStatus('getting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(coords)
        setLocationStatus('ok')
        setIsManualLocation(false)
        setSelectedRegionName(null)
        if (window.google?.maps?.Geocoder) {
          const geocoder = new window.google.maps.Geocoder()
          geocoder.geocode({ location: coords }, (results, status) => {
            if (status === window.google.maps.GeocoderStatus.OK && results?.[0]) {
              setCurrentAddress(results[0].formatted_address ?? null)
            } else {
              setCurrentAddress(null)
            }
          })
        } else {
          setCurrentAddress(null)
        }
        toast.success('Location updated!')
        if (lastSearchText) runSearch(lastSearchText)
        setIsRefreshingLocation(false)
      },
      () => {
        setLocationStatus('denied')
        setLocation(null)
        setCurrentAddress(null)
        toast.error('Could not get location.')
        setIsRefreshingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [lastSearchText, runSearch])

  // Init Google Places services when script is loaded
  useEffect(() => {
    if (!isMapsLoaded || mapsLoadError || !window.google?.maps?.places) return
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
    } catch {
      // ignore
    }
  }, [isMapsLoaded, mapsLoadError])

  useEffect(() => {
    if (!isMapsLoaded || mapsLoadError || !window.google?.maps?.places || !mapDivRef.current) return
    if (!placesServiceRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
    }
  }, [isMapsLoaded, mapsLoadError, mapDivReady])

  const fetchPlacePredictions = useCallback((input: string) => {
    const service = autocompleteServiceRef.current
    if (!service || !input.trim()) {
      setPlacePredictions([])
      setPlaceDropdownOpen(false)
      return
    }
    setPlaceLoading(true)
    const request: google.maps.places.AutocompletionRequest = {
      input: input.trim(),
      language: 'ko',
    }
    service.getPlacePredictions(request, (results, status) => {
      setPlaceLoading(false)
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
        setPlacePredictions(results)
        setPlaceDropdownOpen(true)
      } else {
        setPlacePredictions([])
      }
    })
  }, [])

  const debouncedFetchPlacePredictions = useCallback((input: string) => {
    if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current)
    placeDebounceRef.current = setTimeout(() => {
      placeDebounceRef.current = null
      fetchPlacePredictions(input)
    }, PLACE_DEBOUNCE_MS)
  }, [fetchPlacePredictions])

  const handlePlaceInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setPlaceSearchValue(v)
    if (!v.trim()) {
      setPlacePredictions([])
      setPlaceDropdownOpen(false)
      return
    }
    debouncedFetchPlacePredictions(v)
  }, [debouncedFetchPlacePredictions])

  const handlePlaceSelect = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      const places = placesServiceRef.current
      setPlaceDropdownOpen(false)
      setPlacePredictions([])
      setPlaceSearchValue(prediction.description)
      if (!places) return
      places.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'formatted_address', 'name'],
        },
        (place, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return
          const loc = place.geometry?.location as
            | { lat: number; lng: number }
            | { lat: () => number; lng: () => number }
          if (!loc) return
          const lat: number =
            typeof (loc as { lat: unknown }).lat === 'function'
              ? (loc as { lat: () => number }).lat()
              : (loc as { lat: number }).lat
          const lng: number =
            typeof (loc as { lng: unknown }).lng === 'function'
              ? (loc as { lng: () => number }).lng()
              : (loc as { lng: number }).lng
          const displayName = (place.formatted_address || place.name || prediction.description) ?? ''
          setLocation({ lat, lng })
          setIsManualLocation(true)
          setSelectedRegionName(displayName)
          setCurrentAddress(displayName)
          setLocationStatus('ok')
          if (lastSearchText) runSearch(lastSearchText, { lat, lng, regionName: displayName })
        }
      )
    },
    [lastSearchText, runSearch]
  )

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (placeContainerRef.current && !placeContainerRef.current.contains(e.target as Node)) {
        setPlaceDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    return () => {
      if (placeDebounceRef.current) clearTimeout(placeDebounceRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-10 sm:py-14 px-4 sm:px-6 font-serif antialiased bg-gray-50">
      <div className="relative z-10 w-full max-w-screen-xl flex flex-col items-center">
        {/* Logo — 헤더와 동일한 보라색 PUMWI 로고 */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo2.png"
            alt="PUMWI"
            width={220}
            height={74}
            className="h-auto w-[200px] sm:w-[230px] object-contain"
            priority
            sizes="(max-width: 640px) 200px, 230px"
          />
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl text-center font-normal text-gray-900 mb-10 max-w-3xl leading-tight tracking-tight break-keep">
          {tConcierge('hero_headline')}
        </h1>

        {/* PUMWI Selection — 밝은 배경용 카드 */}
        <section className="w-full mb-10" aria-labelledby="selection-heading">
          <h2 id="selection-heading" className="flex items-center gap-2 text-sm font-medium text-gray-600 mb-4 px-1">
            <span aria-hidden>🏅</span>
            {tConcierge('section_selection_title')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {MOCK_SELECTION.map((artist) => (
              <Link
                key={artist.id}
                href={`/artist/${artist.id}`}
                className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-md hover:shadow-lg transition-shadow block"
              >
                <div className="h-32 bg-gray-50 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#8E86F5]/50" aria-hidden />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 tracking-tight">{artist.name}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">{artist.role}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{artist.studio}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Search bar — 흰 배경, 그림자, 보라 버튼 */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 flex items-center bg-white rounded-lg shadow-md border border-gray-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tConcierge('search_placeholder_artists')}
              className="w-full pl-4 pr-12 py-3 rounded-lg bg-transparent border-0 text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-0 text-sm"
              disabled={loading}
            />
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              disabled={loading}
              className="absolute right-2 flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:text-[#8E86F5] hover:bg-gray-100 transition-colors disabled:opacity-50"
              style={{ color: recording ? '#ef4444' : undefined }}
              aria-label={recording ? 'Stop recording' : 'Voice search'}
            >
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNearbyDrawer(true)}
              className="px-4 py-3 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-[#8E86F5]/50 hover:text-[#8E86F5] transition-colors shadow-sm flex items-center gap-1.5 group"
            >
              <MapPin className="w-4 h-4 flex-shrink-0 text-gray-500 group-hover:text-[#8E86F5]" aria-hidden />
              {tConcierge('nearby_artists_btn')}
            </button>
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 rounded-lg text-sm font-medium text-white bg-[#8E86F5] hover:opacity-95 transition-opacity min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {tConcierge('search_submit')}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex justify-center py-2">
            <Loader2 className="w-6 h-6 text-[#8E86F5] animate-spin" />
          </div>
        )}

        {/* 하단 — 선정 기준 보기만 (아티스트 신청 버튼 영구 제거) */}
        <div className="mt-auto pt-14 pb-2 flex justify-center">
          <Link
            href="/criteria"
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-[#8E86F5]/50 hover:text-[#8E86F5] transition-colors shadow-sm"
          >
            {tConcierge('view_criteria_link')}
          </Link>
        </div>
      </div>

      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <NearbyArtistsDrawer open={showNearbyDrawer} onClose={() => setShowNearbyDrawer(false)} />
    </div>
  )
}
