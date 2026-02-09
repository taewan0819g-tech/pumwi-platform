'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const PURPOSE_OPTIONS = [
  { value: '', label: 'Select (optional)' },
  { value: 'personal', label: 'Personal collection' },
  { value: 'gift', label: 'Gift' },
  { value: 'office', label: 'Office / Lobby' },
  { value: 'home', label: 'Home interior' },
] as const

const BUDGET_OPTIONS = [
  { value: '', label: 'Select (optional)' },
  { value: 'under_1m', label: 'Under ₩1M' },
  { value: '1m_5m', label: '₩1M–₩5M' },
  { value: '5m_10m', label: '₩5M–₩10M' },
  { value: 'over_10m', label: 'Over ₩10M' },
  { value: 'any', label: 'No budget preference' },
] as const

export default function RequestPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [purpose, setPurpose] = useState('')
  const [budget, setBudget] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null)
      setMounted(true)
    })
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (userId === null) {
      router.replace('/login')
    }
  }, [mounted, userId, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    const trimmed = content.trim()
    if (!trimmed) {
      alert('Please enter your commission details.')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('requests').insert({
        user_id: userId,
        purpose: purpose || null,
        budget: budget || null,
        content: trimmed,
      })
      if (error) {
        const msg = error.message ?? ''
        if (
          msg.includes('relation') &&
          (msg.includes('does not exist') || msg.includes('not found'))
        ) {
          alert(
            'The requests table is not set up yet. Please contact the administrator or apply the requests schema in Supabase.'
          )
          return
        }
        if (msg.includes('Row level security') || msg.includes('policy')) {
          alert('Access denied. Please check your sign-in status and RLS policies.')
          return
        }
        throw error
      }
      alert('Your commission request has been received. Our curation will begin shortly.')
      router.push('/')
    } catch (err) {
      console.error('[request]', err)
      const message =
        err instanceof Error ? err.message : 'Failed to submit your request.'
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    )
  }

  if (userId === null) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF]">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <h1
          className="text-3xl sm:text-4xl font-serif text-slate-900 mb-2 tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          AI Art Concierge
        </h1>
        <p className="text-slate-600 mb-12">
          Share your vision with us—as you would with a gallery curator.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label
              htmlFor="purpose"
              className="block text-sm font-medium text-slate-700 mb-2"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Purpose
            </label>
            <select
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            >
              {PURPOSE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="budget"
              className="block text-sm font-medium text-slate-700 mb-2"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Budget
            </label>
            <select
              id="budget"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            >
              {BUDGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-slate-700 mb-2"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Commission details <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Describe the mood, palette, and space you have in mind."
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-white text-slate-900 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
              required
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={submitting || !content.trim()}
              className="w-full py-3 text-base font-medium rounded-lg"
              style={{ backgroundColor: '#8E86F5' }}
            >
              {submitting ? 'Submitting...' : 'Get Curation'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
