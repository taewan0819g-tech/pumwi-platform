'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { approveApplication, rejectApplication } from './actions'
import { ARTIST_APPLY_QUESTIONS } from '@/components/profile/ArtistApplyModal'

interface ApplicationRow {
  id: string
  user_id: string
  status: string
  answers: Record<string, unknown>
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

const ANSWER_KEYS = ['q1', 'q2', 'q3', 'q4'] as const

export default function AdminApplicationsClient({
  applications,
}: {
  applications: ApplicationRow[]
}) {
  const router = useRouter()
  const [detailId, setDetailId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const detail = applications.find((a) => a.id === detailId)

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleApprove = async (id: string) => {
    setLoadingId(id)
    try {
      const result = await approveApplication(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('아티스트로 등업되었습니다.')
      setDetailId(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('이 신청을 거절하시겠습니까?')) return
    const reason = prompt('거절 사유 (선택, 입력하지 않으면 비워 둡니다):')
    setLoadingId(id)
    try {
      const result = await rejectApplication(id, reason ?? undefined)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('거절했습니다.')
      setDetailId(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <h1 className="text-xl font-bold text-slate-900 mb-6">아티스트 신청 관리</h1>
      {applications.length === 0 ? (
        <p className="text-gray-500 font-medium py-8">대기 중인 신청이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {applications.map((app) => (
            <li key={app.id}>
              <div className="w-full flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-[#8E86F5]/30 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {app.profiles?.avatar_url ? (
                    <img
                      src={app.profiles.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {app.profiles?.full_name ?? '이름 없음'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    신청일: {formatDate(app.created_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setDetailId(app.id)}
                  className="flex-shrink-0 bg-[#8E86F5] hover:opacity-90 text-white"
                >
                  심사하기
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!detail} onClose={() => setDetailId(null)} title="신청 상세">
        {detail && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {detail.profiles?.avatar_url ? (
                  <img
                    src={detail.profiles.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-6 w-6 text-gray-400" />
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-900">
                  {detail.profiles?.full_name ?? '이름 없음'}
                </p>
                <p className="text-xs text-gray-500">{formatDate(detail.created_at)}</p>
              </div>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {ANSWER_KEYS.map((key, i) => (
                <div key={key}>
                  <p className="text-sm font-medium text-slate-700 mb-1">
                    {i + 1}. {ARTIST_APPLY_QUESTIONS[i]}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded p-3">
                    {String(detail.answers[key] ?? '-')}
                  </p>
                </div>
              ))}
              <p className="text-sm text-slate-600">
                5. {ARTIST_APPLY_QUESTIONS[4]} — 동의함
              </p>
            </div>
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <Button
                onClick={() => handleApprove(detail.id)}
                disabled={loadingId === detail.id}
                className="flex-1 bg-[#8E86F5] hover:opacity-90"
              >
                {loadingId === detail.id ? '처리 중...' : '승인'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(detail.id)}
                disabled={loadingId === detail.id}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                거절
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
