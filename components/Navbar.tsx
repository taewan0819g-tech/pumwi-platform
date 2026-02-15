'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { Link, useRouter, usePathname } from '@/i18n/navigation'
import {
  Search,
  Home,
  Users,
  MessageSquare,
  UserCircle,
  LogOut,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'

interface NavbarProps {
  user: SupabaseUser | null
}

export default function Navbar({ user }: NavbarProps) {
  const t = useTranslations('nav')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isMessagesActive = pathname === '/messages'

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchUnread = () => {
      fetch('/api/messages/unread-count', { credentials: 'include' })
        .then((res) => (res.ok ? res.json() : { count: 0 }))
        .then((data) => setUnreadMessageCount(data?.count ?? 0))
        .catch(() => setUnreadMessageCount(0))
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30_000)
    return () => clearInterval(interval)
  }, [user])

  const handleLogout = async () => {
    setDropdownOpen(false)
    try {
      await fetch(`/${locale}/auth/signout`, { method: 'POST', redirect: 'manual' })
    } finally {
      router.refresh()
      window.location.href = `/${locale}/login`
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12 gap-4">
          <Link
            href="/"
            className="flex-shrink-0 flex items-center justify-center rounded-md px-1 py-1.5 hover:bg-slate-100 transition-colors"
            title="PUMWI Home"
          >
            <span
              className="text-lg sm:text-xl font-bold leading-none tracking-tight"
              style={{ color: '#8E86F5' }}
            >
              PUMWI
            </span>
          </Link>

          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md mx-2 sm:mx-4 relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full h-8 pl-9 pr-9 bg-slate-100 border-0 rounded-md text-sm placeholder:text-gray-500 focus:ring-2 focus:ring-[#8E86F5] focus:bg-white outline-none transition"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-[#8E86F5] hover:bg-slate-200/80 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title={t('search')}
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {/* Language switcher: to the immediate left of User Avatar / Profile */}
          <div className="flex items-center gap-0.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-md p-0.5 shrink-0">
            <Link
              href={pathname}
              locale="ko"
              className={`px-2 py-1 rounded transition-colors ${locale === 'ko' ? 'bg-[#8E86F5] text-white' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              KO
            </Link>
            <span className="text-slate-300 select-none">|</span>
            <Link
              href={pathname}
              locale="en"
              className={`px-2 py-1 rounded transition-colors ${locale === 'en' ? 'bg-[#8E86F5] text-white' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              EN
            </Link>
          </div>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
              >
                <Home className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  {t('home')}
                </span>
              </Link>
              <Link
                href="/neighbors"
                className="flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
              >
                <Users className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  {t('following')}
                </span>
              </Link>
              <Link
                href="/messages"
                className={`relative flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded transition-colors ${
                  isMessagesActive
                    ? 'text-[#2F5D50] bg-[#2F5D50]/10'
                    : 'text-gray-700 hover:text-[#2F5D50] hover:bg-slate-100'
                }`}
                title={t('messages')}
              >
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                {unreadMessageCount > 0 && (
                  <span
                    className="absolute top-1.5 right-1/4 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"
                    aria-label={`${unreadMessageCount} unread`}
                  />
                )}
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  {t('messages')}
                </span>
              </Link>
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen((v) => !v)}
                  className="flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
                >
                  <UserCircle className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                  <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                    {t('me')}
                  </span>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 py-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-slate-50"
                    >
                      <UserCircle className="h-4 w-4" />
                      {t('viewProfile')}
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4" />
                      {t('signOut')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-gray-700 hover:bg-slate-100 rounded-md transition-colors"
              >
                {t('signIn')}
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-sm text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#8E86F5' }}
              >
                {t('join')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
