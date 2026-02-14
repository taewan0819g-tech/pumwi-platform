'use client'

import { useState, useCallback } from 'react'
import PostInput from '@/components/PostInput'
import Feed from '@/components/Feed'
import type { Profile } from '@/types/profile'
import { useAuth } from '@/components/providers/AuthProvider'
import { isExhibitionAdminEmail } from '@/lib/exhibition-admin'

interface HomeCenterColumnProps {
  userId: string
  profile: Profile | null
}

export default function HomeCenterColumn({ userId, profile }: HomeCenterColumnProps) {
  const { user } = useAuth()
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const handlePostCreated = useCallback(() => {
    setRefreshTrigger((t) => t + 1)
  }, [])

  const isArtist = profile?.role === 'artist'
  const isAdminByRole = profile?.role === 'admin'
  const isExhibitionAdmin = isExhibitionAdminEmail(user?.email)
  const showComposer = isArtist || isAdminByRole || isExhibitionAdmin

  return (
    <div className="space-y-4">
      {showComposer && (
        <PostInput
          userId={userId}
          profile={profile}
          isExhibitionAdmin={isExhibitionAdmin || isAdminByRole}
          onPostCreated={handlePostCreated}
        />
      )}
      <Feed refreshTrigger={refreshTrigger} />
    </div>
  )
}
