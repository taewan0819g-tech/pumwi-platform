'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import toast from 'react-hot-toast'
import LocationPlacesAutocomplete, { type LocationPlaceResult } from '@/components/profile/LocationPlacesAutocomplete'

interface CollectorApplyModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

function mapCountryCode(code: string): string {
  const upper = code.toUpperCase()
  const map: Record<string, string> = {
    KR: 'kr',
    JP: 'jp',
    US: 'usa',
    FR: 'france',
    GB: 'uk',
    DE: 'germany',
  }
  return map[upper] ?? 'other'
}

export default function CollectorApplyModal({
  open,
  onClose,
  onSuccess,
}: CollectorApplyModalProps) {
  const t = useTranslations('collector_application')
  const locale = useLocale()
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [collectorBio, setCollectorBio] = useState('')
  const [isAgreed, setIsAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()
  const mapLanguage = locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'en'

  const handleLocationSelect = (result: LocationPlaceResult) => {
    const mapped = mapCountryCode(result.country)
    setCity(result.city)
    setCountry(mapped === 'other' ? result.country : mapped)
  }

  const handleSubmit = async () => {
    if (!city.trim()) {
      toast.error(t('error.address_required'))
      return
    }
    if (!collectorBio.trim()) {
      toast.error(t('error.bio_required'))
      return
    }
    if (!isAgreed) {
      toast.error(t('error.agree_required'))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Sign in required.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        role: 'pending_collector',
        collector_bio: collectorBio.trim(),
        city: city.trim(),
        country: country.trim(),
      })
      .eq('id', user.id)

    setSubmitting(false)
    if (error) {
      console.error('[CollectorApply]', error)
      toast.error(t('error.submit_failed'))
      return
    }

    toast.success(t('success_pending'))
    setCity('')
    setCountry('')
    setCollectorBio('')
    setIsAgreed(false)
    onSuccess()
    onClose()
  }

  const isValid = city.trim() && collectorBio.trim() && isAgreed && !submitting

  return (
    <Dialog open={open} onClose={onClose} title={t('title')}>
      <div className="p-4 space-y-5">
        {/* Step 1: Address */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('step1_title')}</h3>
          <p className="text-xs text-gray-500 mb-2">{t('step1_hint')}</p>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('address_label')}</label>
          <LocationPlacesAutocomplete
            value=""
            onChange={handleLocationSelect}
            placeholder={t('address_placeholder')}
            language={mapLanguage}
            className="w-full"
            inputClassName="w-full"
          />
          {city && (
            <p className="mt-1 text-xs text-gray-600">
              {city}{country ? `, ${country}` : ''}
            </p>
          )}
        </div>

        {/* Step 2: Collector bio */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('step2_title')}</h3>
          <label className="block text-xs font-medium text-gray-600 mb-1">{t('collector_bio_label')}</label>
          <textarea
            value={collectorBio}
            onChange={(e) => setCollectorBio(e.target.value)}
            placeholder={t('collector_bio_placeholder')}
            rows={4}
            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm resize-none"
          />
        </div>

        {/* Step 3: Community guide */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('step3_title')}</h3>
          <p className="text-xs text-gray-600 mb-2 whitespace-pre-wrap">{t('guide_agree_text')}</p>
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAgreed}
              onChange={(e) => setIsAgreed(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-[#8E86F5] focus:ring-[#8E86F5]"
            />
            <span className="text-sm text-gray-700">{t('guide_agree_label')}</span>
          </label>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1 py-2.5 px-4 text-sm font-medium text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#8E86F5' }}
          >
            {submitting ? t('submit_loading') : t('submit')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
