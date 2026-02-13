'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, ChevronLeft, ChevronRight, MessageSquare, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

export interface CommissionRequest {
  id: string
  requester_id: string
  artist_id: string
  details: string
  image_urls: string[] | null
  created_at: string
  status: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

function RequestImagesCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const n = urls.length

  const scrollToIndex = (i: number) => {
    setIndex(i)
    const el = scrollRef.current
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: 'smooth' })
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || n <= 1) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i >= 0 && i < n) setIndex(i)
  }

  return (
    <div className="w-full bg-gray-100 relative group min-h-[100px] rounded-lg overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex scrollbar-hide"
      >
        {urls.map((url) => (
          <div
            key={url}
            className="flex-shrink-0 w-full snap-center flex items-center justify-center max-h-36 bg-gray-100"
          >
            <img
              src={url}
              alt="Reference"
              className="w-full h-auto max-h-36 object-contain"
            />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex((index - 1 + n) % n)}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex((index + 1) % n)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 px-1.5 py-1 rounded-full bg-black/40">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? 'bg-white scale-110' : 'bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadgeClass(status: string) {
  const s = (status || 'pending').toLowerCase()
  if (s === 'pending') return 'bg-amber-50 text-amber-800 border-amber-200'
  if (s === 'in_progress' || s === 'in progress') return 'bg-[#2F5D50]/15 text-[#2F5D50] border-[#2F5D50]/30'
  if (s === 'accepted' || s === 'completed') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (s === 'declined') return 'bg-gray-100 text-gray-600 border-gray-200'
  return 'bg-gray-50 text-gray-700 border-gray-100'
}

function getStatusLabel(status: string) {
  const s = (status || 'pending').toLowerCase()
  if (s === 'in_progress') return 'In Progress'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

interface CommissionsClientProps {
  requests: CommissionRequest[]
  currentUserId: string
}

export default function CommissionsClient({ requests, currentUserId }: CommissionsClientProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)
  const [localRequests, setLocalRequests] = useState(requests)
  const supabase = createClient()

  const handleDecline = async (req: CommissionRequest) => {
    if (req.artist_id !== currentUserId) {
      toast.error('You can only decline requests sent to you.')
      return
    }
    if (!window.confirm('Decline this commission request?')) return
    setDeletingId(req.id)
    try {
      const { error } = await supabase
        .from('artwork_requests')
        .delete()
        .eq('id', req.id)
        .eq('artist_id', currentUserId)
      if (error) throw error
      setLocalRequests((prev) => prev.filter((r) => r.id !== req.id))
      toast.success('Request declined.')
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Decline failed.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleAccept = async (req: CommissionRequest) => {
    if (req.artist_id !== currentUserId) {
      toast.error('You can only accept requests sent to you.')
      return
    }
    setAcceptingId(req.id)
    try {
      // If artwork_requests has a status column later: .update({ status: 'accepted' })
      toast.success('Commission accepted. You can follow up via Chat.')
      // Optional: update local state to show "In Progress" when status column exists
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Accept failed.')
    } finally {
      setAcceptingId(null)
    }
  }

  if (localRequests.length === 0) {
    return (
      <p className="text-gray-500 text-center py-12 font-medium">
        No commission requests yet.
      </p>
    )
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      {localRequests.map((req) => (
        <li
          key={req.id}
          className="p-4 rounded-xl border border-gray-100 bg-[#F9F9F8] hover:border-[#2F5D50]/20 transition-colors"
        >
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-11 h-11 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
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
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[#2F5D50]">
                  {req.profiles?.full_name ?? 'Unknown'}
                </p>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClass(req.status)}`}
                >
                  {getStatusLabel(req.status)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{formatDate(req.created_at)}</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap mt-2">{req.details}</p>
              {req.image_urls && req.image_urls.length > 0 && (
                <div className="mt-3">
                  {req.image_urls.length >= 2 ? (
                    <RequestImagesCarousel urls={req.image_urls} />
                  ) : (
                    <img
                      src={req.image_urls[0]}
                      alt="Reference"
                      className="max-h-36 w-auto rounded-lg border border-gray-200 object-contain"
                    />
                  )}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => handleAccept(req)}
                  disabled={acceptingId === req.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleDecline(req)}
                  disabled={deletingId === req.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                  Decline
                </button>
                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-[#2F5D50]/40 text-[#2F5D50] hover:bg-[#2F5D50]/10"
                >
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </Link>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
