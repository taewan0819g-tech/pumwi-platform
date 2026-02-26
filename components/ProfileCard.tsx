'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { User } from 'lucide-react'
import type { Profile } from '@/types/profile'
import ArtistApplyModal from '@/components/profile/ArtistApplyModal'
import CollectorApplyModal from '@/components/profile/CollectorApplyModal'
import { Link } from '@/i18n/navigation'

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | null

interface ProfileCardProps {
  profile: Profile | null
  userEmail?: string | null
  /** Artist application status. pending: Under Review, rejected/null: show Apply button */
  applicationStatus?: ApplicationStatus
}

export default function ProfileCard({ profile, userEmail, applicationStatus }: ProfileCardProps) {
  const router = useRouter()
  const t = useTranslations('sidebar')
  const tProfile = useTranslations('profile')
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [collectorModalOpen, setCollectorModalOpen] = useState(false)
  // Show "Under Review" immediately after submit, before router.refresh() completes
  const [justSubmittedPending, setJustSubmittedPending] = useState(false)
  const [justSubmittedCollectorPending, setJustSubmittedCollectorPending] = useState(false)

  // Clear optimistic state when server says rejected or already artist
  useEffect(() => {
    if (applicationStatus === 'rejected' || profile?.role === 'artist') {
      setJustSubmittedPending(false)
    }
  }, [applicationStatus, profile?.role])

  // Clear collector optimistic state when role is no longer pending_collector
  useEffect(() => {
    if (profile?.role !== 'pending_collector') {
      setJustSubmittedCollectorPending(false)
    }
  }, [profile?.role])

  const effectiveRole = profile?.role ?? 'user'
  const effectivePending =
    justSubmittedPending ||
    (applicationStatus !== undefined
      ? applicationStatus === 'pending'
      : (profile?.is_artist_pending ?? false)) ||
    profile?.role === 'pending_artist'
  const isCollectorPending =
    profile?.role === 'pending_collector' || justSubmittedCollectorPending
  const displayName =
    profile?.full_name ||
    (profile?.bio && profile.bio.split('\n')[0]?.slice(0, 20)) ||
    userEmail?.split('@')[0] ||
    'User'

  if (!profile) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="relative h-14 bg-[#8E86F5]/20" />
        <div className="relative px-4 pb-4">
          <div
            className="absolute -top-8 left-4 w-16 h-16 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm"
            style={{ backgroundColor: '#f1f5f9' }}
          >
            <User className="h-8 w-8 text-gray-400" />
          </div>
          <div className="pt-10">
            <h3 className="font-semibold text-slate-900 truncate">
              {userEmail?.split('@')[0] || 'User'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">User</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <Link
        href="/profile"
        className="block cursor-pointer hover:bg-slate-50/80 transition-colors"
        aria-label="Go to my profile"
      >
        <div className="relative h-14 bg-[#8E86F5]/20" />
        <div className="relative px-4 pb-4">
          <div
            className="absolute -top-8 left-4 w-16 h-16 rounded-full border-2 border-white bg-white flex items-center justify-center overflow-hidden shadow-sm"
            style={{ backgroundColor: '#f1f5f9' }}
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="pt-10">
            <h3 className="font-semibold text-slate-900 truncate">
              {displayName}
            </h3>
            {effectiveRole === 'artist' ? (
              <span
                className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full text-[#8E86F5] bg-[#8E86F5]/10"
              >
                {tProfile('role_master')}
              </span>
            ) : effectiveRole === 'collector' ? (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full text-slate-600 bg-slate-100">
                Collector
              </span>
            ) : (
              <p className="text-xs text-gray-500 mt-1">User</p>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-600 line-clamp-2 mt-2 mb-4">
                {profile.bio}
              </p>
            )}
            {(effectiveRole === 'user' || effectiveRole === 'pending_collector') && (
              <div className="mt-2 space-y-2">
                {effectiveRole === 'user' && (
                  <>
                    {effectivePending ? (
                      <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
                        <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" aria-hidden />
                        검토 중 (Under Review)
                      </p>
                    ) : (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          profile?.id && setApplyModalOpen(true)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            e.stopPropagation()
                            profile?.id && setApplyModalOpen(true)
                          }
                        }}
                        className="block w-full py-2 px-4 text-sm font-medium text-white rounded-md transition-opacity hover:opacity-90 text-center"
                        style={{ backgroundColor: '#8E86F5' }}
                      >
                        {t('apply_button')}
                      </span>
                    )}
                  </>
                )}
                {isCollectorPending ? (
                  <p className="text-sm text-amber-600 font-medium flex items-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" aria-hidden />
                    검토 중 (Under Review)
                  </p>
                ) : effectiveRole === 'user' ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setCollectorModalOpen(true)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        e.stopPropagation()
                        setCollectorModalOpen(true)
                      }
                    }}
                    className="block w-full py-2 px-4 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 text-center border border-slate-200"
                  >
                    {t('apply_collector_button')}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Link>
      {profile?.id && (
        <>
          <ArtistApplyModal
            open={applyModalOpen}
            onClose={() => setApplyModalOpen(false)}
            userId={profile.id}
            onSuccess={() => {
              setJustSubmittedPending(true)
              router.refresh()
            }}
          />
          <CollectorApplyModal
            open={collectorModalOpen}
            onClose={() => setCollectorModalOpen(false)}
            onSuccess={() => {
              setJustSubmittedCollectorPending(true)
              router.refresh()
            }}
          />
        </>
      )}
    </div>
  )
}
