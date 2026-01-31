'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { User } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

interface FollowedProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  role: string | null
}

interface UserFollowingSectionProps {
  /** 프로필 주인(이 유저가 팔로우한 아티스트 목록을 표시) */
  userId: string
}

/**
 * 유저가 이웃(Follow)으로 추가한 아티스트 목록을 보여주는 섹션.
 * follows 테이블을 조회하여 follower_id = userId 인 following_id 목록의 프로필 카드를 표시합니다.
 */
export default function UserFollowingSection({ userId }: UserFollowingSectionProps) {
  const [profiles, setProfiles] = useState<FollowedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchFollowing = async () => {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)

      if (followError || !followData?.length) {
        setProfiles([])
        setLoading(false)
        return
      }

      const followingIds = followData.map((r) => r.following_id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, bio, role')
        .in('id', followingIds)

      if (profileError) {
        setProfiles([])
      } else {
        setProfiles((profileData as FollowedProfile[]) ?? [])
      }
      setLoading(false)
    }
    fetchFollowing()
  }, [userId])

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">이웃</h3>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
            <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            아직 이웃으로 추가한 아티스트가 없습니다.
          </div>
        ) : (
          <ul className="space-y-2">
            {profiles.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/profile/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#8E86F5]/30 hover:bg-[#8E86F5]/5 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 truncate">
                      {p.full_name ?? '이름 없음'}
                    </p>
                    {p.role && (
                      <p className="text-xs text-[#8E86F5] mt-0.5">{p.role}</p>
                    )}
                    {p.bio && (
                      <p className="text-sm text-gray-500 truncate mt-0.5">{p.bio}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
