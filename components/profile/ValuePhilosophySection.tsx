'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { Playfair_Display } from 'next/font/google'
import type { Profile } from '@/types/profile'

const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' })

interface ValuePhilosophySectionProps {
  profile: Profile
  isOwn: boolean
  onUpdate: (profile: Profile) => void
}

export default function ValuePhilosophySection({
  profile,
  isOwn,
  onUpdate,
}: ValuePhilosophySectionProps) {
  const t = useTranslations('profile.sections')
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(profile?.value_philosophy ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setValue(profile?.value_philosophy ?? '')
  }, [profile?.value_philosophy])

  const handleSave = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const supabase = createClient()
      const savedValue = value.trim() || null
      const { error } = await supabase
        .from('profiles')
        .update({ value_philosophy: savedValue })
        .eq('id', profile.id)
      if (error) {
        console.error('[profiles update value_philosophy]', error)
        toast.error(error.message)
        setSaving(false)
        return
      }
      setValue(savedValue ?? '')
      onUpdate({ ...profile, value_philosophy: savedValue })
      toast.success('Saved!')
      setEditing(false)
      router.refresh()
    } catch (err) {
      console.error('[ValuePhilosophySection handleSave]', err)
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const hasStatement = !!profile?.value_philosophy?.trim()

  return (
    <section
      className="rounded-lg overflow-hidden bg-[#FAF9F7] border border-[#2F5D50]/10"
      style={{ boxShadow: '0 1px 3px rgba(47, 93, 80, 0.06)' }}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <h3
          className={`${playfair.className} text-lg font-semibold text-slate-900 tracking-tight`}
          style={{ color: '#2F5D50' }}
        >
          {t('values')}
        </h3>
        {isOwn && !editing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-gray-500 hover:text-[#2F5D50]"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>
      <div className="px-6 pb-8 pt-2">
        <div className="border-t border-[#2F5D50]/20 pt-6" />
        {editing ? (
          <div className="space-y-4">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Share your values and philosophy"
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-md text-slate-900 resize-none bg-white/80 focus:ring-2 focus:ring-[#2F5D50]/30 focus:border-[#2F5D50]/40"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="bg-[#2F5D50] hover:bg-[#2F5D50]/90">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setValue(profile?.value_philosophy ?? '')
                }}
                className="border-[#2F5D50]/30 text-[#2F5D50]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center max-w-2xl mx-auto">
            {hasStatement ? (
              <>
                <span className="block text-5xl leading-none text-[#2F5D50]/30 mb-2 font-serif" aria-hidden>
                  “
                </span>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
                  {profile?.value_philosophy}
                </p>
              </>
            ) : (
              <p className="text-gray-500 italic">
                {isOwn ? 'Share your values and philosophy.' : 'No statement yet.'}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
