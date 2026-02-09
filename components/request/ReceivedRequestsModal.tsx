'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { User, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

interface RequestRow {
  id: string
  requester_id: string
  artist_id: string
  details: string
  image_urls: string[] | null
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface ReceivedRequestsModalProps {
  open: boolean
  onClose: () => void
  /** 로그인한 유저 ID (artist_id로 사용, 이 유저에게 온 요청만 조회) */
  currentUserId: string
}

function normalizeImageUrls(r: Record<string, unknown>): string[] | null {
  if (Array.isArray(r.image_urls) && r.image_urls.length > 0) return r.image_urls as string[]
  if (typeof r.image_urls === 'string' && r.image_urls) return [r.image_urls]
  return null
}

function RequestImagesCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const n = urls.length

  const scrollToIndex = (i: number) => {
    setIndex(i)
    const el = scrollRef.current
    if (el) {
      const width = el.clientWidth
      el.scrollTo({ left: width * i, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || n <= 1) return
    const width = el.clientWidth
    const i = Math.round(el.scrollLeft / width)
    if (i >= 0 && i < n) setIndex(i)
  }

  return (
    <div className="w-full bg-gray-100 relative group min-h-[120px] rounded-lg overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex scrollbar-hide"
      >
        {urls.map((url) => (
          <div
            key={url}
            className="flex-shrink-0 w-full snap-center flex items-center justify-center max-h-40 bg-gray-100"
          >
            <img
              src={url}
              alt="Reference image"
              className="w-full h-auto max-h-40 object-contain"
            />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex((index - 1 + n) % n)}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex((index + 1) % n)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 px-1.5 py-1 rounded-full bg-black/40">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === index ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ReceivedRequestsModal({
  open,
  onClose,
  currentUserId,
}: ReceivedRequestsModalProps) {
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!open || !currentUserId) return
    setLoading(true)
    supabase
      .from('artwork_requests')
      .select('id, requester_id, artist_id, details, image_urls, created_at, profiles!requester_id(full_name, avatar_url)')
      .eq('artist_id', currentUserId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[ReceivedRequestsModal] artwork_requests select error:', error)
          if (error.message?.includes('foreign key') || error.message?.toLowerCase().includes('relation')) {
            console.error('[ReceivedRequestsModal] Verify FK: requester_id should reference profiles.id.')
          }
          setRequests([])
        } else {
          const rows = (data ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            requester_id: r.requester_id as string,
            artist_id: r.artist_id as string,
            details: r.details as string,
            image_urls: normalizeImageUrls(r),
            created_at: r.created_at as string,
            profiles: r.profiles as { full_name: string | null; avatar_url: string | null } | null,
          }))
          setRequests(rows)
        }
        setLoading(false)
      })
  }, [open, currentUserId])

  const handleDelete = async (requestId: string, requestArtistId: string) => {
    if (requestArtistId !== currentUserId) {
      toast.error('You can only delete requests sent to you.')
      return
    }
    if (!window.confirm('Delete this request?')) return
    setDeletingId(requestId)
    try {
      const { error } = await supabase
        .from('artwork_requests')
        .delete()
        .eq('id', requestId)
        .eq('artist_id', currentUserId)
      if (error) throw error
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      toast.success('Deleted.')
    } catch (err) {
      console.error('[ReceivedRequestsModal] delete error:', err)
      toast.error(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <Dialog open={open} onClose={onClose} title="Commissions" className="max-w-lg">
      <div className="p-4">
        {loading ? (
          <p className="text-sm text-gray-500 py-4">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No commission requests yet.</p>
        ) : (
          <ul className="space-y-4 max-h-[60vh] overflow-y-auto">
            {requests.map((req) => (
              <li
                key={req.id}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 relative"
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                    {req.profiles?.avatar_url ? (
                      <img
                        src={req.profiles.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {req.profiles?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(req.created_at)}
                    </p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">
                      {req.details}
                    </p>
                    {req.image_urls && req.image_urls.length > 0 && (
                      <div className="mt-2">
                        {req.image_urls.length >= 2 ? (
                          <RequestImagesCarousel urls={req.image_urls} />
                        ) : (
                          <img
                            src={req.image_urls[0]}
                            alt="Reference image"
                            className="max-h-40 w-auto rounded-lg border border-gray-200 object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(req.id, req.artist_id)}
                  disabled={deletingId === req.id}
                  className="absolute top-2 right-2 p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  )
}
