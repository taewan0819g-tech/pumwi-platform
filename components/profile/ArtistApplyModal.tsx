'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import LocationPlacesAutocomplete, { type LocationPlaceResult } from '@/components/profile/LocationPlacesAutocomplete'
import type { Database } from '@/types/supabase'

const PORTFOLIO_MIN = 3
const PORTFOLIO_MAX = 10
const STORAGE_BUCKET_APPLICATIONS = 'applications'

export type HostApplicationType = 'artist' | 'space' | 'food'

/** experience_spots-ready keys stored in application_details */
export const EXPERIENCE_SPOTS_KEYS = [
  'application_type',
  'category_s',
  'description_en',
  'philosophy',
  'mood_tags',
  'anti_target',
] as const

/** experience_spots Insert 호환: 폼에서 채우는 필드 (location은 API에서 ST_MakePoint(lng,lat)로 삽입) */
export type ExperienceSpotHostPayload = Pick<
  Database['public']['Tables']['experience_spots']['Insert'],
  'category_s' | 'description_en' | 'philosophy' | 'mood_tags' | 'anti_target' | 'address_en'
> & { application_type: HostApplicationType; lat: number; lng: number; formatted_address: string; detailed_address?: string }

/** Per-type form field config: key -> { labelKey, placeholderKey, textarea? } */
export const HOST_APPLICATION_FIELDS: Record<
  HostApplicationType,
  Array<{ key: string; labelKey: string; placeholderKey: string; textarea?: boolean }>
