'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { User, X, Plus } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ArtistProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
}

const DISPLAY_LIMIT = 7

export default function ArtistList() {
  const router = useRouter()
  const [artists, setArtists] = useState<ArtistProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [viewAllOpen, setViewAllOpen] = useState(false)

  const supabase = createClient()
  const displayedArtists = artists.slice(0, DISPLAY_LIMIT)
  const hasMore = artists.length > DISPLAY_LIMIT

  useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('role', 'artist')
        .limit(100)
      if (error) {
        setArtists([])
        setLoading(false)
        return
      }
      setArtists((data as ArtistProfile[]) ?? [])
      setLoading(false)
    }
    fetchArtists()
  }, [])

  useEffect(() => {
    const fetchMyFollows = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return
      setCurrentUserId(user.id)
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
      if (data) {
        setFollowing(new Set(data.map((r) => r.following_id)))
      }
    }
    fetchMyFollows()
  }, [])

  const toggleFollow = async (artistId: string) => {
    if (!currentUserId) {
      toast.error('Sign in required.')
      return
    }
    if (togglingId === artistId) return
    setTogglingId(artistId)
    const isFollowing = following.has(artistId)
    setFollowing((prev) => {
      const next = new Set(prev)
      if (isFollowing) next.delete(artistId)
      else next.add(artistId)
      return next
    })
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', artistId)
        if (error) throw error
        toast.success('Unfollowed.')
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: artistId })
        if (error) throw error
        toast.success('Added to following.')
      }
    } catch (err) {
      setFollowing((prev) => {
        const next = new Set(prev)
        if (isFollowing) next.add(artistId)
        else next.delete(artistId)
        return next
      })
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setTogglingId(null)
    }
  }

  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!viewAllOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewAllOpen(false)
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) setViewAllOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = ''
    }
  }, [viewAllOpen])

  const openProfileAndClose = (artistId: string) => {
    setViewAllOpen(false)
    router.push(`/profile/${artistId}`)
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-slate-900">Featured Artists</h3>
        </div>
        {loading ? (
          <div className="p-4 space-y-3 animate-pulse">
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        ) : artists.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No artists registered yet.
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {displayedArtists.map((artist) => (
                <li
                  key={artist.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <Link
                    href={`/profile/${artist.id}`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                      {artist.avatar_url ? (
                        <img
                          src={artist.avatar_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <span className="font-medium text-slate-900 truncate text-sm">
                      {artist.full_name ?? 'Artist'}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleFollow(artist.id)
                    }}
                    disabled={togglingId === artist.id}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors disabled:opacity-50 ${
                      following.has(artist.id)
                        ? 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100'
                        : 'border-[#2F5D50] text-[#2F5D50] hover:bg-[#2F5D50]/10'
                    }`}
                  >
                    {togglingId === artist.id
                      ? 'Processing...'
                      : following.has(artist.id)
                        ? 'Unfollow'
                        : 'Follow'}
                  </button>
                </li>
              ))}
            </ul>
            {hasMore && (
              <div className="p-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewAllOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-[#2F5D50] bg-[#2F5D50]/10 hover:bg-[#2F5D50]/20 border border-[#2F5D50]/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  View All
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* View All modal */}
      {viewAllOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          aria-modal="true"
          role="dialog"
        >
          <div
            ref={modalRef}
            className="bg-white rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">All Artists</h2>
              <button
                type="button"
                onClick={() => setViewAllOpen(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-[#2F5D50] transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] p-2">
              <ul className="divide-y divide-gray-100">
                {artists.map((artist) => (
                  <li key={artist.id}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <button
                        type="button"
                        onClick={() => openProfileAndClose(artist.id)}
                        className="flex items-center gap-3 min-w-0 flex-1 text-left"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                          {artist.avatar_url ? (
                            <img
                              src={artist.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <span className="font-medium text-slate-900 truncate">
                          {artist.full_name ?? 'Artist'}
                        </span>
                      </button>
                      <Link
                        href={`/profile/${artist.id}`}
                        onClick={() => setViewAllOpen(false)}
                        className="flex-shrink-0 text-sm font-medium text-[#2F5D50] hover:underline"
                      >
                        View Profile
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
