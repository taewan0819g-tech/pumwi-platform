'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { motion } from 'framer-motion'
import { Playfair_Display, Noto_Serif_KR } from 'next/font/google'
import { Dialog } from '@/components/ui/Dialog'
import { Check } from 'lucide-react'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const notoSerifKR = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-noto-serif-kr', display: 'swap' })

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

export default function SignupPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'
  const t = useTranslations('signup')
  const tAuth = useTranslations('auth')
  const tForm = useTranslations('auth.form')
  const tLogin = useTranslations('loginPage')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    })
  }

  const handleResendVerification = async () => {
    if (!email || resendLoading) return
    setResendLoading(true)
    try {
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (resendError) {
        toast.error(t('resend_error'))
        return
      }
      toast.success(t('resend_success'))
    } finally {
      setResendLoading(false)
    }
  }

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!termsAgreed) {
      setError(t('terms_required_error'))
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const supabase = createClient()
      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/${locale}/welcome`
          : undefined
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { marketing_consent: marketingConsent },
          emailRedirectTo: redirectTo,
        },
      })
      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }
      setSuccess(true)
      setLoading(false)
    } catch {
      setError(t('registration_failed'))
      setLoading(false)
    }
  }

  const loginHref = `/${locale}/login`

  if (!authChecked) {
    return (
      <div className="h-screen min-h-screen flex items-center justify-center" style={{ background: 'radial-gradient(circle at 50% 0%, #1a1a1d 0%, #0A0A0B 100%)' }}>
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
      className={`${playfair.variable} ${notoSerifKR.variable} h-screen min-h-screen antialiased font-serif overflow-hidden flex flex-col`}
    >
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <section className="relative z-10 flex-1 min-h-0 flex flex-col lg:flex-row">
        <div className="flex-[1.2] flex flex-col justify-center px-8 lg:px-24 py-12 lg:py-20">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-3xl md:text-5xl lg:text-6xl leading-[1.25] font-normal tracking-tighter text-white/90 break-keep"
            style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}
          >
            {tLogin('hero_tagline').split('\n').map((line, i, arr) => (
              <span key={i}>
                {line}
                {i < arr.length - 1 ? <br /> : null}
              </span>
            ))}
          </motion.h1>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 lg:px-20 py-12 lg:py-20 bg-white/[0.02] backdrop-blur-sm">
          <div className="max-w-sm w-full mx-auto pt-6">
            {success ? (
              <div className="space-y-6 text-center">
                <div className="rounded-full bg-green-500/20 text-green-400 w-16 h-16 flex items-center justify-center mx-auto border border-green-400/30">
                  <Check className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <h2 className="text-xl font-normal text-white/90" style={{ fontFamily: 'var(--font-noto-serif-kr), var(--font-playfair), Georgia, serif' }}>
                  {t('email_confirm_title')}
                </h2>
                <p className="text-white/60 text-sm leading-relaxed">
                  {t('email_confirm_body')}
                </p>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="w-full py-3 rounded-sm border border-white/10 text-white/80 font-normal hover:bg-white/5 transition-colors disabled:opacity-50 text-sm"
                >
                  {resendLoading ? t('joining') : t('resend_verification')}
                </button>
                <p className="text-xs text-white/50">
                  {t('already_have_account')}{' '}
                  <Link href={loginHref} className="text-white/80 hover:text-white underline underline-offset-4">
                    {t('sign_in')}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSignup} className="space-y-5">
                  {error && (
                    <div className="text-red-400/90 text-sm py-2 px-3 border border-red-400/20 rounded-sm">
                      {error}
                    </div>
                  )}
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={tForm('email_placeholder')}
                    className="w-full bg-transparent border-b border-white/10 py-3 text-white/90 placeholder:text-white/50 focus:outline-none transition-all focus:border-[#8B5CF6]/70"
                  />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-b border-white/10 py-3 text-white/90 placeholder:text-white/50 focus:outline-none transition-all focus:border-[#8B5CF6]/70"
                  />
                  <p className="text-[11px] text-white/40 -mt-2">
                    Password must be at least 6 characters.
                  </p>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        termsAgreed ? 'bg-[#2D5A27] border-[#2D5A27]' : 'border-white/30 bg-transparent group-hover:border-white/50'
                      }`}
                    >
                      {termsAgreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
                    <span className="text-sm text-white/70">
                      {t('terms_agree')}{' '}
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTermsModal(true); }}
                        className="underline text-white/90 hover:text-white"
                      >
                        {t('terms_link')}
                      </button>{' '}
                      {t('terms_required')}
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                        marketingConsent ? 'bg-[#2D5A27] border-[#2D5A27]' : 'border-white/30 bg-transparent group-hover:border-white/50'
                      }`}
                    >
                      {marketingConsent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <input type="checkbox" className="hidden" checked={marketingConsent} onChange={(e) => setMarketingConsent(e.target.checked)} />
                    <span className="text-sm text-white/60">
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMarketingModal(true); }}
                        className="underline text-white/70 hover:text-white"
                      >
                        {t('marketing_consent')}
                      </button>
                    </span>
                  </label>

                  <motion.button
                    type="submit"
                    disabled={!termsAgreed || loading}
                    className="w-full py-4 text-white font-normal transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
                    style={{ backgroundColor: '#2D5A27' }}
                    whileHover={!loading && termsAgreed ? { backgroundColor: '#3d6b35', boxShadow: '0 0 20px rgba(45, 90, 39, 0.2)' } : undefined}
                    whileTap={!loading ? { scale: 0.99 } : undefined}
                  >
                    {loading ? t('joining') : t('join')}
                  </motion.button>
                </form>

                <div className="mt-6 flex flex-col items-center gap-4">
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
                  <Link href={loginHref} className="text-xs text-white/50 hover:text-white/90 transition-all underline underline-offset-4">
                    {t('already_have_account')} {t('sign_in')}
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <Dialog open={showTermsModal} onClose={() => setShowTermsModal(false)} title={t('terms_modal_title')}>
        <div className="p-4">
          <div className="max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{t('terms_modal_content')}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowTermsModal(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
            >
              {t('close_btn')}
            </button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showMarketingModal} onClose={() => setShowMarketingModal(false)} title={t('marketing_modal_title')}>
        <div className="p-4">
          <div className="max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{t('marketing_modal_content')}</p>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowMarketingModal(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
            >
              {t('close_btn')}
            </button>
          </div>
        </div>
      </Dialog>
    </main>
  )
}
