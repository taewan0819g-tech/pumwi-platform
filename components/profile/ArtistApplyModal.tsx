'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Check, X } from 'lucide-react'

const PORTFOLIO_MAX = 3
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
}

export default function ArtistApplyModal({
  open,
  onClose,
  userId,
  onSuccess,
}: ArtistApplyModalProps) {
  const t = useTranslations('apply')
  const [details, setDetails] = useState<ApplicationDetailsPayload>(initialValues)
  const [portfolioFiles, setPortfolioFiles] = useState<File[]>([])
  const [portfolioPreviews, setPortfolioPreviews] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const supabase = createClient()

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
  }

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, PORTFOLIO_MAX)
    setPortfolioFiles((prev) => [...prev, ...list].slice(0, PORTFOLIO_MAX))
    e.target.value = ''
  }

  const removePortfolioImage = (index: number) => {
    setPortfolioFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const a = {
      primary_craft_style: details.primary_craft_style.trim(),
      handmade_process: details.handmade_process.trim(),
      production_scale: details.production_scale.trim(),
      monthly_output: details.monthly_output.trim(),
      studio_log_commitment: details.studio_log_commitment.trim(),
    }
    if (Object.values(a).some((v) => !v)) {
      alert('Please answer all five questions.')
      return
    }
    if (portfolioFiles.length !== PORTFOLIO_MAX) {
      alert(`Please upload exactly ${PORTFOLIO_MAX} representative artwork photos.`)
      return
    }

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setSubmitting(false)
      alert('Sign in required.')
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
      alert('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
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
        answers: { content },
        portfolio_images: uploadedUrls,
      })

    if (insertError) {
      setSubmitting(false)
      alert('Send failed: ' + insertError.message)
      return
    }

    await supabase
      .from('profiles')
      .update({ is_artist_pending: true })
      .eq('id', user.id)

    setSubmitting(false)
    setDetails(initialValues)
    setPortfolioFiles([])
    onSuccess()
    onClose()
    alert('Application submitted. Under review.')
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('title')} className="max-w-lg">
      <div className="p-5 sm:p-6 space-y-8">
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

        {/* Representative Artwork Photos (Required, Max 3) */}
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

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isAgreed || portfolioFiles.length !== PORTFOLIO_MAX || submitting}
            className={`w-full sm:w-auto min-w-[140px] py-3.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm ${
              isAgreed && !submitting
                ? 'bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 hover:shadow-md transform hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? t('submit_loading') : t('submit')}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
