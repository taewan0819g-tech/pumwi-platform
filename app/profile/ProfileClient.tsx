'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from 'react-hot-toast'
import { Tabs } from '@/components/ui/Tabs'
import ProfileHeader from '@/components/profile/ProfileHeader'
import { Button } from '@/components/ui/Button'
import ValuePhilosophySection from '@/components/profile/ValuePhilosophySection'
import ExperienceSection from '@/components/profile/ExperienceSection'
import PostsSection from '@/components/profile/PostsSection'
import RecommendationsSection from '@/components/profile/RecommendationsSection'
import UserCollectionSection from '@/components/profile/user/UserCollectionSection'
import UserFollowingSection from '@/components/profile/user/UserFollowingSection'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types/profile'

const ARTIST_TABS = [
  { value: 'home', label: 'Home' },
  { value: 'work_log', label: 'Studio Log' },
  { value: 'sales', label: 'Works for Sale' },
  { value: 'info', label: 'About' },
]

const USER_TABS = [
  { value: 'collection', label: 'Collection' },
  { value: 'following', label: 'Following' },
]

function defaultProfile(uid: string): Profile {
  return {
    id: uid,
    full_name: null,
    avatar_url: null,
    cover_url: null,
    background_url: null,
    bio: null,
    value_philosophy: null,
    studio_location: null,
    role: 'user',
    is_artist_pending: false,
  }
}

interface ProfileClientProps {
  serverUser: SupabaseUser
  /** 타인 프로필 보기 시 서버에서 가져온 프로필 (없으면 내 프로필) */
  initialProfile?: Profile | null
}

export default function ProfileClient({ serverUser, initialProfile }: ProfileClientProps) {
  const user = serverUser
  const [profile, setProfile] = useState<Profile | null>(initialProfile ?? null)
  const [loading, setLoading] = useState(!initialProfile)
  const [activeTab, setActiveTab] = useState('home')

  useEffect(() => {
    if (initialProfile != null) {
      setProfile(initialProfile)
      setLoading(false)
      return
    }
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        if (error) {
          setProfile(defaultProfile(user.id))
        } else {
          setProfile(data != null ? (data as unknown as Profile) : defaultProfile(user.id))
        }
      } catch {
        setProfile(defaultProfile(user.id))
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [user?.id, initialProfile])

  const profileUserId = initialProfile?.id ?? user.id
  const profileToUse = profile ?? defaultProfile(profileUserId)
  const isOwn = user.id === profileToUse.id
  const isArtistProfile = profileToUse.role === 'artist'
  const tabs = isArtistProfile ? ARTIST_TABS : USER_TABS
  const validUserTab = activeTab === 'collection' || activeTab === 'following'

  useEffect(() => {
    if (!loading && !isArtistProfile && !validUserTab) {
      setActiveTab('collection')
    }
  }, [loading, isArtistProfile, validUserTab, activeTab])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F2EF] p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="h-10 animate-pulse bg-gray-100" />
            <div className="p-6 space-y-4">
              <div className="h-20 animate-pulse rounded bg-gray-100" />
              <div className="h-20 animate-pulse rounded bg-gray-100" />
              <div className="h-20 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#8E86F5] border-t-transparent" />
            <p className="mt-3 text-sm font-medium text-slate-600">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-12">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <ProfileHeader
          profile={profileToUse}
          userEmail={profileToUse.id === user.id ? (user.email ?? '') : ''}
          isOwn={isOwn}
          onUpdate={setProfile}
          currentUserId={user.id}
        />

        {isOwn && profileToUse.role === 'admin' && (
          <div className="mt-4">
            <Link href="/admin/applications">
              <Button variant="outline" className="w-full sm:w-auto">
                Artist applications
              </Button>
            </Link>
          </div>
        )}

        <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            tabs={tabs}
          />
          <div className="p-4 sm:p-6">
            {isArtistProfile ? (
              <>
                {activeTab === 'home' && (
                  <div className="space-y-6">
                    <ValuePhilosophySection
                      profile={profileToUse}
                      isOwn={isOwn}
                      onUpdate={setProfile}
                    />
                    <ExperienceSection userId={profileToUse.id} isOwn={isOwn} />
                    <RecommendationsSection
                      userId={profileToUse.id}
                      currentUserId={user.id}
                      isOwn={isOwn}
                    />
                  </div>
                )}
                {activeTab === 'work_log' && (
                  <PostsSection
                    userId={profileToUse.id}
                    isOwn={isOwn}
                    tab="work_log"
                  />
                )}
                {activeTab === 'sales' && (
                  <PostsSection
                    userId={profileToUse.id}
                    isOwn={isOwn}
                    tab="sales"
                  />
                )}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    <ValuePhilosophySection
                      profile={profileToUse}
                      isOwn={isOwn}
                      onUpdate={setProfile}
                    />
                    <ExperienceSection userId={profileToUse.id} isOwn={isOwn} />
                    <RecommendationsSection
                      userId={profileToUse.id}
                      currentUserId={user.id}
                      isOwn={isOwn}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                {activeTab === 'collection' && <UserCollectionSection />}
                {activeTab === 'following' && (
                  <UserFollowingSection userId={profileToUse.id} />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
