'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

export interface LocationPlaceResult {
  city: string
  country: string
  lat: number
  lng: number
}

interface LocationPlacesAutocompleteProps {
  value: string
  onChange: (result: LocationPlaceResult) => void
  placeholder?: string
  label?: string
  className?: string
  inputClassName?: string
  /** Google Maps API language (e.g. 'ko', 'en', 'ja') for autocomplete results */
  language?: string
}

const DEBOUNCE_MS = 300

export default function LocationPlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Search address...',
  label,
  className = '',
  inputClassName = '',
  language = 'en',
}: LocationPlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
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

  // Sync controlled value into local state when parent updates (e.g. after submit clear)
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Init services when script is loaded
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

  // PlacesService needs a div attached to DOM; ensure we have it when ready
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
        language: language || 'en',
      }
      autocompleteServiceRef.current.getPlacePredictions(request, (results, status) => {
        setLoading(false)
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
          setPredictions([])
          return
        }
        setPredictions(results)
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
          const components = place.address_components || []
          let country = ''
          let city = place.formatted_address || ''
          for (const c of components) {
            if (c.types.includes('country')) {
              country = c.short_name || c.long_name || ''
              break
            }
          }
          const locality = components.find((c) => c.types.includes('locality'))
          const admin1 = components.find((c) => c.types.includes('administrative_area_level_1'))
          const localityStr = locality?.long_name || locality?.short_name
          const admin1Str = admin1?.long_name || admin1?.short_name
          if (localityStr) city = [localityStr, admin1Str].filter(Boolean).join(', ')
          onChange({ city: city.trim(), country, lat, lng })
        }
      )
    },
    [onChange]
  )

  // Click outside to close dropdown
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  if (!apiKey) {
    return (
      <div className={className}>
        {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
        <p className="text-sm text-amber-600">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for address search.</p>
      </div>
    )
  }

  if (loaderError || loadError) {
    return (
      <div className={className}>
        {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
        <p className="text-sm text-amber-600">{loadError || 'Maps failed to load. Check API key.'}</p>
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
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 bg-gray-100 ${inputClassName}`}
        />
        <p className="mt-1 text-xs text-gray-500">Loading maps...</p>
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
      {/* Hidden div required by PlacesService */}
      <div ref={mapDivRef} style={{ position: 'absolute', left: -9999, width: 1, height: 1 }} aria-hidden="true" />
      {label ? <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label> : null}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setDropdownOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
        aria-autocomplete="list"
        aria-expanded={dropdownOpen}
        aria-haspopup="listbox"
        role="combobox"
      />
      {loading && !dropdownOpen && (
        <p className="mt-1 text-xs text-gray-500">Searching...</p>
      )}
      {dropdownOpen && predictions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full mt-0 z-[100] max-h-60 overflow-auto rounded-b-xl border border-t-0 border-gray-300 bg-white shadow-lg list-none p-0 m-0"
          role="listbox"
          style={{ minWidth: '100%' }}
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
