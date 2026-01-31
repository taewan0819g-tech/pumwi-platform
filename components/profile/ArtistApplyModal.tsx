'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

export const ARTIST_APPLY_QUESTIONS = [
  '이 작품 하나를 완성하는 데, 처음 재료 준비부터 마지막 마감까지 어떤 순서로 진행하시나요?',
  '이 작업 중 외주를 주거나 기계를 사용하는 단계가 있다면, 어디까지가 직접 작업이고 어디부터 도움을 받나요?',
  '이 작품을 만들게 된 직접적인 계기가 된 작업이나 경험이 있다면 무엇인가요?',
  '작품의 디자인, 형태, 패턴은 전적으로 본인의 창작인가요? (참고한 것이 있다면 설명)',
  '플랫폼에 등록된 작품의 저작권 및 법적 책임은 작가 본인에게 귀속됨을 이해하고 동의하시나요?',
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
  const [answers, setAnswers] = useState<string[]>(['', '', '', '', ''])
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  const handleChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }

  const handleSubmit = async () => {
    if (!agreed) {
      toast.error('마지막 항목에 동의해 주세요.')
      return
    }
    const trimmed = answers.map((a) => a.trim())
    if (trimmed.slice(0, 4).some((a) => !a)) {
      toast.error('1~4번 문항에 모두 답해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      const answersPayload = {
        q1: trimmed[0],
        q2: trimmed[1],
        q3: trimmed[2],
        q4: trimmed[3],
        agreed: true,
      }

      const { data: existing } = await supabase
        .from('artist_applications')
        .select('id, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing?.status === 'rejected') {
        const { error: updateAppError } = await supabase
          .from('artist_applications')
          .update({
            status: 'pending',
            answers: answersPayload,
            created_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
        if (updateAppError) throw updateAppError
      } else if (!existing || existing.status !== 'pending') {
        const { error: insertError } = await supabase.from('artist_applications').insert({
          user_id: userId,
          status: 'pending',
          answers: answersPayload,
        })
        if (insertError) throw insertError
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_artist_pending: true })
        .eq('id', userId)
      if (updateError) throw updateError
      toast.success('신청이 완료되었습니다. 심사 결과를 기다려 주세요.')
      setAnswers(['', '', '', '', ''])
      setAgreed(false)
      onClose()
      onSuccess()
    } catch (err) {
      console.error('[artist apply]', err)
      toast.error(err instanceof Error ? err.message : '신청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="아티스트 신청" className="max-w-lg">
      <div className="p-4 space-y-4">
        {ARTIST_APPLY_QUESTIONS.map((q, i) => (
          <div key={i}>
            <p className="text-sm font-medium text-slate-700 mb-1">
              {i + 1}. {q}
            </p>
            {i < 4 ? (
              <textarea
                value={answers[i] ?? ''}
                onChange={(e) => handleChange(i, e.target.value)}
                placeholder="답변을 입력하세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900 text-sm resize-none"
              />
            ) : (
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="rounded border-gray-300 text-[#8E86F5] focus:ring-[#8E86F5]"
                />
                <span className="text-sm text-slate-700">동의합니다</span>
              </label>
            )}
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? '제출 중...' : '제출'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
