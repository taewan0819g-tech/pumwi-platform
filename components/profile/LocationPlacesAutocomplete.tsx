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

declare global {
  interface Window {
    google?: typeof google
  }
}

type Place = {
  fetchFields: (opts: { fields: string[] }) => Promise<void>
  location?: { lat: () => number; lng: () => number } | { lat: number; lng: number }
  formattedAddress?: string
  displayName?: string
  addressComponents?: Array<{ longText?: string; shortText?: string; types: string[] }>
}

type PlacePrediction = { toPlace: () => Promise<Place> }

type GmpSelectDetail = { place?: Place; placePrediction?: PlacePrediction }
type GmpSelectEvent = CustomEvent<GmpSelectDetail> & { placePrediction?: PlacePrediction; place?: Place }

export default function LocationPlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Search address...',
  label,
  className = '',
  inputClassName = '',
  language,
}: LocationPlacesAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const elementRef = useRef<HTMLElement | null>(null)
  const handlerRef = useRef<((e: Event) => void) | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded, loadError: loaderError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  })

  const deliverResult = useCallback((result: LocationPlaceResult) => {
    onChangeRef.current(result)
  }, [])

  useEffect(() => {
    if (!isLoaded || loaderError || !window.google?.maps) return
    let cancelled = false
    ;(async () => {
      try {
        const lib = await window.google!.maps.importLibrary('places')
        const PlaceAutocompleteElement = (lib as { PlaceAutocompleteElement?: new (opts?: Record<string, unknown>) => HTMLElement }).PlaceAutocompleteElement
        if (cancelled) return
        if (typeof PlaceAutocompleteElement !== 'function') {
          setLoadError('PlaceAutocompleteElement not available')
          return
        }
        setReady(true)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Places library failed to load')
      }
    })()
    return () => { cancelled = true }
  }, [isLoaded, loaderError])

  useEffect(() => {
    if (!ready || !containerRef.current || !window.google?.maps) return
    const container = containerRef.current
    let cancelled = false
    ;(async () => {
      try {
        const lib = await window.google.maps.importLibrary('places')
        const PlaceAutocompleteElement = (lib as { PlaceAutocompleteElement?: new (opts?: Record<string, unknown>) => HTMLElement }).PlaceAutocompleteElement
        if (cancelled || !PlaceAutocompleteElement || !containerRef.current) return
        const el = new PlaceAutocompleteElement({
          placeholder: placeholder ?? 'Search address...',
          requestedLanguage: language ?? 'en',
        }) as HTMLElement
        elementRef.current = el
        el.setAttribute('placeholder', placeholder ?? 'Search address...')
        container.innerHTML = ''
        container.appendChild(el)

        const handler: (e: Event) => void = async (e: Event) => {
          const ev = e as GmpSelectEvent
          const placePrediction = ev.placePrediction ?? (ev as { detail?: { placePrediction?: PlacePrediction } }).detail?.placePrediction
          const placeObj = (ev as { place?: Place }).place
          if (!placePrediction && !placeObj) return
          try {
            const place: Place = placeObj ?? await placePrediction!.toPlace()
            await place.fetchFields({
              fields: ['location', 'formattedAddress', 'displayName', 'addressComponents'],
            })
            const loc = place.location
            if (!loc) return
            const lat = typeof (loc as { lat: number }).lat === 'number' ? (loc as { lat: number }).lat : (loc as { lat: () => number }).lat()
            const lng = typeof (loc as { lng: number }).lng === 'number' ? (loc as { lng: number }).lng : (loc as { lng: () => number }).lng()
            const components = place.addressComponents ?? []
            let country = ''
            let city = (place.formattedAddress ?? place.displayName ?? '') as string
            for (const c of components) {
              if (c.types?.includes('country')) {
                country = (c.shortText ?? c.longText ?? '') as string
                break
              }
            }
            const locality = components.find((c) => c.types?.includes('locality'))
            const admin1 = components.find((c) => c.types?.includes('administrative_area_level_1'))
            const localityStr = (locality?.longText ?? locality?.shortText) as string | undefined
            const admin1Str = (admin1?.longText ?? admin1?.shortText) as string | undefined
            if (localityStr) city = [localityStr, admin1Str].filter(Boolean).join(', ')
            else if (!city) city = (place.displayName as string) ?? ''
            deliverResult({ city: city.trim(), country, lat, lng })
          } catch (_) {}
        }
        handlerRef.current = handler
        el.addEventListener('gmp-select', handler)
      } catch (_) {}
    })()
    return () => {
      cancelled = true
      const el = elementRef.current
      const handler = handlerRef.current
      if (el && container.contains(el) && handler) {
        el.removeEventListener('gmp-select', handler)
        container.removeChild(el)
      }
      elementRef.current = null
      handlerRef.current = null
    }
  }, [ready, placeholder, language, deliverResult])

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
  }, [])

  if (!apiKey) {
    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
        <p className="text-sm text-amber-600">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for address search.</p>
      </div>
    )
  }

  if (loaderError || loadError) {
    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
        <p className="text-sm text-amber-600">{loadError || 'Maps failed to load. Check API key.'}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
        <input
          type="text"
          defaultValue={value}
          placeholder={placeholder}
          disabled
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 bg-gray-100 ${inputClassName}`}
        />
        <p className="mt-1 text-xs text-gray-500">Loading maps...</p>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
        <input
          type="text"
          defaultValue={value}
          placeholder={placeholder}
          disabled
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 bg-gray-100 ${inputClassName}`}
        />
        <p className="mt-1 text-xs text-gray-500">Loading Places...</p>
      </div>
    )
  }

  return (
    <div
      className={className}
      onMouseDown={stopPropagation}
      onClick={stopPropagation}
      role="presentation"
      style={{ position: 'relative', zIndex: 1, pointerEvents: 'auto' }}
    >
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <div
        ref={containerRef}
        className={inputClassName}
        style={{
          position: 'relative',
          zIndex: 1,
          pointerEvents: 'auto',
          minHeight: 42,
        }}
      />
      <style jsx>{`
        div :global(gmp-place-autocomplete),
        div :global(.gmp-place-autocomplete) {
          display: block !important;
          width: 100% !important;
          min-height: 42px;
          pointer-events: auto !important;
          z-index: 1;
        }
        div :global(gmp-place-autocomplete)::part(input) {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          color: #0f172a;
          background: white;
          pointer-events: auto;
        }
        div :global(gmp-place-autocomplete)::part(input):focus {
          outline: none;
          box-shadow: 0 0 0 2px #8E86F5;
          border-color: #8E86F5;
        }
      `}</style>
    </div>
  )
}
