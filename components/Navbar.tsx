'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setDropdownOpen(false)
    try {
      await fetch('/auth/signout', { method: 'POST', redirect: 'manual' })
    } finally {
      router.refresh()
      window.location.href = '/login'
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
            title="PUMWI 홈"
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
              placeholder="검색..."
              className="w-full h-8 pl-9 pr-9 bg-slate-100 border-0 rounded-md text-sm placeholder:text-gray-500 focus:ring-2 focus:ring-[#8E86F5] focus:bg-white outline-none transition"
            />
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-500 hover:text-[#8E86F5] hover:bg-slate-200/80 transition-colors disabled:opacity-40 disabled:pointer-events-none"
              title="검색"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          {user ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/"
                className="flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
              >
                <Home className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  홈
                </span>
              </Link>
              <Link
                href="/neighbors"
                className="flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
              >
                <Users className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  이웃
                </span>
              </Link>
              <Link
                href="/chat"
                className="flex flex-col items-center justify-center min-w-[52px] sm:min-w-[64px] h-12 py-1 rounded hover:bg-slate-100 transition-colors text-gray-700"
              >
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
                <span className="text-[10px] sm:text-xs mt-0.5 hidden xs:block">
                  메시지
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
                    나
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
                      프로필 보기
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-slate-50"
                    >
                      <LogOut className="h-4 w-4" />
                      로그아웃
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
                로그인
              </Link>
              <Link
                href="/signup"
                className="px-3 py-1.5 text-sm text-white rounded-md transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#8E86F5' }}
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
