'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import type { Profile } from '@/types/profile'
import ProfileCard from '@/components/ProfileCard'

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | null

interface SidebarProps {
  /** Show profile and AI card only when user is signed in */
  user: { id: string; email?: string | null } | null
  profile: Profile | null
  userEmail?: string | null
  applicationStatus?: ApplicationStatus
}

export default function Sidebar({
  user,
  profile,
  userEmail,
  applicationStatus,
}: SidebarProps) {
  return (
    <aside className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-4">
      {/* Shown when signed in */}
      {user ? (
        <>
          <ProfileCard
            profile={profile}
            userEmail={userEmail}
            applicationStatus={applicationStatus}
          />
          <Link
            href="/request"
            className="block rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#F3F2EF]"
            style={{
              background: 'linear-gradient(135deg, #2d1b4e 0%, #1a0a2e 50%, #0f0620 100%)',
            }}
          >
            <div className="p-4 flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  Request Commission
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  Get Curation
                </p>
              </div>
            </div>
          </Link>
        </>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
          <p className="text-slate-700 mb-4">
            Sign in to view your profile
          </p>
          <Link
            href="/login"
            className="inline-block py-2 px-4 text-sm font-medium text-white rounded-md hover:opacity-90"
            style={{ backgroundColor: '#8E86F5' }}
          >
            Sign In
          </Link>
        </div>
      )}
    </aside>
  )
}
