'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const PURPOSE_OPTIONS = [
  { value: '', label: '선택 (선택사항)' },
  { value: 'personal', label: '개인 소장' },
  { value: 'gift', label: '선물' },
  { value: 'office', label: '오피스/로비' },
  { value: 'home', label: '홈 인테리어' },
] as const

const BUDGET_OPTIONS = [
  { value: '', label: '선택 (선택사항)' },
  { value: 'under_1m', label: '100만원 이하' },
  { value: '1m_5m', label: '100~500만원' },
  { value: '5m_10m', label: '500~1,000만원' },
  { value: 'over_10m', label: '1,000만원 이상' },
  { value: 'any', label: '가격 무관' },
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
      alert('요청 내용을 입력해 주세요.')
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
          (msg.includes('does not exist') || msg.includes('찾을 수 없'))
        ) {
          alert(
            '요청 테이블이 아직 준비되지 않았습니다. 관리자에게 문의하거나, Supabase에 requests 스키마를 적용해 주세요.'
          )
          return
        }
        if (msg.includes('Row level security') || msg.includes('policy')) {
          alert('접근 권한이 없습니다. 로그인 상태와 RLS 정책을 확인해 주세요.')
          return
        }
        throw error
      }
      alert('요청이 접수되었습니다. AI가 분석을 시작합니다.')
      router.push('/')
    } catch (err) {
      console.error('[request]', err)
      const message =
        err instanceof Error ? err.message : '요청 접수에 실패했습니다.'
      alert(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-slate-500">로딩 중...</p>
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
          홈으로
        </Link>

        <h1
          className="text-3xl sm:text-4xl font-serif text-slate-900 mb-2 tracking-tight"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          AI Art Concierge
        </h1>
        <p className="text-slate-600 mb-12">
          갤러리 큐레이터와 상담하듯, 찾으시는 작품을 알려주세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label
              htmlFor="purpose"
              className="block text-sm font-medium text-slate-700 mb-2"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              용도
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
              예산
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
              요청 내용 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="찾으시는 작품의 느낌, 색감, 공간 분위기를 자유롭게 적어주세요."
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
              {submitting ? '접수 중...' : '매칭 요청하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
