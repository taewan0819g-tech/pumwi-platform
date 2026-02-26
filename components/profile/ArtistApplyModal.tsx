'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import LocationPlacesAutocomplete, { type LocationPlaceResult } from '@/components/profile/LocationPlacesAutocomplete'

const PORTFOLIO_MIN = 3
const PORTFOLIO_MAX = 10
const STORAGE_BUCKET_APPLICATIONS = 'applications'

/** Field keys and i18n keys for application_details (labels/placeholders from apply.*). Export for admin. */
export const APPLICATION_FIELD_CONFIG = [
  { key: 'primary_craft_style', labelKey: 'style_label', placeholderKey: 'style_placeholder', type: 'input' as const },
  { key: 'handmade_process', labelKey: 'process_label', placeholderKey: 'process_placeholder', type: 'textarea' as const },
  { key: 'production_scale', labelKey: 'scale_label', placeholderKey: 'scale_placeholder', type: 'input' as const },
  { key: 'monthly_output', labelKey: 'monthly_label', placeholderKey: 'monthly_placeholder', type: 'input' as const },
  { key: 'studio_log_commitment', labelKey: 'log_label', placeholderKey: 'log_placeholder', type: 'input' as const },
] as const

export type ApplicationDetailsPayload = {
  primary_craft_style: string
  handmade_process: string
  production_scale: string
  monthly_output: string
  studio_log_commitment: string
  country: string
  city: string
  lat: number | null
  lng: number | null
}

interface ArtistApplyModalProps {
  open: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
}

const initialValues: ApplicationDetailsPayload = {
  primary_craft_style: '',
  handmade_process: '',
  production_scale: '',
  monthly_output: '',
  studio_log_commitment: '',
  country: '',
  city: '',
  lat: null,
  lng: null,
}

const COUNTRY_OPTIONS = [
  { value: 'kr', labelKey: 'country_kr' as const },
  { value: 'jp', labelKey: 'country_jp' as const },
  { value: 'usa', labelKey: 'country_usa' as const },
  { value: 'france', labelKey: 'country_france' as const },
  { value: 'uk', labelKey: 'country_uk' as const },
  { value: 'germany', labelKey: 'country_germany' as const },
  { value: 'other', labelKey: 'country_other' as const },
]

/** Map Google Places country short_name to our dropdown value */
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

