'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import Link from '@/i18n/navigation'
import { Search, User } from 'lucide-react'
import { useTranslations } from 'next-intl'

const DARK_BG = 'radial-gradient(circle at 50% 0%, #1a1a1d 0%, #0A0A0B 50%, #0A0A0B 100%)'

export interface SearchResultRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  cover_url?: string | null
  role: string | null
  bio: string | null
  city?: string | null
  country?: string | null
}

const FILTER_OPTIONS = [
  { key: 'all', labelKey: 'filter_all' as const },
  { key: 'artist', labelKey: 'filter_artists' as const },
]

export default function SearchPageClient({
  initialQ,
  results,
}: {
  initialQ: string
  results: SearchResultRow[]
}) {
  const t = useTranslations('search')
  const router = useRouter()
  const [q, setQ] = useState(initialQ)
  const [filter, setFilter] = useState<'all' | 'artist'>('all')

  const filtered =
    filter === 'artist'
      ? results.filter((r) => r.role === 'artist')
      : results

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = q.trim()
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <div
      className="min-h-screen w-full font-serif antialiased"
      style={{
        background: DARK_BG,
        fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif',
      }}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
        {/* Search bar — 메인과 동일한 다크 스타일 */}
        <form onSubmit={handleSubmit} className="w-full max-w-xl mb-8">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-white/40 pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('placeholder')}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white/90 placeholder:text-white/50 focus:outline-none focus:border-[#8E86F5]/60 focus:ring-1 focus:ring-[#8E86F5]/30 text-sm transition-colors"
            />
            <button
              type="submit"
              className="ml-2 px-4 py-3 rounded-lg text-sm font-medium text-white bg-[#8E86F5] hover:opacity-95 transition-opacity border border-[#8E86F5]/50"
            >
              {t('submit')}
            </button>
          </div>
        </form>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 mb-8">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setFilter(opt.key as 'all' | 'artist')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                filter === opt.key
                  ? 'bg-[#8E86F5]/20 border-[#8E86F5]/50 text-white/90'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>

        {/* Results */}
        {!initialQ.trim() ? (
          <p className="text-white/50 text-sm">{t('enter_term')}</p>
        ) : filtered.length === 0 ? (
          <p className="text-white/60 font-medium py-12">{t('no_results')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((user) => (
              <Link
                key={user.id}
                href={`/artist/${user.id}`}
                className="group block rounded-xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-[#8E86F5]/30 transition-all"
              >
                {/* 상단 70%: 이미지 */}
                <div className="aspect-[4/3] bg-white/5 flex items-center justify-center overflow-hidden">
                  {user.cover_url ? (
                    <img
                      src={user.cover_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 text-white/30">
                      <User className="w-12 h-12" />
                      <span className="text-xs font-medium">PUMWI</span>
                    </div>
                  )}
                </div>
                {/* 하단 30%: 다크 배경 + 텍스트 */}
                <div className="p-4 bg-[#0a0a0b]/95 border-t border-white/5">
                  <p className="font-semibold text-white/95 truncate">
                    {user.full_name ?? '—'}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-white/60">
                    {user.city && <span>{user.city}</span>}
                    {user.country && <span>{user.country}</span>}
                    {user.role === 'artist' && (
                      <span className="text-[#8E86F5]/90">{t('badge_artist')}</span>
                    )}
                  </div>
                  {user.bio && (
                    <p className="text-xs text-white/50 line-clamp-2 mt-1.5">{user.bio}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