> = {
  artist: [
    { key: 'signature_works', labelKey: 'artist_signature_works_label', placeholderKey: 'artist_signature_works_placeholder' },
    { key: 'materials_technique', labelKey: 'artist_materials_label', placeholderKey: 'artist_materials_placeholder', textarea: true },
    { key: 'philosophy_msg', labelKey: 'artist_philosophy_label', placeholderKey: 'artist_philosophy_placeholder', textarea: true },
    { key: 'studio_env', labelKey: 'artist_studio_env_label', placeholderKey: 'artist_studio_env_placeholder' },
    { key: 'recommended_for', labelKey: 'artist_recommended_label', placeholderKey: 'artist_recommended_placeholder', textarea: true },
    { key: 'not_recommended', labelKey: 'artist_not_recommended_label', placeholderKey: 'artist_not_recommended_placeholder' },
  ],
  space: [
    { key: 'space_identity', labelKey: 'space_identity_label', placeholderKey: 'space_identity_placeholder' },
    { key: 'signature_view', labelKey: 'space_signature_view_label', placeholderKey: 'space_signature_view_placeholder', textarea: true },
    { key: 'time_season', labelKey: 'space_time_season_label', placeholderKey: 'space_time_season_placeholder' },
    { key: 'hidden_story', labelKey: 'space_hidden_story_label', placeholderKey: 'space_hidden_story_placeholder', textarea: true },
    { key: 'soundscape', labelKey: 'space_soundscape_label', placeholderKey: 'space_soundscape_placeholder' },
  ],
  food: [
    { key: 'signature_menu', labelKey: 'food_signature_menu_label', placeholderKey: 'food_signature_menu_placeholder' },
    { key: 'ingredients_origin', labelKey: 'food_ingredients_label', placeholderKey: 'food_ingredients_placeholder', textarea: true },
    { key: 'space_character', labelKey: 'food_space_character_label', placeholderKey: 'food_space_character_placeholder' },
    { key: 'cultural_value', labelKey: 'food_cultural_value_label', placeholderKey: 'food_cultural_value_placeholder', textarea: true },
    { key: 'pair_with', labelKey: 'food_pair_with_label', placeholderKey: 'food_pair_with_placeholder', textarea: true },
  ],
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

function mapCountryCode(code: string): string {
  const upper = code.toUpperCase()
  const map: Record<string, string> = {
    KR: 'kr', JP: 'jp', US: 'usa', FR: 'france', GB: 'uk', DE: 'germany',
  }
  return map[upper] ?? 'other'
}

function parseMoodTags(s: string): string[] {
  return s
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

/** 유형별 질문 ↔ experience_spots 컬럼 매핑 (지시서 기준)
 * Type 1 Artist: category_s, description_en([핵심작품]+[추천대상]), philosophy([재료와기법]+[작가의철학]), mood_tags, anti_target
 * Type 2 Space: category_s, description_en([시그니처뷰]+[숨겨진이야기]), mood_tags([시간과계절]+[공간의소음도])
 * Type 3 Food: category_s, philosophy(식재료수급), description_en([문화적가치]+[함께즐기기]), mood_tags
 */
function buildApplicationDetails(
  type: HostApplicationType,
  form: Record<string, string>
): Record<string, unknown> {
  const mood = (s: string) => parseMoodTags(s || '')
  const base: Record<string, unknown> = {
    application_type: type,
    form: { ...form },
  }
  if (type === 'artist') {
    base.category_s = (form.signature_works || '').trim().slice(0, 200) || 'Art'
    base.description_en = [
      (form.signature_works || '').trim() ? `[핵심 작품] ${(form.signature_works || '').trim()}` : '',
      (form.recommended_for || '').trim() ? `[추천 대상] ${(form.recommended_for || '').trim()}` : '',
    ].filter(Boolean).join('\n\n')
    base.philosophy = [
      (form.materials_technique || '').trim() ? `[재료와 기법] ${(form.materials_technique || '').trim()}` : '',
      (form.philosophy_msg || '').trim() ? `[작가의 철학] ${(form.philosophy_msg || '').trim()}` : '',
    ].filter(Boolean).join('\n\n')
    base.mood_tags = mood(form.studio_env || '')
    base.anti_target = (form.not_recommended || '').trim() || null
  } else if (type === 'space') {
    base.category_s = (form.space_identity || '').trim().slice(0, 200) || 'Space'
    base.description_en = [
      (form.signature_view || '').trim() ? `[시그니처 뷰] ${(form.signature_view || '').trim()}` : '',
      (form.hidden_story || '').trim() ? `[숨겨진 이야기] ${(form.hidden_story || '').trim()}` : '',
    ].filter(Boolean).join('\n\n')
    base.philosophy = null
    base.mood_tags = [...mood(form.time_season || ''), ...mood(form.soundscape || '')].filter(Boolean)
    base.anti_target = null
  } else {
    base.category_s = (form.signature_menu || '').trim().slice(0, 200) || 'Food'
    base.philosophy = (form.ingredients_origin || '').trim() || null
    base.description_en = [
      (form.cultural_value || '').trim() ? `[문화적 가치] ${(form.cultural_value || '').trim()}` : '',
      (form.pair_with || '').trim() ? `[함께 즐기기] ${(form.pair_with || '').trim()}` : '',
    ].filter(Boolean).join('\n\n')
    base.mood_tags = mood(form.space_character || '')
    base.anti_target = null
  }
  return base
}

/** Legacy: admin may still show old 5-field config for old applications */
export const APPLICATION_FIELD_CONFIG = [
  { key: 'primary_craft_style', labelKey: 'style_label', placeholderKey: 'style_placeholder', type: 'input' as const },
  { key: 'handmade_process', labelKey: 'process_label', placeholderKey: 'process_placeholder', type: 'textarea' as const },
  { key: 'production_scale', labelKey: 'scale_label', placeholderKey: 'scale_placeholder', type: 'input' as const },
  { key: 'monthly_output', labelKey: 'monthly_label', placeholderKey: 'monthly_placeholder', type: 'input' as const },
  { key: 'studio_log_commitment', labelKey: 'log_label', placeholderKey: 'log_placeholder', type: 'input' as const },
] as const

interface ArtistApplyModalProps {
  open: boolean
  onClose: () => void
  userId: string
  onSuccess: () => void
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
  const [applicationType] = useState<HostApplicationType>('artist')
  const [form, setForm] = useState<Record<string, string>>({})
  const [location, setLocation] = useState({
    country: '',
    city: '',
    lat: null as number | null,
    lng: null as number | null,
    formatted_address: null as string | null,
  })
  const [detailedAddress, setDetailedAddress] = useState('')
  const [customCountry, setCustomCountry] = useState('')
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const supabase = createClient()
  const mapLanguage = locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'en'

  const handleLocationSelect = (result: LocationPlaceResult) => {
    const mapped = mapCountryCode(result.country)
    setLocation({
      city: result.city,
      country: mapped,
      lat: result.lat,
      lng: result.lng,
      formatted_address: result.formatted_address ?? null,
    })
    if (mapped === 'other') setCustomCountry(result.country)
    else setCustomCountry('')
  }

  useEffect(() => {
    if (!open) {
      setForm({})
      setLocation({ country: '', city: '', lat: null, lng: null, formatted_address: null })
      setDetailedAddress('')
      setCustomCountry('')
      setPortfolioFiles([])
      setIsAgreed(false)
    }
  }, [open])

  useEffect(() => {
    if (portfolioFiles.length === 0) {
      setPortfolioPreviews([])
      return
    }
    const urls = portfolioFiles.map((f) => URL.createObjectURL(f))
    setPortfolioPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [portfolioFiles])

  const handleFormChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
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

  const fields = applicationType ? HOST_APPLICATION_FIELDS[applicationType] : []
  const allFieldsFilled =
    applicationType &&
    fields.every((f) => (form[f.key] ?? '').trim().length > 0)
  const countryForDb = location.country === 'other' ? customCountry.trim() : location.country.trim()
  const locationOk =
    location.lat != null &&
    location.lng != null &&
    (location.formatted_address != null && location.formatted_address.length > 0 || location.city.trim().length > 0)
  const portfolioOk = applicationType !== 'artist' || (portfolioFiles.length >= PORTFOLIO_MIN && portfolioFiles.length <= PORTFOLIO_MAX)
  const isValid = !!applicationType && !!allFieldsFilled && locationOk && portfolioOk && isAgreed && !submitting

  const handleSubmit = async () => {
    if (!applicationType || !isValid) return

    const errors: string[] = []
    if (!allFieldsFilled) errors.push(tApp('error.fill_questions'))
    if (!locationOk) errors.push(location.lat == null || location.lng == null ? tApp('error.select_address_required') : tApp('error.select_location'))
    if (applicationType === 'artist' && portfolioFiles.length < PORTFOLIO_MIN) errors.push(tApp('error.min_images'))
    if (applicationType === 'artist' && portfolioFiles.length > PORTFOLIO_MAX) errors.push(tApp('error.max_images'))
    if (location.country === 'other' && !customCountry.trim()) errors.push(tApp('error.enter_country'))
    if (!isAgreed) errors.push(tApp('error.agree_terms'))
    if (errors.length > 0) {
      toast.error(errors[0])
      return
    }

    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setSubmitting(false)
      toast.error(tApp('error.signin_required'))
      return
    }

    let uploadedUrls: string[] = []
    if (applicationType === 'artist' && portfolioFiles.length > 0) {
      const folder = `applications/${user.id}`
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
        toast.error(tApp('error.upload_failed') + (err instanceof Error ? ': ' + err.message : ''))
        return
      }
    }

    const application_details = buildApplicationDetails(applicationType, form)
    const formattedAddress = location.formatted_address || (location.city && location.country ? [location.city, countryForDb].filter(Boolean).join(', ') : '') || location.city

    const payload: {
      application_type: HostApplicationType
      lat: number
      lng: number
      formatted_address: string
      detailed_address?: string
      application_details: {
        category_s: string | null
        description_en: string | null
        philosophy: string | null
        mood_tags: string[] | null
        anti_target: string | null
      }
    } = {
      application_type: applicationType,
      lat: location.lat as number,
      lng: location.lng as number,
      formatted_address: formattedAddress,
      detailed_address: detailedAddress.trim() || undefined,
      application_details: {
        category_s: (application_details.category_s as string) ?? null,
        description_en: (application_details.description_en as string) ?? null,
        philosophy: (application_details.philosophy as string | null) ?? null,
        mood_tags: Array.isArray(application_details.mood_tags) ? application_details.mood_tags : null,
        anti_target: (application_details.anti_target as string | null) ?? null,
      },
    }

    const hostApplyRes = await fetch('/api/host/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!hostApplyRes.ok) {
      const errBody = await hostApplyRes.json().catch(() => ({}))
      setSubmitting(false)
      toast.error(tApp('error.send_failed') + (errBody?.details ? ': ' + errBody.details : ''))
      return
    }

    const content =
      `Type: ${applicationType}\n` +
      `Category: ${application_details.category_s}\n` +
      `Location: ${location.city}, ${countryForDb}`

        const { error: insertError } = await supabase.from('artist_applications').insert({
      user_id: user.id,
          status: 'pending',
      answers: {
        application_type: applicationType,
        content,
        country: countryForDb,
        city: location.city.trim(),
        formatted_address: location.formatted_address ?? undefined,
        detailed_address: detailedAddress.trim() || undefined,
        ...(location.lat != null && location.lng != null ? { lat: location.lat, lng: location.lng } : {}),
      },
      application_details,
      portfolio_images: uploadedUrls,
    })

    if (insertError) {
      setSubmitting(false)
      toast.error(tApp('error.send_failed') + ': ' + insertError.message)
      return
    }

    const profileUpdate: { is_artist_pending: boolean; role: 'pending_artist'; city?: string; country?: string; lat?: number; lng?: number } = {
      is_artist_pending: true,
      role: 'pending_artist',
    }
    if (location.city) profileUpdate.city = location.city
    if (countryForDb) profileUpdate.country = countryForDb
    if (location.lat != null && location.lng != null) {
      profileUpdate.lat = location.lat
      profileUpdate.lng = location.lng
    }
    await supabase.from('profiles').update(profileUpdate).eq('id', user.id)

    setSubmitting(false)
    setForm({})
    setLocation({ country: '', city: '', lat: null, lng: null, formatted_address: null })
    setDetailedAddress('')
    setPortfolioFiles([])
    onSuccess()
    onClose()
    toast.success(tApp('success.submit'))
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md flex justify-between items-center p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
        <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid}
            className={`px-4 py-2 text-sm rounded-full font-medium transition-all ${
              isValid ? 'bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? t('submit_loading') : t('submit')}
          </button>
      </div>
      <div className="overflow-y-auto p-5 sm:p-6 space-y-8 pb-8">
        <>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">{t('type_artist')}</span>
            </div>

            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <label htmlFor={field.key} className="block text-sm font-medium text-slate-800">
                  {t(field.labelKey)}
                </label>
                {field.textarea ? (
              <textarea
                    id={field.key}
                    value={form[field.key] ?? ''}
                    onChange={(e) => handleFormChange(field.key, e.target.value)}
                    placeholder={t(field.placeholderKey)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none"
              />
            ) : (
                  <input
                    id={field.key}
                    type="text"
                    value={form[field.key] ?? ''}
                    onChange={(e) => handleFormChange(field.key, e.target.value)}
                    placeholder={t(field.placeholderKey)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                  />
                )}
              </div>
            ))}

            <div className="space-y-4 pt-2">
              <h4 className="text-sm font-semibold text-slate-800">
                {t('activity_location_title')} <span className="text-red-500">*</span>
              </h4>
              <div className="space-y-2">
                <label htmlFor="search-address" className="block text-sm font-medium text-slate-800">
                  {t('search_address_label')} <span className="text-red-500">*</span>
                </label>
                <LocationPlacesAutocomplete
                  value={location.formatted_address || (location.city && location.country ? [location.city, location.country].filter(Boolean).join(', ') : '')}
                  onChange={handleLocationSelect}
                  placeholder={t('search_address_placeholder')}
                  label=""
                  inputClassName="w-full px-4 py-3 border border-gray-300 rounded-xl text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none bg-white"
                  language={mapLanguage}
                />
                <p className="text-xs text-gray-500">{t('location_search_label')}</p>
              </div>
              <div className="space-y-2">
                <label htmlFor="detailed-address" className="block text-sm font-medium text-slate-800">
                  {t('detailed_address_label')}
                </label>
                <input
                  id="detailed-address"
                  type="text"
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder={t('detailed_address_placeholder')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                />
              </div>
            </div>

            {(
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-800">
                  {t('photos_label')} <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-3">
                  {portfolioPreviews.map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => removePortfolioImage(i)}
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-90 hover:opacity-100 shadow"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {portfolioFiles.length < PORTFOLIO_MAX && (
                    <label className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-[#8E86F5] hover:text-[#8E86F5] cursor-pointer transition-colors">
                      <span className="text-2xl leading-none">+</span>
                      <span className="text-xs mt-1">{t('add')}</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioChange} />
              </label>
            )}
          </div>
                <p className="text-xs text-gray-500">{t('photos_hint')}</p>
              </div>
            )}

            <div className="mt-8 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">{t('agreement_title')}</h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-4">{t('agreement_text')}</p>
                <label className="flex items-center gap-3 cursor-pointer group select-none">
                  <div
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${
                      isAgreed ? 'bg-[#2F5D50] border-[#2F5D50]' : 'border-gray-300 bg-white group-hover:border-[#2F5D50]'
                    }`}
                  >
                    {isAgreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </div>
                  <input type="checkbox" className="hidden" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} />
                  <span className={`text-sm font-medium transition-colors ${isAgreed ? 'text-[#2F5D50]' : 'text-gray-500'}`}>
                    {t('agreement_required')}
                  </span>
                </label>
              </div>
        </div>
        </>
      </div>
    </Dialog>
  )
}
