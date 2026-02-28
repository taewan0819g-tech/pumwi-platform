'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Mic, MicOff, Loader2, Sparkles, ExternalLink, RefreshCw, MapPin, Search } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { useJsApiLoader } from '@react-google-maps/api'
import type { ExperiencePlace } from '@/app/api/ai/concierge/places/route'
import type { Workshop } from '@/app/api/ai/concierge/workshops/route'

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

const PROMPT = '어떤 공방 체험을 찾고 계신가요? (예: 도자기, 원데이클래스, 데이트하기 좋은 분위기)'
const PURPLE = '#8E86F5'
const PURPLE_GLOW = '0 0 32px rgba(142, 134, 245, 0.35)'
const PURPLE_GLOW_STRONG = '0 0 48px rgba(142, 134, 245, 0.45)'

const PLACE_DEBOUNCE_MS = 300

function formatDistance(distMeters: number | null | undefined): string {
  if (distMeters == null || !Number.isFinite(distMeters)) return '—'
  if (distMeters < 1000) return `${Math.round(distMeters)} m`
  return `${(distMeters / 1000).toFixed(1)} km`
}

export default function AIConciergeClient() {
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
          if (text) {
            setInput(text)
            await runSearch(text)
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
  }, [runSearch])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }
    setRecording(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    runSearch(input)
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
    <div
      className="min-h-[70vh] flex flex-col items-center py-10 px-4"
      style={{ background: '#FAFAFA' }}
    >
      {/* Logo — 최상단 중앙 */}
      <div className="flex justify-center mb-6">
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

      {/* 문구 — 가독성 높고 우아한 폰트 */}
      <h1 className="text-xl sm:text-2xl font-serif text-center text-slate-700 mb-8 max-w-lg leading-relaxed tracking-tight">
        {PROMPT}
      </h1>

      {/* 위치 상태 인디케이터 + 새로고침 + 지역 선택 */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-600 mb-2 min-h-[24px]">
        {(locationStatus === 'getting' || isRefreshingLocation) && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-slate-400 border-t-transparent animate-spin" />
            Finding location...
          </span>
        )}
        {!isRefreshingLocation && locationStatus === 'ok' && currentAddress && (
          <span className="flex items-center gap-1.5 text-[#8E86F5] font-medium max-w-[min(100%,24rem)] truncate" title={currentAddress}>
            📍 현재 위치: {currentAddress}
          </span>
        )}
        {!isRefreshingLocation && locationStatus === 'ok' && !currentAddress && isManualLocation && selectedRegionName && (
          <span className="flex items-center gap-1.5 text-[#8E86F5] font-medium">
            📍 Searching: {selectedRegionName}
          </span>
        )}
        {!isRefreshingLocation && locationStatus === 'ok' && !currentAddress && !isManualLocation && (
          <span className="flex items-center gap-1.5 text-[#8E86F5] font-medium">
            📍 Current Location Active
          </span>
        )}
        {!isRefreshingLocation && locationStatus === 'denied' && !isManualLocation && (
          <span className="flex items-center gap-1.5 text-slate-500">
            📍 위치 권한을 허용해 주세요
          </span>
        )}
        <button
          type="button"
          onClick={handleRefreshLocation}
          disabled={isRefreshingLocation}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#8E86F5] hover:bg-[#8E86F5]/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="위치 새로고침"
          title="위치 새로고침"
        >
          <RefreshCw
            className={`w-4 h-4 ${isRefreshingLocation ? 'animate-spin' : ''}`}
            style={isRefreshingLocation ? { color: 'var(--tw-color-purple, #8E86F5)' } : undefined}
          />
        </button>
        <div ref={placeContainerRef} className="relative">
          {/* Hidden div required by Google PlacesService */}
          <div ref={setMapDivRef} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
          {apiKey && isMapsLoaded && !mapsLoadError ? (
            <>
              <div className="relative inline-block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={placeSearchValue}
                  onChange={handlePlaceInputChange}
                  onFocus={() => placePredictions.length > 0 && setPlaceDropdownOpen(true)}
                  placeholder="지역 또는 공방 검색"
                  autoComplete="off"
                  className="pl-8 pr-3 py-1.5 w-48 sm:w-56 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#8E86F5] focus:ring-1 focus:ring-[#8E86F5] transition-colors"
                  aria-autocomplete="list"
                  aria-expanded={placeDropdownOpen}
                  aria-haspopup="listbox"
                  role="combobox"
                />
              </div>
              {placeDropdownOpen && (placePredictions.length > 0 || placeSearchValue.trim()) && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setPlaceDropdownOpen(false)}
                  />
                  <ul
                    className="absolute left-0 top-full mt-1 py-1 w-64 rounded-lg bg-white border border-slate-200 shadow-lg z-20 max-h-60 overflow-auto"
                    role="listbox"
                  >
                    {placeLoading ? (
                      <li className="px-3 py-2 text-sm text-slate-500">검색 중...</li>
                    ) : placePredictions.length > 0 ? (
                      placePredictions.map((p) => (
                        <li key={p.place_id}>
                          <button
                            type="button"
                            role="option"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handlePlaceSelect(p)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-[#8E86F5]/10 hover:text-[#8E86F5]"
                          >
                            {p.description}
                          </button>
                        </li>
                      ))
                    ) : placeSearchValue.trim() ? (
                      <li className="px-3 py-2 text-sm text-slate-500">검색 결과가 없습니다.</li>
                    ) : null}
                  </ul>
                </>
              )}
            </>
          ) : (
            <span className="text-xs text-slate-500">지역 검색을 사용하려면 NEXT_PUBLIC_GOOGLE_MAPS_API_KEY를 설정하세요.</span>
          )}
        </div>
      </div>

      {/* 마이크 버튼 — 대기 시 Glow, 녹음 시 Ripple */}
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative flex items-center justify-center">
          {/* Ripple rings (녹음 중일 때만) */}
          {recording && (
            <>
              <span className="absolute rounded-full border-2 border-[#8E86F5]/50 animate-concierge-ripple" style={{ width: 88, height: 88, animationDelay: '0s' }} />
              <span className="absolute rounded-full border-2 border-[#8E86F5]/40 animate-concierge-ripple" style={{ width: 88, height: 88, animationDelay: '0.4s' }} />
              <span className="absolute rounded-full border-2 border-[#8E86F5]/30 animate-concierge-ripple" style={{ width: 88, height: 88, animationDelay: '0.8s' }} />
            </>
          )}
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            disabled={loading}
            className="relative z-10 flex-shrink-0 w-20 h-20 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            style={{
              backgroundColor: recording ? '#b91c1c' : PURPLE,
              boxShadow: loading ? 'none' : recording ? PURPLE_GLOW_STRONG : PURPLE_GLOW,
            }}
            aria-label={recording ? 'Stop recording' : 'Start voice input'}
          >
            {recording ? <MicOff className="w-9 h-9" /> : <Mic className="w-9 h-9" />}
          </button>
        </div>

        {loading && (
          <Loader2 className="w-8 h-8 text-[#8E86F5] animate-spin" />
        )}

        {/* 텍스트 입력 (보조) */}
        <form onSubmit={handleSubmit} className="w-full max-w-md flex flex-col items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="예: 도자기 공방, 원데이 클래스, 데이트하기 좋은 분위기"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#8E86F5]/40 focus:border-[#8E86F5] text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2 rounded-xl font-medium text-white bg-[#8E86F5] hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Search experiences
          </button>
        </form>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 max-w-md text-center">{error}</p>
      )}

      {conciergeMessage && (
        <div className="w-full max-w-2xl mt-10 px-4 py-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <p className="text-slate-700 leading-relaxed font-serif text-center">
            {conciergeMessage}
          </p>
        </div>
      )}

      {/* When we have places, always show Top 5 section (even if AI message is question-like) */}
      {places.length > 0 && (
        <div className="w-full max-w-4xl mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-800 mb-4">
            <Sparkles className="w-5 h-5 text-[#8E86F5]" aria-hidden />
            추천 공방 Top 5
          </h2>
          {workshopOnlyMessage && (
            <p className="text-sm text-slate-600 mb-4 font-serif rounded-lg bg-[#8E86F5]/5 border border-[#8E86F5]/20 px-4 py-2">
              저희는 공방 전문 서비스예요. 대신 이런 예술적인 분위기의 공방은 어떠신가요?
            </p>
          )}
          {noExactMatch && !workshopOnlyMessage && (
            <p className="text-sm text-slate-600 mb-4 font-serif">
              근처에는 없지만, 대표님의 취향에 딱 맞는 대한민국 최고의 공방들을 전국에서 엄선해 왔어요!
            </p>
          )}
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {places.map((place) => {
              const mapsQuery = [place.name, (place as PlaceCard).address_en].filter(Boolean).join(' ').trim() || place.name
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
              const verified = place.is_pumwi_verified === true

              return verified ? (
                <div
                  key={place.id}
                  className="flex-shrink-0 w-72 snap-start rounded-xl bg-white overflow-hidden border-2 transition-colors hover:shadow-lg"
                  style={{ borderColor: PURPLE, boxShadow: '0 0 0 1px rgba(142, 134, 245, 0.2)' }}
                >
                  <div className="relative h-36 bg-slate-100 flex items-center justify-center overflow-hidden">
                    {place.image_url ? (
                      <img src={place.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Sparkles className="w-10 h-10 text-[#8E86F5]/50" aria-hidden />
                        <span className="text-xs font-medium">PUMWI 공방</span>
                      </div>
                    )}
                    {/* Pumwi Verified 뱃지 제거 */}
                    {/* <span className="absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-semibold text-white bg-[#8E86F5] shadow-md flex items-center gap-1 animate-pulse">
                      PUMWI Verified ✦
                    </span> */}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      {/* DB-original name only; AI does not modify or translate */}
                      <h3 className="font-medium text-slate-900 truncate flex-1">{place.name}</h3>
                      <span className="flex-shrink-0 text-xs font-medium text-slate-600 bg-[#8E86F5]/10 text-[#8E86F5] px-2 py-0.5 rounded">
                        {formatDistance(place.dist_meters)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 mt-1">
                      {place.description ?? '—'}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 text-center py-2 text-sm font-medium rounded-lg border-2 border-[#8E86F5] text-[#8E86F5] hover:bg-[#8E86F5]/10 transition-colors inline-flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on Google Maps
                      </a>
                      <Link
                        href="/login"
                        className="flex-1 text-center py-2 text-sm font-medium rounded-lg text-white bg-[#8E86F5] hover:opacity-95 transition-opacity"
                      >
                        예약
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key={place.id}
                  className="flex-shrink-0 w-72 snap-start rounded-xl overflow-hidden border border-slate-200 bg-slate-50 grayscale hover:grayscale-[0.7] transition-all"
                >
                  <div className="h-28 bg-slate-200 flex items-center justify-center overflow-hidden">
                    {place.image_url ? (
                      <img src={place.image_url} alt="" className="w-full h-full object-cover opacity-80" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1 text-slate-500">
                        <MapPin className="w-8 h-8 text-slate-400" aria-hidden />
                        <span className="text-[10px] font-medium">Nearby workshop</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      {/* DB-original name only; AI does not modify or translate */}
                      <h3 className="font-medium text-slate-600 truncate text-sm flex-1">{place.name}</h3>
                      <span className="flex-shrink-0 text-[10px] font-medium text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded">
                        {formatDistance(place.dist_meters)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                      {place.description ?? 'Nearby workshop'}
                    </p>
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on Google Maps
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-auto pt-12">
        <Link
          href="/gallery"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg font-medium text-slate-700 bg-transparent border-2 border-slate-200 hover:border-[#8E86F5]/50 hover:text-[#8E86F5] transition-colors underline decoration-[#8E86F5] decoration-2 underline-offset-4"
        >
          Go to PUMWI Gallery
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes conciergeRipple {
            0% { transform: scale(0.6); opacity: 0.6; }
            100% { transform: scale(1.8); opacity: 0; }
          }
          .animate-concierge-ripple {
            animation: conciergeRipple 1.6s ease-out infinite;
            pointer-events: none;
          }
        `,
      }} />
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
    </div>
  )
}
