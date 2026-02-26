'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

/** 프로필 기본 주소 + Shippo용 구조화 데이터 */
export interface FullAddressResult {
  /** Google formatted_address (지도·프로필 지역명용) */
  address_main: string
  /** Shippo street1: street_number + route */
  street1: string
  city: string
  state: string
  zip: string
  country: string
  lat: number | null
  lng: number | null
}

interface AddressMainAutocompleteProps {
  value: string
  onChange: (result: FullAddressResult) => void
  placeholder?: string
  label?: string
  className?: string
  inputClassName?: string
  language?: string
}

const DEBOUNCE_MS = 300

function getComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string
): string {
  const c = components.find((x) => x.types.includes(type))
  return c?.long_name?.trim() || c?.short_name?.trim() || ''
}

export default function AddressMainAutocomplete({
  value,
  onChange,
  placeholder = '주소 검색 (Google)',
  label,
  className = '',
  inputClassName = '',
  language = 'ko',
}: AddressMainAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded, loadError: loaderError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
    libraries: ['places'],
  })

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (!isLoaded || loaderError || !window.google?.maps?.places) return
    try {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
      if (mapDivRef.current) {
        placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Places service init failed')
    }
  }, [isLoaded, loaderError])

  useEffect(() => {
    if (!isLoaded || loaderError || !window.google?.maps?.places || !mapDivRef.current) return
    if (!placesServiceRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
    }
  }, [isLoaded, loaderError])

  const fetchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteServiceRef.current || !input.trim()) {
        setPredictions([])
        setDropdownOpen(false)
        return
      }
      setLoading(true)
      const request: google.maps.places.AutocompletionRequest = {
        input: input.trim(),
        language: language || 'ko',
      }
      autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          setPredictions(results)
        } else {
          setPredictions([])
        }
        setDropdownOpen(true)
      })
    },
    [language]
  )

  const debouncedFetch = useCallback(
    (input: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = null
        fetchPredictions(input)
      }, DEBOUNCE_MS)
    },
    [fetchPredictions]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setInputValue(v)
      if (!v.trim()) {
        setPredictions([])
        setDropdownOpen(false)
        return
      }
      debouncedFetch(v)
    },
    [debouncedFetch]
  )

  const handleSelectPrediction = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      const places = placesServiceRef.current
      if (!places) {
        setInputValue(prediction.description)
        setDropdownOpen(false)
        setPredictions([])
        return
      }
      places.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['geometry', 'address_components', 'formatted_address'],
        },
        (place, status) => {
          setDropdownOpen(false)
          setPredictions([])
          setInputValue(prediction.description)
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return
          const components = place.address_components || []
          const streetNumber = getComponent(components, 'street_number')
          const route = getComponent(components, 'route')
          const street1 = [streetNumber, route].filter(Boolean).join(' ') || place.formatted_address || ''
          const city =
            getComponent(components, 'locality') ||
            getComponent(components, 'sublocality') ||
            getComponent(components, 'administrative_area_level_2') ||
            ''
          const state = getComponent(components, 'administrative_area_level_1')
          const zip = getComponent(components, 'postal_code')
          const country = getComponent(components, 'country') || (components.find((c) => c.types.includes('country'))?.short_name ?? '')
          const loc = place.geometry?.location as
            | { lat: number; lng: number }
            | { lat: () => number; lng: () => number }
          let lat: number | null = null
          let lng: number | null = null
          if (loc) {
            lat = typeof (loc as { lat: unknown }).lat === 'function' ? (loc as { lat: () => number }).lat() : (loc as { lat: number }).lat
            lng = typeof (loc as { lng: unknown }).lng === 'function' ? (loc as { lng: () => number }).lng() : (loc as { lng: number }).lng
          }
          onChange({
            address_main: place.formatted_address || prediction.description,
            street1: street1.trim() || place.formatted_address?.trim() || prediction.description,
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
            country: country.trim().toUpperCase().slice(0, 2) || 'KR',
            lat,
            lng,
          })
        }
      )
    },
    [onChange]
  )

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  if (!apiKey) {
    return (
      <div className={className}>
        {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
        <p className="text-sm text-amber-600">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY를 설정해 주세요.</p>
      </div>
    )
  }

  if (loaderError || loadError) {
    return (
      <div className={className}>
        {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
        <p className="text-sm text-amber-600">{loadError || '지도 로드 실패'}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
        <input
          type="text"
          value={inputValue}
          placeholder={placeholder}
          disabled
          className={`w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 ${inputClassName}`}
        />
        <p className="mt-1 text-xs text-gray-500">지도 로딩 중...</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onMouseDown={stopPropagation}
      onClick={stopPropagation}
      style={{ position: 'relative' }}
    >
      <div ref={mapDivRef} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
      {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setDropdownOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={`w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none ${inputClassName}`}
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        role="combobox"
      />
      {loading && !dropdownOpen && <p className="mt-1 text-xs text-gray-500">검색 중...</p>}
      {dropdownOpen && predictions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full mt-0 z-[9999] max-h-60 overflow-auto rounded-b-xl border border-t-0 border-gray-300 bg-white shadow-lg list-none p-0 m-0"
          role="listbox"
          style={{ minWidth: '100%', isolation: 'isolate' }}
        >
          {predictions.map((p) => (
            <li
              key={p.place_id}
              role="option"
              className="px-4 py-3 text-sm text-slate-900 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelectPrediction(p)
              }}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
