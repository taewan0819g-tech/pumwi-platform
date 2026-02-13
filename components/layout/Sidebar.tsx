'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Package, ClipboardList, Sparkles, MessageSquare, MessageSquareText, BookOpen, LineChart } from 'lucide-react'
import type { Profile } from '@/types/profile'
import ProfileCard from '@/components/ProfileCard'

const ARTISAN_OS_MENU = [
  { label: 'Command Center', href: '/artisan-os', icon: Home },
  { label: 'Orders & Stock', href: '/artisan-os/orders', icon: Package },
  { label: 'Operations Log', href: '/artisan-os/logs', icon: ClipboardList },
  { label: 'Commissions', href: '/artisan-os/commissions', icon: MessageSquareText },
  { label: 'Marketing', href: '/artisan-os/marketing', icon: Sparkles },
  { label: 'CS Master', href: '/artisan-os/cs', icon: MessageSquare },
  { label: 'Command Playbook', href: '/artisan-os/playbook', icon: BookOpen },
  { label: 'Insights', href: '/artisan-os/insights', icon: LineChart },
] as const

interface SidebarProps {
  user: { id: string; email?: string | null } | null
  profile: Profile | null
  userEmail?: string | null
  applicationStatus?: 'pending' | 'approved' | 'rejected' | null
}

export default function Sidebar({ user, profile, userEmail, applicationStatus }: SidebarProps) {
  const pathname = usePathname()

  // 핵심 수정: col-span-3과 order-1/2 같은 레이아웃 클래스를 모두 제거했습니다.
  return (
    <div className="flex flex-col gap-4 w-full">
      {user ? (
        <>
          <ProfileCard profile={profile} userEmail={userEmail} applicationStatus={applicationStatus} />
          {profile?.role === 'artist' && (
            <div className="mt-4 px-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-2">Artisan OS</p>
              <nav className="space-y-1">
                {ARTISAN_OS_MENU.map(({ label, href, icon: Icon }) => {
                  const isActive = pathname === href
                  return (
                    <Link key={href} href={href} className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-[#2F5D50]/10 text-[#2F5D50]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#2F5D50]'}`}>
                      <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-[#2F5D50]' : 'text-gray-400 group-hover:text-[#2F5D50]'}`} />
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
          <p className="text-slate-700 mb-4">Sign in to view your profile</p>
          <Link href="/login" className="inline-block py-2 px-4 text-sm font-medium text-white rounded-md bg-[#8E86F5]">Sign In</Link>
        </div>
      )}
    </div>
  )
}