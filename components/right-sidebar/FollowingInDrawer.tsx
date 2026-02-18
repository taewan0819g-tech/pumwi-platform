'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Link } from '@/i18n/navigation'
import { User, X } from 'lucide-react'

const DISPLAY_LIMIT = 5

interface FollowedProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface FollowingInDrawerProps {
  currentUserId: string | null
  onCloseDrawer?: () => void
}

export default function FollowingInDrawer({ currentUserId, onCloseDrawer }: FollowingInDrawerProps) {
  const t = useTranslations('more')
  const [profiles, setProfiles] = useState<FollowedProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [viewAllOpen, setViewAllOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!currentUserId) {
      setProfiles([])
      setLoading(false)
      return
    }
    const fetchFollowing = async () => {
      const { data: followData, error: followError } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId)

      if (followError || !followData?.length) {
        setProfiles([])
        setLoading(false)
        return
      }

      const followingIds = followData.map((r) => r.following_id)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', followingIds)

      if (profileError) {
        setProfiles([])
      } else {
        setProfiles((profileData as FollowedProfile[]) ?? [])
      }
      setLoading(false)
    }
    fetchFollowing()
  }, [currentUserId])

  const displayed = profiles.slice(0, DISPLAY_LIMIT)
  const hasMore = profiles.length > DISPLAY_LIMIT

  const renderRow = (p: FollowedProfile) => (
    <Link
      key={p.id}
      href={`/profile/${p.id}`}
      onClick={onCloseDrawer}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-[#8E86F5]/30 hover:bg-[#8E86F5]/5 transition-colors touch-manipulation"
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
      <span className="font-medium text-slate-900 truncate flex-1 min-w-0">
        {p.full_name ?? 'Unknown'}
      </span>
    </Link>
  )

  return (
    <>
      <section className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm" aria-labelledby="following-drawer-heading">
        <h3 id="following-drawer-heading" className="flex items-center gap-2 text-[13px] font-bold text-gray-900 mb-3">
          <User className="h-4 w-4 shrink-0 text-[#8E86F5]" aria-hidden />
          {t('following')}
        </h3>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">{t('following_empty')}</p>
        ) : (
          <>
            <ul className="space-y-2">
              {displayed.map((p) => renderRow(p))}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => setViewAllOpen(true)}
                className="mt-2 w-full rounded-md py-3 text-center text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 touch-manipulation min-h-[44px]"
              >
                {t('view_all')}
              </button>
            )}
          </>
        )}
      </section>

      {viewAllOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="following-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 cursor-default"
            onClick={() => setViewAllOpen(false)}
            aria-label="Close modal"
          />
          <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0 border-b border-gray-100 px-5 py-4">
              <h2 id="following-modal-title" className="text-lg font-bold text-gray-900">
                {t('following')}
              </h2>
              <button
                type="button"
                onClick={() => setViewAllOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
              {profiles.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">{t('following_empty')}</p>
              ) : (
                <ul className="space-y-2">
                  {profiles.map((p) => renderRow(p))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
