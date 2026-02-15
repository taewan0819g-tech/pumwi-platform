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
  MessageSquareText,
  UserCircle,
  LogOut,
  Menu,
  X,
  Package,
  ClipboardList,
  Sparkles,
  BookOpen,
  LineChart,
  LayoutGrid,
  Newspaper,
  Plus,
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Profile } from '@/types/profile'
import { createClient } from '@/lib/supabase/client'
import ProfileCard from '@/components/ProfileCard'
import ExhibitionWidget from '@/components/ExhibitionWidget'
import ArtistList from '@/components/ArtistList'
import { isExhibitionAdminEmail } from '@/lib/exhibition-admin'

const ARTISAN_OS_MENU = [
  { labelKey: 'command_center', href: '/artisan-os', icon: Home },
  { labelKey: 'orders_stock', href: '/artisan-os/orders', icon: Package },
  { labelKey: 'operations_log', href: '/artisan-os/logs', icon: ClipboardList },
  { labelKey: 'commissions', href: '/artisan-os/commissions', icon: MessageSquareText },
  { labelKey: 'marketing', href: '/artisan-os/marketing', icon: Sparkles },
  { labelKey: 'cs_master', href: '/artisan-os/cs', icon: MessageSquare },
  { labelKey: 'command_playbook', href: '/artisan-os/playbook', icon: BookOpen },
  { labelKey: 'insights', href: '/artisan-os/insights', icon: LineChart },
] as const

interface NavbarProps {
  user: SupabaseUser | null
}

export default function Navbar({ user }: NavbarProps) {
  const t = useTranslations('nav')
  const tSidebar = useTranslations('sidebar')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false)
  const [mobileProfile, setMobileProfile] = useState<Profile | null>(null)
  const [mobileApplicationStatus, setMobileApplicationStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isMessagesActive = pathname === '/messages'

  useEffect(() => {
    if (!user?.id) {
      setMobileProfile(null)
      setMobileApplicationStatus(null)
      return
    }
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setMobileProfile(data as Profile | null))
    supabase
      .from('artist_applications')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setMobileApplicationStatus(data?.status ?? null))
  }, [user?.id])

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
          {/* Hamburger: mobile only, left of Logo */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden flex-shrink-0 p-2 rounded-md text-gray-600 hover:bg-slate-100 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
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
              {/* Recommendations / Right sidebar toggle: mobile only */}
              <button
                type="button"
                onClick={() => setIsRightDrawerOpen(true)}
                className="xl:hidden flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
                aria-label="Recommendations"
              >
                <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  More
                </span>
              </button>
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

      {/* Mobile drawer (slide-in from left) */}
      {isMobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
            aria-hidden
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="fixed inset-y-0 left-0 z-[70] w-[280px] max-w-[85vw] bg-white shadow-xl overflow-y-auto lg:hidden transition-transform"
            role="dialog"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <span className="font-semibold text-slate-900">{tSidebar('title')}</span>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-slate-100"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {user ? (
                <>
                  <ProfileCard
                    profile={mobileProfile}
                    userEmail={user.email ?? null}
                    applicationStatus={mobileApplicationStatus}
                  />
                  {mobileProfile?.role === 'artist' && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-2">{tSidebar('title')}</p>
                      <nav className="space-y-1">
                        {ARTISAN_OS_MENU.map(({ labelKey, href, icon: Icon }) => {
                          const isActive = pathname === href
                          return (
                            <Link
                              key={href}
                              href={href}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-[#2F5D50]/10 text-[#2F5D50]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#2F5D50]'}`}
                            >
                              <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-[#2F5D50]' : 'text-gray-400 group-hover:text-[#2F5D50]'}`} />
                              <span>{tSidebar(labelKey)}</span>
                            </Link>
                          )
                        })}
                      </nav>
                    </div>
                  )}
                  {mobileProfile?.role === 'admin' && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-2">{tSidebar('admin')}</p>
                      <nav className="space-y-1">
                        <Link
                          href="/admin/news"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${pathname === '/admin/news' ? 'bg-[#2F5D50]/10 text-[#2F5D50]' : 'text-gray-600 hover:bg-gray-50 hover:text-[#2F5D50]'}`}
                        >
                          <Newspaper className={`mr-3 h-5 w-5 flex-shrink-0 ${pathname === '/admin/news' ? 'text-[#2F5D50]' : 'text-gray-400 group-hover:text-[#2F5D50]'}`} />
                          <span>{tSidebar('newsManagement')}</span>
                        </Link>
                      </nav>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center">
                  <p className="text-slate-700 mb-4">{tSidebar('signInToViewProfile')}</p>
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-block py-2 px-4 text-sm font-medium text-white rounded-md bg-[#8E86F5]"
                  >
                    {t('signIn')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Right drawer: Recommendations (Exhibitions + Artists) - mobile only */}
      {isRightDrawerOpen && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 xl:hidden"
            aria-hidden
            onClick={() => setIsRightDrawerOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-[70] w-[320px] max-w-[90vw] bg-white shadow-xl overflow-y-auto xl:hidden flex flex-col"
            role="dialog"
            aria-label="Recommendations"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
              <span className="font-semibold text-slate-900">{tSidebar('featuredArtists')}</span>
              <button
                type="button"
                onClick={() => setIsRightDrawerOpen(false)}
                className="p-2 rounded-md text-gray-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-6 overflow-y-auto flex-1">
              {user && isExhibitionAdminEmail(user.email) && (
                <Link
                  href="/?create=pumwi_exhibition"
                  onClick={() => setIsRightDrawerOpen(false)}
                  className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#2F5D50' }}
                >
                  <Plus className="h-4 w-4" />
                  New Exhibition
                </Link>
              )}
              <ExhibitionWidget />
              <ArtistList />
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
