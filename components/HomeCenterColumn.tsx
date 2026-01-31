'use client'

import { useState, useCallback } from 'react'
import PostInput from '@/components/PostInput'
import Feed from '@/components/Feed'
import type { Profile } from '@/types/profile'

interface HomeCenterColumnProps {
  userId: string
  profile: Profile | null
}

export default function HomeCenterColumn({ userId, profile }: HomeCenterColumnProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const handlePostCreated = useCallback(() => {
    setRefreshTrigger((t) => t + 1)
  }, [])

  const isArtist = profile?.role === 'artist'

  return (
    <div className="space-y-4">
      {isArtist && (
        <PostInput userId={userId} onPostCreated={handlePostCreated} />
      )}
      <Feed refreshTrigger={refreshTrigger} />
    </div>
  )
}
