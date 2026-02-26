'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { useJsApiLoader } from '@react-google-maps/api'

export interface CheckoutAddressResult {
  street_address: string
  city: string
  state: string
  postcode: string
  country_code: string
}

interface CheckoutAddressAutocompleteProps {
  value: string
  onSelect: (result: CheckoutAddressResult) => void
  placeholder?: string
  label?: string
  inputClassName?: string
}

const DEBOUNCE_MS = 300

export default function CheckoutAddressAutocomplete({
  value,
  onSelect,
  placeholder = 'Start typing street address...',
  label,
  inputClassName = '',
}: CheckoutAddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapDivRef = useRef<HTMLDivElement>(null)
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [inputValue, setInputValue] = useState(value)
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
    libraries: ['places'],
  })

  useEffect(() => setInputValue(value), [value])

  useEffect(() => {
    if (!isLoaded || loadError || !window.google?.maps?.places) return
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService()
    if (mapDivRef.current) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivRef.current)
    }
  }, [isLoaded, loadError])

  const fetchPredictions = useCallback((input: string) => {
    if (!autocompleteServiceRef.current || !input.trim()) {
      setPredictions([])
      setOpen(false)
      return
    }
    setLoading(true)
    autocompleteServiceRef.current.getPlacePredictions(
      { input: input.trim(), types: ['address'] },
      (results, status) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.length) {
          setPredictions(results)
          setOpen(true)
        } else {
          setPredictions([])
        }
      }
    )
  }, [])

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setInputValue(v)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!v.trim()) {
        setPredictions([])
        setOpen(false)
        return
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null
        fetchPredictions(v)
      }, DEBOUNCE_MS)
    },
    [fetchPredictions]
  )

  const handleSelect = useCallback(
    (prediction: google.maps.places.AutocompletePrediction) => {
      const places = placesServiceRef.current
      if (!places) {
        setInputValue(prediction.description)
        setOpen(false)
        setPredictions([])
        return
      }
      places.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['address_components', 'formatted_address'],
        },
        (place, status) => {
          setOpen(false)
          setPredictions([])
          setInputValue(prediction.description)
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.address_components) return
          const comp = place.address_components
          const get = (type: string) => comp.find((c) => c.types.includes(type))?.long_name || ''
          const getShort = (type: string) => comp.find((c) => c.types.includes(type))?.short_name || ''
          const streetNumber = get('street_number')
          const route = get('route')
          const street_address = [streetNumber, route].filter(Boolean).join(' ') || prediction.description
          const city = get('locality') || get('administrative_area_level_2')
          const state = get('administrative_area_level_1')
          const postcode = get('postal_code')
          const country_code = getShort('country') || ''
          onSelect({
            street_address: street_address.trim(),
            city: city.trim(),
            state: state.trim(),
            postcode: postcode.trim(),
            country_code: country_code.toUpperCase(),
          })
        }
      )
    },
    [onSelect]
  )

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  if (!apiKey) {
    return (
      <div>
        {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={inputClassName || 'w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900'}
        />
      </div>
    )
  }

  if (loadError || !isLoaded) {
    return (
      <div>
        {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={!isLoaded}
          className={inputClassName || 'w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900'}
        />
      </div>
    )
  }

  const inputCls = inputClassName || 'w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none'

  return (
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>}
      <div ref={mapDivRef} className="absolute -left-[9999px] w-px h-px" aria-hidden />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={onInputChange}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={inputCls}
      />
      {open && predictions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-[9999] mt-0 max-h-60 overflow-auto rounded-b-lg border border-t-0 border-gray-200 bg-white shadow-lg list-none p-0 m-0">
          {predictions.map((p) => (
            <li
              key={p.place_id}
              className="px-3 py-2.5 text-sm text-slate-900 cursor-pointer hover:bg-slate-50 border-b border-gray-100 last:border-b-0"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
            >
              {p.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
