'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/profile'

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

  return (
    <Card>
      <CardHeader
        action={
          isOwn &&
          !editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(true)}
              className="flex items-center gap-1"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )
        }
      >
        <h3 className="font-semibold text-slate-900">Values & philosophy</h3>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Share your values and philosophy"
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900 resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false)
                  setValue(profile?.value_philosophy ?? '')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 whitespace-pre-wrap">
            {profile?.value_philosophy ||
              (isOwn ? 'Share your values and philosophy.' : 'No statement yet.')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
