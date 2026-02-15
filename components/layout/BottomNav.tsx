'use client'

import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/i18n/navigation'
import { Home, Users, MessageSquare, LayoutGrid, UserCircle } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface BottomNavProps {
  user: SupabaseUser | null
  unreadMessageCount: number
  onOpenRightDrawer: () => void
}

export default function BottomNav({ user, unreadMessageCount, onOpenRightDrawer }: BottomNavProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const isMessagesActive = pathname === '/messages'
  const isHomeActive = pathname === '/'
  const isNeighborsActive = pathname === '/neighbors'
  const isProfileActive = pathname === '/profile'

  if (!user) return null

  return (
    <div className="flex lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
      <div className="grid grid-cols-5 w-full max-w-lg mx-auto">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center py-3 px-2 rounded transition-colors ${
            isHomeActive ? 'text-[#2F5D50]' : 'text-gray-600 hover:text-[#2F5D50]'
          }`}
        >
          <Home className="h-6 w-6 flex-shrink-0" />
          <span className="text-[10px] mt-1 truncate w-full text-center">{t('home')}</span>
        </Link>
        <Link
          href="/neighbors"
          className={`flex flex-col items-center justify-center py-3 px-2 rounded transition-colors ${
            isNeighborsActive ? 'text-[#2F5D50]' : 'text-gray-600 hover:text-[#2F5D50]'
          }`}
        >
          <Users className="h-6 w-6 flex-shrink-0" />
          <span className="text-[10px] mt-1 truncate w-full text-center">{t('following')}</span>
        </Link>
        <Link
          href="/messages"
          className={`relative flex flex-col items-center justify-center py-3 px-2 rounded transition-colors ${
            isMessagesActive ? 'text-[#2F5D50]' : 'text-gray-600 hover:text-[#2F5D50]'
          }`}
          title={t('messages')}
        >
          <MessageSquare className="h-6 w-6 flex-shrink-0" />
          {unreadMessageCount > 0 && (
            <span
              className="absolute top-2 right-1/4 min-w-[8px] h-2 rounded-full bg-red-500 ring-2 ring-white"
              aria-label={`${unreadMessageCount} unread`}
            />
          )}
          <span className="text-[10px] mt-1 truncate w-full text-center">{t('messages')}</span>
        </Link>
        <button
          type="button"
          onClick={onOpenRightDrawer}
          className="flex flex-col items-center justify-center py-3 px-2 rounded transition-colors text-gray-600 hover:text-[#2F5D50]"
          aria-label="Recommendations"
        >
          <LayoutGrid className="h-6 w-6 flex-shrink-0" />
          <span className="text-[10px] mt-1 truncate w-full text-center">More</span>
        </button>
        <Link
          href="/profile"
          className={`flex flex-col items-center justify-center py-3 px-2 rounded transition-colors ${
            isProfileActive ? 'text-[#2F5D50]' : 'text-gray-600 hover:text-[#2F5D50]'
          }`}
        >
          <UserCircle className="h-6 w-6 flex-shrink-0" />
          <span className="text-[10px] mt-1 truncate w-full text-center">{t('me')}</span>
        </Link>
      </div>
    </div>
  )
}
