'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)

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
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
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
      setError('회원가입 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8E86F5] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">확인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
        {/* PUMWI 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold" style={{ color: '#8E86F5' }}>
            PUMWI
          </h1>
          <p className="text-gray-600 mt-2">당신의 예술이 가치를 만나는 공간</p>
        </div>

        {/* 회원가입 폼 */}
        <form onSubmit={handleSignup} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              가입을 환영합니다! 로그인 페이지로 이동합니다...
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              이메일
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
              비밀번호
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
              비밀번호는 최소 6자 이상이어야 합니다.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:opacity-90"
            style={{ backgroundColor: '#8E86F5' }}
          >
            {loading ? '가입 중...' : success ? '가입 완료!' : '회원가입'}
          </button>
        </form>

        {/* 로그인 링크 */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            이미 계정이 있으신가요?{' '}
            <a
              href="/login"
              className="font-medium hover:opacity-80"
              style={{ color: '#8E86F5' }}
            >
              로그인
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
