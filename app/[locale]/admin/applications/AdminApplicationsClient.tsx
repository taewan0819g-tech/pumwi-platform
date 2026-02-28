'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { approveApplication, rejectApplication, approveCollector, rejectCollector } from './actions'
import {
  APPLICATION_FIELD_CONFIG,
  HOST_APPLICATION_FIELDS,
  type HostApplicationType,
} from '@/components/profile/ArtistApplyModal'

interface ApplicationRow {
  id: string
  user_id: string
  status: string
  answers: Record<string, unknown>
  application_details: Record<string, unknown> | null
  portfolio_images: string[] | null
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface CollectorApplicantRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  collector_bio: string | null
  updated_at: string
}

export default function AdminApplicationsClient({
  applications,
  collectorApplicants = [],
}: {
  applications: ApplicationRow[]
  collectorApplicants?: CollectorApplicantRow[]
}) {
  const router = useRouter()
  const t = useTranslations('apply')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [collectorLoadingId, setCollectorLoadingId] = useState<string | null>(null)
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

  const handleApproveCollector = async (userId: string) => {
    setCollectorLoadingId(userId)
    try {
      const result = await approveCollector(userId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Approved as collector.')
      router.refresh()
    } finally {
      setCollectorLoadingId(null)
    }
  }

  const handleRejectCollector = async (userId: string) => {
    if (!confirm('Reject this collector application?')) return
    setCollectorLoadingId(userId)
    try {
      const result = await rejectCollector(userId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Rejected.')
      router.refresh()
    } finally {
      setCollectorLoadingId(null)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-8">신청서 관리 (Applications)</h1>

      {/* Artist applicants */}
      <section className="mb-12">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">아티스트 신청자</h2>
        {applications.length === 0 ? (
          <p className="text-gray-500 font-medium py-6 bg-white rounded-lg border border-gray-200 px-4">No pending artist applications.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                          {app.profiles?.avatar_url ? (
                            <img src={app.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{app.profiles?.full_name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{formatDate(app.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setDetailId(app.id)}
                          className="bg-[#8E86F5] hover:opacity-90 text-white"
                        >
                          Review
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApprove(app.id)}
                          disabled={loadingId === app.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {loadingId === app.id ? '...' : 'Approve'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(app.id)}
                          disabled={loadingId === app.id}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Collector applicants */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">컬렉터 신청자</h2>
        {collectorApplicants.length === 0 ? (
          <p className="text-gray-500 font-medium py-6 bg-white rounded-lg border border-gray-200 px-4">No pending collector applications.</p>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Bio</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {collectorApplicants.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                          {c.avatar_url ? (
                            <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{c.full_name ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{c.collector_bio ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleApproveCollector(c.id)}
                          disabled={collectorLoadingId === c.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {collectorLoadingId === c.id ? '...' : 'Approve'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectCollector(c.id)}
                          disabled={collectorLoadingId === c.id}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

            {detail.portfolio_images && detail.portfolio_images.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Representative Artworks</p>
                <div className="grid grid-cols-3 gap-2">
                  {detail.portfolio_images.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 hover:border-[#8E86F5] focus:outline-none focus:ring-2 focus:ring-[#8E86F5]"
                    >
                      <img
                        src={url}
                        alt={`Artwork ${i + 1}`}
                        className="h-48 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-6 max-h-96 overflow-y-auto">
              {(() => {
                const appType = (detail.application_details?.application_type ?? detail.answers?.application_type ?? 'artist') as HostApplicationType
                const formData = detail.application_details?.form as Record<string, string> | undefined
                if (formData && HOST_APPLICATION_FIELDS[appType]) {
                  return (
                    <>
                      <p className="text-sm font-medium text-slate-700">Type: Artist</p>
                      {HOST_APPLICATION_FIELDS[appType].map((field) => (
                        <div key={field.key}>
                          <p className="text-sm font-medium text-slate-700 mb-1">{t(field.labelKey)}</p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                            {typeof formData[field.key] === 'string' ? formData[field.key] : formData[field.key] != null ? String(formData[field.key]) : '—'}
                          </p>
                        </div>
                      ))}
                      {detail.application_details?.category_s != null && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">category_s (AI)</p>
                          <p className="text-sm text-slate-600 bg-gray-50 rounded-lg p-3">{String(detail.application_details.category_s)}</p>
                        </div>
                      )}
                      {detail.application_details?.philosophy != null && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">philosophy</p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{String(detail.application_details.philosophy)}</p>
                        </div>
                      )}
                      {detail.application_details?.mood_tags != null && Array.isArray(detail.application_details.mood_tags) && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">mood_tags</p>
                          <p className="text-sm text-slate-600 bg-gray-50 rounded-lg p-3">{(detail.application_details.mood_tags as string[]).join(', ')}</p>
                        </div>
                      )}
                      {detail.application_details?.anti_target != null && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-1">anti_target</p>
                          <p className="text-sm text-slate-600 bg-gray-50 rounded-lg p-3">{String(detail.application_details.anti_target)}</p>
                        </div>
                      )}
                    </>
                  )
                }
                if (detail.answers?.content != null) {
                  return (
                    <div>
                      <p className="text-sm font-medium text-slate-700 mb-1">Application</p>
                      <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                        {typeof detail.answers.content === 'string' ? detail.answers.content : JSON.stringify(detail.answers.content)}
                      </p>
                    </div>
                  )
                }
                if (detail.application_details || detail.answers) {
                  return APPLICATION_FIELD_CONFIG.map((field) => {
                    const source = detail.application_details ?? detail.answers
                    const value = source?.[field.key]
                    return (
                      <div key={field.key}>
                        <p className="text-sm font-medium text-slate-700 mb-1">{t(field.labelKey)}</p>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                          {typeof value === 'string' ? value : value != null ? String(value) : '—'}
                        </p>
                      </div>
                    )
                  })
                }
                return <p className="text-sm text-gray-500 italic">No application details.</p>
              })()}
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
