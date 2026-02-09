'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface ArtistProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string
}

export default function ArtistList() {
  const [artists, setArtists] = useState<ArtistProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchArtists = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role')
        .eq('role', 'artist')
        .limit(10)
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

  return (
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
        <ul className="divide-y divide-gray-100">
          {artists.map((artist) => (
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
                    : 'border-[#8E86F5] text-[#8E86F5] hover:bg-[#8E86F5]/10'
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
      )}
    </div>
  )
}
