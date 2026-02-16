'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import ValuePropositionSection from '@/components/auth/ValuePropositionSection'
import { Dialog } from '@/components/ui/Dialog'
import { Check } from 'lucide-react'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const t = useTranslations('signup')
  const tAuth = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/')
        return
      }
      setAuthChecked(true)
    })
  }, [router])

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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { marketing_consent: marketingConsent },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // 성공 시 환영 메시지 표시
      setSuccess(true)
      setLoading(false)

      // 2초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setError(t('registration_failed'))
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8E86F5] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">{t('checking')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/80 flex flex-col lg:flex-row lg:items-center lg:justify-center lg:gap-16 xl:gap-24 px-4 py-10 lg:py-12">
      {/* Value proposition: left on desktop, below form on mobile */}
      <div className="order-2 lg:order-1 lg:max-w-md xl:max-w-lg">
        <ValuePropositionSection />
      </div>

      {/* Join card: focal point */}
      <div className="order-1 lg:order-2 w-full max-w-md flex-shrink-0 lg:flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold" style={{ color: '#8E86F5' }}>
              PUMWI
            </h1>
            <p className="text-gray-600 mt-2">Where Art Meets Value</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {t('welcome_redirect')}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none transition"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters.
              </p>
            </div>

            {/* Terms of Service (required) */}
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  termsAgreed ? 'bg-[#2F5D50] border-[#2F5D50]' : 'border-gray-300 bg-white group-hover:border-[#2F5D50]'
                }`}
              >
                {termsAgreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
              />
              <span className="text-sm text-gray-700">
                {t('terms_agree')}{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowTermsModal(true)
                  }}
                  className="font-medium underline text-left p-0 border-0 bg-transparent cursor-pointer"
                  style={{ color: '#8E86F5' }}
                >
                  {t('terms_link')}
                </button>{' '}
                {t('terms_required')}
              </span>
            </label>

            {/* Marketing consent (optional) */}
            <label className="flex items-start gap-3 cursor-pointer group select-none">
              <div
                className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                  marketingConsent ? 'bg-[#2F5D50] border-[#2F5D50]' : 'border-gray-300 bg-white group-hover:border-[#2F5D50]'
                }`}
              >
                {marketingConsent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
              />
              <span className="text-sm text-gray-600">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowMarketingModal(true)
                  }}
                  className="font-medium underline text-left p-0 border-0 bg-transparent cursor-pointer text-gray-600 hover:opacity-80"
                  style={{ color: '#8E86F5' }}
                >
                  {t('marketing_consent')}
                </button>
              </span>
            </label>

            <button
              type="submit"
              disabled={!termsAgreed || loading || success}
              className="w-full text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:opacity-95"
              style={{ backgroundColor: '#8E86F5' }}
            >
              {loading ? t('joining') : success ? t('welcome_btn') : t('join')}
            </button>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-500">{tAuth('or')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              <GoogleIcon className="flex-shrink-0" />
              {tAuth('google_button')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('already_have_account')}{' '}
              <a
                href="/login"
                className="font-medium hover:opacity-80"
                style={{ color: '#8E86F5' }}
              >
                {t('sign_in')}
              </a>
            </p>
          </div>
        </div>
      </div>

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
    </div>
  )
}
