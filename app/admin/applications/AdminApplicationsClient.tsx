'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'
import { approveApplication, rejectApplication } from './actions'
import { APPLICATION_DETAILS_FIELDS } from '@/components/profile/ArtistApplyModal'

interface ApplicationRow {
  id: string
  user_id: string
  status: string
  answers: Record<string, unknown>
  application_details: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

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
    return d.toLocaleDateString('en-US', {
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
      toast.success('Approved as artist.')
      setDetailId(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm('Reject this application?')) return
    const reason = prompt('Rejection reason (optional):')
    setLoadingId(id)
    try {
      const result = await rejectApplication(id, reason ?? undefined)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Rejected.')
      setDetailId(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <h1 className="text-xl font-bold text-slate-900 mb-6">Artist applications</h1>
      {applications.length === 0 ? (
        <p className="text-gray-500 font-medium py-8">No pending applications.</p>
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
                    {app.profiles?.full_name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Applied: {formatDate(app.created_at)}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={() => setDetailId(app.id)}
                  className="flex-shrink-0 bg-[#8E86F5] hover:opacity-90 text-white"
                >
                  Review
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!detail} onClose={() => setDetailId(null)} title="Application details">
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
                  {detail.profiles?.full_name ?? 'Unknown'}
                </p>
                <p className="text-xs text-gray-500">{formatDate(detail.created_at)}</p>
              </div>
            </div>
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {detail.answers?.content != null ? (
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Application</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                    {typeof detail.answers.content === 'string'
                      ? detail.answers.content
                      : JSON.stringify(detail.answers.content)}
                  </p>
                </div>
              ) : (detail.application_details || detail.answers) ? (
                APPLICATION_DETAILS_FIELDS.map((field) => {
                  const source = detail.application_details ?? detail.answers
                  const value = source?.[field.key]
                  return (
                    <div key={field.key}>
                      <p className="text-sm font-medium text-slate-700 mb-1">{field.label}</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                        {typeof value === 'string' ? value : value != null ? String(value) : '—'}
                      </p>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-gray-500 italic">No application details.</p>
              )}
            </div>
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <Button
                onClick={() => handleApprove(detail.id)}
                disabled={loadingId === detail.id}
                className="flex-1 bg-[#8E86F5] hover:opacity-90"
              >
                {loadingId === detail.id ? 'Processing...' : 'Approve'}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleReject(detail.id)}
                disabled={loadingId === detail.id}
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
