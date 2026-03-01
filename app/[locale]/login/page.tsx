'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { motion, useInView } from 'framer-motion'
import { Playfair_Display, Noto_Serif_KR } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const notoSerifKR = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-noto-serif-kr', display: 'swap' })

const RICH_BLACK = '#0A0A0B'
const BRAND_PURPLE = '#8B5CF6'
const DEEP_GREEN = '#2D5A27'
const OFF_WHITE = '#F3F4F6'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const t = useTranslations('auth.form')
  const tAuth = useTranslations('auth')
  const tLogin = useTranslations('loginPage')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  const quotaRef = useRef(null)
  const founderRef = useRef(null)
  const isQuotaInView = useInView(quotaRef, { once: true, margin: '-100px' })
  const isFounderInView = useInView(founderRef, { once: true, margin: '-100px' })

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(`/${locale}`)
        return
      }
      setAuthChecked(true)
    })
  }, [router, locale])

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }
      await new Promise((r) => setTimeout(r, 600))
      window.location.href = `/${locale}`
    } catch {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  const signupHref = pathname?.replace(/\/login\/?$/, '/signup') || `/${locale}/signup`

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 0%, #1a1a1d 0%, #0A0A0B 100%)' }}>
        <div className="w-8 h-8 border border-[#F3F4F6]/30 border-t-[#F3F4F6] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main
      style={{
        fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif',
        background: 'radial-gradient(circle at 50% 0%, #1a1a1d 0%, #0A0A0B 50%, #0A0A0B 100%)',
        position: 'relative',
      }}
      className={`${playfair.variable} ${notoSerifKR.variable} min-h-screen antialiased font-serif overflow-x-hidden`}
    >
      {/* Subtle noise overlay for texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      {/* 1. Hero & The Gate */}
      <section className="relative z-10 min-h-screen flex flex-col lg:flex-row border-b border-white/5">
        <div className="flex-[1.2] flex flex-col justify-center px-8 lg:px-24 py-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-3xl md:text-5xl lg:text-6xl leading-[1.2] font-normal tracking-tighter text-white/90"
            style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}
          >
            {tLogin('hero_tagline')}
          </motion.h1>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 lg:px-20 py-20 bg-white/[0.02] backdrop-blur-sm">
          <div className="max-w-sm w-full mx-auto pt-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="text-red-400/90 text-sm py-2 px-3 border border-red-400/20 rounded-sm">
                  {error}
                </div>
              )}
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('email_placeholder')}
                className="w-full bg-transparent border-b border-white/10 py-3 text-white/90 placeholder:text-white/50 focus:outline-none transition-all focus:border-[#8B5CF6]/70"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-transparent border-b border-white/10 py-3 text-white/90 placeholder:text-white/50 focus:outline-none transition-all focus:border-[#8B5CF6]/70"
              />
              <motion.button
                type="submit"
                disabled={loading}
                className="w-full py-4 text-white font-normal transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
                style={{ backgroundColor: '#2D5A27' }}
                whileHover={loading ? undefined : { backgroundColor: '#3d6b35', boxShadow: '0 0 20px rgba(45, 90, 39, 0.2)' }}
                whileTap={loading ? undefined : { scale: 0.99 }}
              >
                {loading ? t('signing_in') : 'Unlock Heritage'}
              </motion.button>
            </form>

            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="relative w-full py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-[#0A0A0B] px-3 text-white/40">{tAuth('or')}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 py-3 border border-white/10 hover:bg-white/5 transition-all text-sm font-normal text-white/80"
              >
                <GoogleIcon className="flex-shrink-0" /> {tAuth('google_button')}
              </button>
              <Link href={signupHref} className="text-xs text-white/50 hover:text-white/90 transition-all underline underline-offset-4">
                {t('join_link')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Strict Quota */}
      <section ref={quotaRef} className="relative z-10 min-h-[60vh] flex items-center justify-center px-8">
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: isQuotaInView ? 1 : 0, y: isQuotaInView ? 0 : 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-lg md:text-2xl text-white/70 font-light text-center max-w-2xl leading-relaxed whitespace-pre-line"
          style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}
        >
          {tLogin('quota_text')}
        </motion.p>
      </section>

      {/* 3. Founder's Curation */}
      <section ref={founderRef} className="relative z-10 py-32 lg:py-48 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: isFounderInView ? 1 : 0, x: isFounderInView ? 0 : -30 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="aspect-[4/5] max-h-[560px] bg-white/5 border border-white/10 flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-1000"
          >
            <span className="text-[10px] text-white/25 tracking-[0.25em] uppercase">Image</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: isFounderInView ? 1 : 0, x: isFounderInView ? 0 : 30 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}
          >
            <h2 className="text-2xl md:text-4xl leading-tight mb-8 text-white/90 font-normal whitespace-pre-line">
              {tLogin('founder_title')}
            </h2>
            <p className="text-white/60 leading-relaxed text-sm md:text-base">
              {tLogin('founder_desc')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* 4. Footer */}
      <footer className="relative z-10 py-20 border-t border-white/5 text-center">
        <h2 className="text-2xl tracking-[0.5em] font-light mb-6 text-[#8B5CF6]" style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}>
          P U M W I
        </h2>
        <p
          className="text-[10px] uppercase tracking-widest mb-10 text-green-700/80 animate-pulse"
          style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}
        >
          Currently discovering in Korea and Japan.
        </p>
        <div className="space-y-2 text-[11px] text-white/60" style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}>
          <p>© 2026 PUMWI. All rights reserved.</p>
          <a href="mailto:concierge@pumwi.com" className="block text-luxury-gold-muted hover:text-luxury-gold transition-all">
            concierge@pumwi.com
          </a>
        </div>
      </footer>
    </main>
  )
}