export default function ArtistApplyModal({
  open,
  onClose,
  userId,
  onSuccess,
}: ArtistApplyModalProps) {
  const t = useTranslations('apply')
  const tApp = useTranslations('artist_application')
  const locale = useLocale()
  const [details, setDetails] = useState<ApplicationDetailsPayload>(initialValues)
  const [customCountry, setCustomCountry] = useState('')
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const supabase = createClient()
  const mapLanguage = locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'en'

  const handleLocationSelect = (result: LocationPlaceResult) => {
    const mapped = mapCountryCode(result.country)
    setDetails((prev) => ({
      ...prev,
      city: result.city,
      country: mapped,
      lat: result.lat,
      lng: result.lng,
    }))
    if (mapped === 'other') setCustomCountry(result.country)
    else setCustomCountry('')
  }

  const isOtherCountry = details.country === 'other'

  useEffect(() => {
    if (portfolioFiles.length === 0) {
      setPortfolioPreviews([])
      return
    }
    const urls = portfolioFiles.map((f) => URL.createObjectURL(f))
    setPortfolioPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [portfolioFiles])

  const handleChange = (key: keyof ApplicationDetailsPayload, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }))
    if (key === 'country' && value !== 'other') setCustomCountry('')
  }

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setPortfolioFiles((prev) => [...prev, ...list].slice(0, PORTFOLIO_MAX))
    e.target.value = ''
  }

  const removePortfolioImage = (index: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const getValidationErrors = (): Record<string, unknown> => {
    const countryForDb = isOtherCountry ? customCountry.trim() : details.country.trim()
    const errors: Record<string, unknown> = {}
    if (
      !details.primary_craft_style.trim() ||
      !details.handmade_process.trim() ||
      !details.production_scale.trim() ||
      !details.monthly_output.trim() ||
      !details.studio_log_commitment.trim()
    ) {
      errors.textFields = true
    }
    if (!countryForDb || !details.city.trim()) errors.location = true
    if (isOtherCountry && !customCountry.trim()) errors.otherCountry = true
    if (portfolioFiles.length < PORTFOLIO_MIN) errors.minImages = true
    if (portfolioFiles.length > PORTFOLIO_MAX) errors.maxImages = true
    return errors
  }

  const handleSubmit = async () => {
    const countryForDb = isOtherCountry ? customCountry.trim() : details.country.trim()
    const a = {
      primary_craft_style: details.primary_craft_style.trim(),
      handmade_process: details.handmade_process.trim(),
      production_scale: details.production_scale.trim(),
      monthly_output: details.monthly_output.trim(),
      studio_log_commitment: details.studio_log_commitment.trim(),
      country: countryForDb,
      city: details.city.trim(),
      lat: details.lat,
      lng: details.lng,
    }

    const errors = getValidationErrors()
    if (Object.keys(errors).length > 0) {
      console.log('[ArtistApply] Validation errors', errors)
      if (errors.minImages) {
        toast.error(tApp('error.min_images'))
        return
      }
      if (errors.maxImages) {
        toast.error(tApp('error.max_images'))
        return
      }
      if (errors.textFields) {
        toast.error(tApp('error.fill_questions'))
        return
      }
      if (errors.location) {
        toast.error(tApp('error.select_location'))
        return
      }
      if (errors.otherCountry) {
        toast.error(tApp('error.enter_country'))
        return
      }
      toast.error(tApp('error.complete_all'))
      return
    }

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setSubmitting(false)
      toast.error(tApp('error.signin_required'))
      return
    }

    const folder = `applications/${user.id}`
    const uploadedUrls: string[] = []
    try {
      for (let i = 0; i < portfolioFiles.length; i++) {
        const file = portfolioFiles[i]
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${folder}/portfolio-${Date.now()}-${i}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET_APPLICATIONS)
          .upload(path, file, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET_APPLICATIONS)
          .getPublicUrl(path)
        uploadedUrls.push(urlData.publicUrl)
      }
    } catch (err) {
      setSubmitting(false)
      console.log('[ArtistApply] Upload error', err)
      toast.error(tApp('error.upload_failed') + (err instanceof Error ? ': ' + err.message : ''))
      return
    }

    const content =
      `Craft: ${a.primary_craft_style}\n` +
      `Handmade: ${a.handmade_process}\n` +
      `Capacity: ${a.monthly_output}\n` +
      `Log Goal: ${a.studio_log_commitment}\n` +
      `Production: ${a.production_scale}`

    const { error: insertError } = await supabase
      .from('artist_applications')
      .insert({
        user_id: user.id,
        status: 'pending',
        answers: {
          content,
          country: a.country,
          city: a.city,
          ...(a.lat != null && a.lng != null ? { lat: a.lat, lng: a.lng } : {}),
        },
        portfolio_images: uploadedUrls,
      })

    if (insertError) {
      setSubmitting(false)
      console.log('[ArtistApply] Insert error', insertError)
      toast.error(tApp('error.send_failed') + ': ' + insertError.message)
      return
    }

    const profileUpdate: { is_artist_pending: boolean; role: 'pending_artist'; city?: string; country?: string; lat?: number; lng?: number } = {
      is_artist_pending: true,
      role: 'pending_artist',
    }
    if (a.city) profileUpdate.city = a.city
    if (a.country) profileUpdate.country = a.country
    if (a.lat != null && a.lng != null) {
      profileUpdate.lat = a.lat
      profileUpdate.lng = a.lng
    }

    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)

    if (profileUpdateError) {
      console.log('[ArtistApply] Profile update error (non-blocking)', profileUpdateError)
    }

    setSubmitting(false)
    setDetails(initialValues)
    setCustomCountry('')
    setPortfolioFiles([])
    onSuccess()
    onClose()
    toast.success(tApp('success.submit'))
  }

  const isValid =
    isAgreed &&
    !submitting &&
    details.primary_craft_style.trim() &&
    details.handmade_process.trim() &&
    details.production_scale.trim() &&
    details.monthly_output.trim() &&
    details.studio_log_commitment.trim() &&
    details.country &&
    details.city.trim() &&
    (!(details.country === 'other') || customCountry.trim()) &&
    portfolioFiles.length >= PORTFOLIO_MIN &&
    portfolioFiles.length <= PORTFOLIO_MAX

  const handleSubmitClick = () => {
    const errors = getValidationErrors()
    if (Object.keys(errors).length === 0 && isValid) {
      handleSubmit()
      return
    }
    if (!isAgreed) {
      toast.error(tApp('error.agree_terms'))
      return
    }
    if (errors.minImages) {
      toast.error(tApp('error.min_images'))
      return
    }
    if (errors.maxImages) {
      toast.error(tApp('error.max_images'))
      return
    }
    if (errors.textFields) {
      toast.error(tApp('error.fill_questions'))
      return
    }
    if (errors.location) {
      toast.error(tApp('error.select_location'))
      return
    }
    if (errors.otherCountry) {
      toast.error(tApp('error.enter_country'))
      return
    }
    toast.error(tApp('error.complete_all'))
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={submitting}
          className={`px-4 py-2 text-sm rounded-full font-medium transition-all ${
            isValid
              ? 'bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? t('submit_loading') : t('submit')}
        </button>
      </div>
      <div className="overflow-y-auto p-5 sm:p-6 space-y-8 pb-8">
        {APPLICATION_FIELD_CONFIG.map((field) => (
          <div key={field.key} className="space-y-2">
            <label
              htmlFor={field.key}
              className="block text-sm font-medium text-slate-800"
            >
              {t(field.labelKey)}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.key}
                value={details[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={t(field.placeholderKey)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none"
              />
            ) : (
              <input
                id={field.key}
                type="text"
                value={details[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={t(field.placeholderKey)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
              />
            )}
          </div>
        ))}

        {/* Activity Location (Required) */}
        <div className="space-y-4 pt-2">
          <h4 className="text-sm font-semibold text-slate-800">
            {t('activity_location_title')} <span className="text-red-500">*</span>
          </h4>
          <div className="space-y-2">
            <label htmlFor="country" className="block text-sm font-medium text-slate-800">
              {t('country_label')} <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
              value={details.country}
              onChange={(e) => handleChange('country', e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 text-sm focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none bg-white"
            >
              <option value="">{t('country_default')}</option>
              {COUNTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            {isOtherCountry && (
              <div className="mt-3 animate-[fadeIn_0.2s_ease-out]">
                <input
                  type="text"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  placeholder={t('country_other_placeholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                  aria-label={t('country_other_placeholder')}
                />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="location-search" className="block text-sm font-medium text-slate-800">
              {t('city_label')} / {t('location_search_label')} <span className="text-red-500">*</span>
            </label>
            <LocationPlacesAutocomplete
              value={details.city ? [details.city, details.country || customCountry].filter(Boolean).join(', ') : ''}
              onChange={handleLocationSelect}
              placeholder={tApp('label.location_placeholder')}
              label=""
              inputClassName="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none bg-white"
              language={mapLanguage}
            />
            <p className="text-xs text-gray-500">{t('city_hint')}</p>
          </div>
        </div>

        {/* Representative Artwork Photos (Min 3, Max 10) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-800">
            {t('photos_label')} <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {portfolioPreviews.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`Artwork ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => removePortfolioImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow"
                  aria-label="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {portfolioFiles.length < PORTFOLIO_MAX && (
              <label className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#8E86F5] hover:text-[#8E86F5] cursor-pointer transition-colors">
                <span className="text-2xl leading-none">+</span>
                <span className="text-xs mt-1">{t('add')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePortfolioChange}
                />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {t('photos_hint')}
          </p>
        </div>

        {/* Disclaimer Section */}
        <div className="mt-8 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
              {t('agreement_title')}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              {t('agreement_text')}
            </p>
            <label className="flex items-center gap-3 cursor-pointer group select-none">
              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${isAgreed ? 'bg-[#2F5D50] border-[#2F5D50]' : 'border-gray-300 bg-white group-hover:border-[#2F5D50]'}`}>
                {isAgreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
              />
              <span className={`text-sm font-medium transition-colors ${isAgreed ? 'text-[#2F5D50]' : 'text-gray-500'}`}>
                {t('agreement_required')}
              </span>
            </label>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
