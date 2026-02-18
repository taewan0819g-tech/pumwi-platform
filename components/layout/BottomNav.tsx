'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Link, usePathname } from '@/i18n/navigation'
import { Home, MapPin, MessageSquare, LayoutGrid, UserCircle, LogOut } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface BottomNavProps {
  user: SupabaseUser | null
  unreadMessageCount: number
  onOpenRightDrawer: () => void
}

export default function BottomNav({ user, unreadMessageCount, onOpenRightDrawer }: BottomNavProps) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [meMenuOpen, setMeMenuOpen] = useState(false)
  const meMenuRef = useRef<HTMLDivElement>(null)
  const isMessagesActive = pathname === '/messages'
  const isHomeActive = pathname === '/'
  const isNearbyActive = pathname === '/nearby'
  const isProfileActive = pathname === '/profile'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (meMenuRef.current && !meMenuRef.current.contains(e.target as Node)) {
        setMeMenuOpen(false)
      }
    }
    if (meMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [meMenuOpen])

  const handleSignOut = async () => {
    setMeMenuOpen(false)
    try {
      await fetch(`/${locale}/auth/signout`, { method: 'POST', redirect: 'manual' })
    } finally {
      router.refresh()
      window.location.href = `/${locale}`
    }
  }

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
          href="/nearby"
          className={`flex flex-col items-center justify-center py-3 px-2 rounded transition-colors ${
            isNearbyActive ? 'text-[#2F5D50]' : 'text-gray-600 hover:text-[#2F5D50]'
          }`}
        >
          <MapPin className="h-6 w-6 flex-shrink-0" />
          <span className="text-[10px] mt-1 truncate w-full text-center">{t('nearby')}</span>
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
        <div className="relative flex flex-col items-center" ref={meMenuRef}>
          <button
            type="button"
            onClick={() => setMeMenuOpen((v) => !v)}
            className={`flex flex-col items-center justify-center w-full py-3 px-2 rounded transition-colors ${
              isProfileActive ? 'text-[#2F5D50]' : 'text-gray-600 hover:text-[#2F5D50]'
            }`}
            aria-label={t('me')}
          >
            <UserCircle className="h-6 w-6 flex-shrink-0" />
            <span className="text-[10px] mt-1 truncate w-full text-center">{t('me')}</span>
          </button>
          {meMenuOpen && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 min-w-[160px] py-1 bg-white rounded-lg border border-gray-200 shadow-lg z-[60]">
              <Link
                href="/profile"
                onClick={() => setMeMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50"
              >
                <UserCircle className="h-4 w-4 shrink-0" />
                {t('viewProfile')}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t('signOut')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
