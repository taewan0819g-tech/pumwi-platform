'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

/** Keys and labels for application_details (used in modal and admin display) */
export const APPLICATION_DETAILS_FIELDS = [
  {
    key: 'primary_craft_style',
    label: 'What is your main craft and artistic style?',
    placeholder: 'e.g., Hand-stitched leather goods with a vintage look',
    type: 'input' as const,
  },
  {
    key: 'handmade_process',
    label: 'Describe your handmade process. Do you use any machinery?',
    placeholder: 'Tell us how much of your work is done by hand...',
    type: 'textarea' as const,
  },
  {
    key: 'production_scale',
    label: 'Do you mass-produce? Please describe your production scale.',
    placeholder: 'e.g., Everything is made to order, no mass production.',
    type: 'input' as const,
  },
  {
    key: 'monthly_output',
    label: 'How many artworks can you typically complete in a month?',
    placeholder: 'e.g., Around 5 to 10 unique pieces',
    type: 'input' as const,
  },
  {
    key: 'studio_log_commitment',
    label: "How many times a week can you share your 'Studio Log'?",
    placeholder: 'e.g., I can update my process 2-3 times a week',
    type: 'input' as const,
  },
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
  const [details, setDetails] = useState<ApplicationDetailsPayload>(initialValues)
  const [submitting, setSubmitting] = useState(false)
  const [isAgreed, setIsAgreed] = useState(false)
  const supabase = createClient()

  const handleChange = (key: keyof ApplicationDetailsPayload, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }))
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

    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) {
      setSubmitting(false)
      alert('Sign in required.')
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
    onSuccess()
    onClose()
    alert('Application submitted. Under review.')
  }

  return (
    <Dialog open={open} onClose={onClose} title="Apply as Artist" className="max-w-lg">
      <div className="p-5 sm:p-6 space-y-8">
        {APPLICATION_DETAILS_FIELDS.map((field) => (
          <div key={field.key} className="space-y-2">
            <label
              htmlFor={field.key}
              className="block text-sm font-medium text-slate-800"
            >
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                id={field.key}
                value={details[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none"
              />
            ) : (
              <input
                id={field.key}
                type="text"
                value={details[field.key]}
                onChange={(e) => handleChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
              />
            )}
          </div>
        ))}

        {/* Disclaimer Section */}
        <div className="mt-8 mb-6">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-2">
              Review & Qualification Agreement
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              All applications are carefully reviewed by the PUMWI team. I understand that if my work is found not to meet PUMWI&apos;s artist standards at any point, it may be subject to re-evaluation by the internal team or the user community. I acknowledge that my Artist status may be revoked based on the review results, and I may be required to re-apply.
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
                I have read and agree to the terms above (Required)
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isAgreed || submitting}
            className={`w-full sm:w-auto min-w-[140px] py-3.5 rounded-xl font-medium text-sm transition-all duration-200 shadow-sm ${
              isAgreed && !submitting
                ? 'bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 hover:shadow-md transform hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? 'Submitting Application...' : 'Apply as Artist'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
