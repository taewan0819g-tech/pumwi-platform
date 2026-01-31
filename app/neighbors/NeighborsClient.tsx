'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User } from 'lucide-react'

interface NeighborRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
}

interface NeighborsClientProps {
  currentUserId: string
}

export default function NeighborsClient({ currentUserId }: NeighborsClientProps) {
  const [neighbors, setNeighbors] = useState<NeighborRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchNeighbors = async () => {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)

      if (followError || !followData?.length) {
        setNeighbors([])
        setLoading(false)
        return
      }

      const followingIds = followData.map((r) => r.following_id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, role')
        .in('id', followingIds)

      if (profileError) {
        setNeighbors([])
      } else {
        setNeighbors((profileData as NeighborRow[]) ?? [])
      }
      setLoading(false)
    }
    fetchNeighbors()
  }, [currentUserId])

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">이웃</h1>
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ) : neighbors.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-500 font-medium">아직 이웃이 없습니다.</p>
            <p className="text-gray-400 text-sm mt-1">
              프로필에서 아티스트를 이웃으로 추가해 보세요.
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90"
              style={{ backgroundColor: '#8E86F5' }}
            >
              홈으로
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {neighbors.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:border-[#8E86F5] hover:shadow-md transition-all flex items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {p.avatar_url ? (
                    <img
                      src={p.avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-7 w-7 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 truncate">
                    {p.full_name ?? '이름 없음'}
                  </p>
                  {p.role && (
                    <p className="text-xs text-[#8E86F5] mt-0.5">{p.role}</p>
                  )}
                  {p.bio && (
                    <p className="text-sm text-gray-500 truncate mt-1">{p.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
