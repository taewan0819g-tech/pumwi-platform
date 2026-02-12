'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, ClipboardList, Sparkles, MessageSquare } from 'lucide-react'
import type { Profile } from '@/types/profile'
import ProfileCard from '@/components/ProfileCard'

const ARTISAN_OS_MENU = [
  { label: 'Command Center', href: '/artisan-os', icon: Home },
  { label: 'Orders & Stock', href: '/artisan-os/orders', icon: Package },
  { label: 'Operations Log', href: '/artisan-os/logs', icon: ClipboardList },
  { label: 'Marketing', href: '/artisan-os/marketing', icon: Sparkles },
  { label: 'CS Master', href: '/artisan-os/cs', icon: MessageSquare },
] as const

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
  const pathname = usePathname()

  return (
    <aside className="lg:col-span-3 order-2 lg:order-1 flex flex-col gap-4">
      {user ? (
        <>
          <ProfileCard
            profile={profile}
            userEmail={userEmail}
            applicationStatus={applicationStatus}
          />

          {/* Artisan OS Menu Section — only for users with artist role */}
          {profile?.role === 'artist' && (
            <div className="mt-4 px-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-2">
                Artisan OS
              </p>
              <nav className="space-y-1" aria-label="Artisan OS menu">
                {ARTISAN_OS_MENU.map(({ label, href, icon: Icon }) => {
                  const isActive = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-[#2F5D50]/10 text-[#2F5D50]'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-[#2F5D50]'
                      }`}
                    >
                      <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-[#2F5D50]' : 'text-gray-400 group-hover:text-[#2F5D50]'}`} aria-hidden />
                      <span>{label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}
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
