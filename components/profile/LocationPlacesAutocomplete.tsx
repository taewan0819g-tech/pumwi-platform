'use client'

import { useRef, useEffect, useCallback } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

const LIBRARIES: ('places')[] = ['places']

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

export default function LocationPlacesAutocomplete({
  value,
  onChange,
  placeholder = 'Search address...',
  label,
  className = '',
  inputClassName = '',
  language,
}: LocationPlacesAutocompleteProps) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: language ?? 'en',
  })

  const onPlaceSelect = useCallback(() => {
    const autocomplete = autocompleteRef.current
    if (!autocomplete) return
    const place = autocomplete.getPlace()
    if (!place?.geometry?.location) return

    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()
    let city = place.formatted_address ?? ''
    let country = ''

    const components = place.address_components ?? []
    for (const c of components) {
      if (c.types.includes('country')) {
        country = c.short_name ?? c.long_name ?? ''
        break
      }
    }
    const locality = components.find((c) => c.types.includes('locality'))?.long_name
    const admin1 = components.find((c) => c.types.includes('administrative_area_level_1'))?.long_name
    if (locality) city = [locality, admin1].filter(Boolean).join(', ')
    else if (!city) city = place.name ?? ''

    onChangeRef.current({ city: city.trim() || (place.formatted_address ?? ''), country, lat, lng })
  }, [])

  useEffect(() => {
    if (!isLoaded || loadError || !inputRef.current) return
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'geometry', 'name', 'address_components'],
    })
    autocomplete.addListener('place_changed', onPlaceSelect)
    autocompleteRef.current = autocomplete
    return () => {
      google.maps.event.clearInstanceListeners(autocomplete)
      autocompleteRef.current = null
    }
  }, [isLoaded, loadError, onPlaceSelect])

  if (!apiKey) {
    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
        <p className="text-sm text-amber-600">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY for address search.</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={className}>
        {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
        <p className="text-sm text-amber-600">Maps failed to load. Check API key.</p>
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

  return (
    <div className={className}>
      {label && <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>}
      <input
        ref={inputRef}
        type="text"
        defaultValue={value}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none bg-white ${inputClassName}`}
        aria-label={label ?? placeholder}
      />
    </div>
  )
}
