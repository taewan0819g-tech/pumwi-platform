'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import LocationPlacesAutocomplete, { type LocationPlaceResult } from '@/components/profile/LocationPlacesAutocomplete'

interface ProfileEditProps {
  profileId: string
  initialCity?: string | null
  initialCountry?: string | null
  initialLat?: number | null
  initialLng?: number | null
  onSuccess?: (data: { city: string | null; country: string | null; lat: number | null; lng: number | null }) => void
  onCancel?: () => void
}

export default function ProfileEdit({
  profileId,
  initialCity = '',
  initialCountry = '',
  initialLat = null,
  initialLng = null,
  onSuccess,
  onCancel,
}: ProfileEditProps) {
  const t = useTranslations('apply')
  const [city, setCity] = useState(initialCity ?? '')
  const [country, setCountry] = useState(initialCountry ?? '')
  const [lat, setLat] = useState<number | null>(initialLat ?? null)
  const [lng, setLng] = useState<number | null>(initialLng ?? null)
  const [saving, setSaving] = useState(false)

  const handlePlaceSelect = (result: LocationPlaceResult) => {
    setCity(result.city)
    setCountry(result.country)
    setLat(result.lat)
    setLng(result.lng)
  }

  const handleSave = async () => {
    const cityTrim = city.trim() || null
    const countryTrim = country.trim() || null
    if (!cityTrim) {
      toast.error('Please enter or select an address.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    try {
      const payload: Record<string, unknown> = {
        city: cityTrim,
        country: countryTrim || null,
      }
      if (lat != null && lng != null) {
        payload.lat = lat
        payload.lng = lng
      }
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profileId)
      if (error) throw error
      toast.success('Saved!')
      onSuccess?.({
        city: cityTrim,
        country: countryTrim || null,
        lat,
        lng,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (
        message.includes('lat') ||
        message.includes('lng') ||
        message.includes('column') ||
        message.includes('does not exist')
      ) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .update({ city: cityTrim, country: countryTrim || null })
          .eq('id', profileId)
        if (fallbackError) {
          console.error('[ProfileEdit] fallback update', fallbackError)
          toast.error(fallbackError.message)
        } else {
          toast.success('Address saved (coordinates not stored).')
          onSuccess?.({
            city: cityTrim,
            country: countryTrim || null,
            lat: null,
            lng: null,
          })
        }
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50/50 w-full max-w-sm">
      <LocationPlacesAutocomplete
        value={city}
        onChange={handlePlaceSelect}
        placeholder={t('city_placeholder')}
        label={t('location_search_label')}
      />
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{t('city_label')}</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={t('city_placeholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] outline-none bg-white"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 rounded-lg bg-[#8E86F5] text-white hover:opacity-90 disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="h-4 w-4" />
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
