'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import ValuePropositionSection from '@/components/auth/ValuePropositionSection'

export default function LoginPage() {
  const t = useTranslations('auth.form')
  const locale = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // 이미 로그인된 경우 홈으로 (클라이언트 세션 기준)
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace(`/${locale}`)
        return
      }
      setAuthChecked(true)
    })
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      // 쿠키가 브라우저에 반영된 뒤 홈 요청 시 미들웨어·서버가 세션을 인식하도록 잠시 대기 후 전체 새로고침 이동
      await new Promise((r) => setTimeout(r, 600))
      window.location.href = `/${locale}`
    } catch (err) {
      setError('Sign-in failed. Please try again.')
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8E86F5] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Checking...</p>
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

      {/* Login card: focal point */}
      <div className="order-1 lg:order-2 w-full max-w-md flex-shrink-0 lg:flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold" style={{ color: '#8E86F5' }}>
              PUMWI
            </h1>
            <p className="text-gray-600 mt-2">Where Art Meets Value</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('email_label')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none transition"
                placeholder={t('email_placeholder')}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('password_label')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:opacity-95"
              style={{ backgroundColor: '#8E86F5' }}
            >
              {loading ? t('signing_in') : t('signin_button')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              {t('no_account')}{' '}
              <a
                href="/signup"
                className="font-medium hover:opacity-80"
                style={{ color: '#8E86F5' }}
              >
                {t('join_link')}
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
