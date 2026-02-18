'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import ValuePropositionSection from '@/components/auth/ValuePropositionSection'

/** 로고는 언어 무관 */
const LOGO_SRC = '/logo.png'

/** locale에 따른 랜딩 이미지 접미사: ko → -ko, ja → -ja, 그 외(en) → '' */
function getLandingImageSuffix(locale: string): string {
  if (locale === 'ko') return '-ko'
  if (locale === 'ja') return '-ja'
  return ''
}

/* 구글 아이콘 */
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

export default function LoginPage() {
  const t = useTranslations('auth.form')
  const tAuth = useTranslations('auth')
  const tLanding = useTranslations('landing')
  const locale = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // locale 기반 랜딩 이미지 경로 (ko: -ko, ja: -ja, en 등: 접미사 없음)
  const suffix = getLandingImageSuffix(locale)
  const imgFeed = `/landing-feed${suffix}.png`
  const imgProfile = `/landing-profile${suffix}.png`
  const imgBio = `/landing-bio${suffix}.png`
  const imgApply = `/landing-apply${suffix}.png`
  const imgVoice = `/landing-voice${suffix}.png`
  const imgMenu = `/landing-menu${suffix}.png`
  const imgFeatures = `/landing-features${suffix}.png`
  const imgLocation = `/landing-location${suffix}.png`

  // 로그인 상태 체크
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
    await supabase.auth.signInWithOAuth({ provider: 'google' })
  }

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
        <div className="w-8 h-8 border-2 border-[#8E86F5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <main className="flex flex-col min-h-screen bg-white w-full font-sans">

      {/* SECTION 1: HERO & LOGIN FORM */}
      <section className="relative w-full flex flex-col lg:flex-row items-start justify-center lg:gap-20 px-4 pt-32 pb-24 bg-gray-50/50 border-b border-gray-200">
        <div className="order-2 lg:order-1 lg:max-w-lg w-full mt-12 lg:mt-0">
          <ValuePropositionSection />
        </div>
        <div className="order-1 lg:order-2 w-full max-w-md flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="relative h-16 w-[180px] mx-auto">
                <Image src={LOGO_SRC} alt="PUMWI" fill className="object-contain" sizes="200px" priority />
              </div>
              <p className="text-gray-500 mt-2 text-sm font-medium tracking-wide">Where Art Meets Value</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email_label')}</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8E86F5] outline-none transition-all"
                  placeholder={t('email_placeholder')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('password_label')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#8E86F5] outline-none transition-all"
                  placeholder="••••••••" />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#8E86F5] text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition shadow-md disabled:opacity-50">
                {loading ? t('signing_in') : t('signin_button')}
              </button>
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="bg-white px-3 text-gray-500">{tAuth('or')}</span></div>
              </div>
              <button type="button" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 transition font-medium text-gray-700">
                <GoogleIcon /> {tAuth('google_button')}
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-600">
              {t('no_account')} <a href="/signup" className="font-bold text-[#8E86F5] hover:underline ml-1">{t('join_link')}</a>
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#F4F3FF] to-white p-6 rounded-2xl border border-[#8E86F5]/20 shadow-lg">
             <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🎨</span>
                <h3 className="text-lg font-bold text-gray-900">{tLanding('process_title')}</h3>
             </div>
             <ul className="space-y-4">
               <li className="flex items-start gap-3">
                 <span className="bg-white text-gray-400 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm flex-shrink-0 mt-0.5 border border-gray-200">1</span>
                 <div>
                    <strong className="block text-gray-900 text-sm mb-0.5">{tLanding('step1_title')}</strong>
                    <p className="text-sm text-gray-500 leading-snug">{tLanding('step1_desc')}</p>
                 </div>
               </li>
               <li className="flex items-start gap-3">
                 <span className="bg-[#8E86F5] text-white font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md flex-shrink-0 mt-0.5 animate-pulse">2</span>
                 <div>
                    <strong className="block text-[#8E86F5] text-sm mb-0.5">{tLanding('step2_title')}</strong>
                    <p className="text-sm text-gray-800 font-medium leading-snug">{tLanding('step2_desc')}</p>
                 </div>
               </li>
               <li className="flex items-start gap-3">
                 <span className="bg-white text-gray-400 font-bold rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm flex-shrink-0 mt-0.5 border border-gray-200">3</span>
                 <div>
                    <strong className="block text-gray-900 text-sm mb-0.5">{tLanding('step3_title')}</strong>
                    <p className="text-sm text-gray-500 leading-snug">{tLanding('step3_desc')}</p>
                 </div>
               </li>
             </ul>
          </div>
        </div>
      </section>

      {/* SECTION 2: DISCOVERY */}
      <section className="py-24 px-6 lg:px-20 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-8">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
              {tLanding('discovery_title')}
            </h2>
            <div className="w-16 h-1 bg-[#8E86F5] rounded-full"></div>
            <p className="text-xl text-gray-600 leading-relaxed">
              {tLanding('discovery_desc')}
            </p>
          </div>
          <div className="lg:w-1/2 w-full">
             <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
               <Image src={imgFeed} alt="Global Discovery" width={0} height={0} sizes="100vw" className="w-full h-auto" />
             </div>
          </div>
        </div>
      </section>

      {/* SECTION 2.5: GLOBAL CONNECTION (Location) — between Exhibitions and Philosophy */}
      <section className="py-24 px-6 lg:px-20 bg-gray-50/50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 space-y-8">
            <h2
              className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight"
              dangerouslySetInnerHTML={{ __html: tLanding('sectionC_title') }}
            />
            <div className="w-16 h-1 bg-[#8E86F5] rounded-full"></div>
            <p className="text-xl text-gray-600 leading-relaxed">
              {tLanding('sectionC_desc')}
            </p>
          </div>
          <div className="lg:w-1/3 w-full max-w-md">
            <div className="w-full rounded-2xl overflow-hidden shadow-2xl border border-gray-100 max-h-[450px]">
              <Image
                src={imgLocation}
                alt="Global Connection"
                width={0}
                height={0}
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="w-full h-auto object-contain max-h-[450px]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PHILOSOPHY */}
      <section className="py-24 px-6 lg:px-20 bg-gray-50 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row-reverse items-start gap-16">
          <div className="lg:w-1/2 space-y-8 sticky top-32">
            <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
              {tLanding('philosophy_title')}
            </h2>
            <div className="w-16 h-1 bg-[#8E86F5] rounded-full"></div>
            <p className="text-xl text-gray-600 leading-relaxed">
              {tLanding('philosophy_desc')}
            </p>
          </div>
          <div className="lg:w-1/2 w-full flex flex-col gap-12">
             <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
               <Image src={imgProfile} alt="Artist Profile" width={0} height={0} sizes="100vw" className="w-full h-auto" />
             </div>
             <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-gray-200 bg-white">
               <Image src={imgBio} alt="Artist Bio" width={0} height={0} sizes="100vw" className="w-full h-auto" />
             </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TRUST */}
      <section className="py-32 px-6 bg-[#1a1b2e] text-white text-center">
        <div className="max-w-5xl mx-auto space-y-12">
          <h2 className="text-3xl lg:text-5xl font-bold">
            {tLanding('trust_title')}
          </h2>
          <p className="text-lg text-gray-300 leading-relaxed max-w-2xl mx-auto">
            {tLanding('trust_desc')}
          </p>
          <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-700 bg-gray-800 max-h-[450px]">
             <Image src={imgApply} alt="Rigorous Screening" width={0} height={0} sizes="100vw" className="w-full h-auto object-cover object-top" />
             <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a1b2e] via-[#1a1b2e]/80 to-transparent"></div>
          </div>
        </div>
      </section>

      {/* Artist Success Suite: Voice Description + All-in-One Studio OS */}
      <div className="bg-[#F9F8FF] border-y border-[#E8E6F5]/80">
        {/* Section label */}
        <div className="pt-16 pb-2 px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex items-center gap-4">
            <span className="text-[10px] lg:text-xs font-semibold tracking-[0.2em] uppercase text-[#8E86F5]/80">
              Tools for Artists
            </span>
            <span className="flex-1 h-px bg-[#8E86F5]/20" aria-hidden />
          </div>
        </div>

        {/* Voice Description (말하기) */}
        <section className="py-16 lg:py-20 px-6 lg:px-20">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="lg:w-1/2 space-y-8">
              <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
                {tLanding('voice_section_title')}
              </h2>
              <div className="w-16 h-1 bg-[#8E86F5] rounded-full" />
              <p className="text-xl text-gray-600 leading-relaxed">
                {tLanding('voice_section_desc')}
              </p>
            </div>
            <div className="lg:w-1/2 w-full">
              <div className="w-full rounded-2xl overflow-hidden shadow-xl border border-white bg-white/80">
                <Image src={imgVoice} alt="Voice Description" width={0} height={0} sizes="100vw" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>

        {/* All-in-One Studio OS */}
        <section className="py-12 lg:py-16 pb-24 px-6 lg:px-20">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-6">
              <h2 className="text-3xl lg:text-5xl font-extrabold text-gray-900">
                {tLanding('os_title')}
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {tLanding('os_desc')}
              </p>
            </div>
            <div className="flex flex-col md:flex-row items-start justify-center gap-8">
              <div className="w-full md:w-1/3 rounded-2xl overflow-hidden shadow-xl border border-white/90 bg-white/70 backdrop-blur-sm">
                <Image src={imgMenu} alt="Artist Menu" width={0} height={0} sizes="100vw" className="w-full h-auto" />
              </div>
              <div className="w-full md:w-2/3 rounded-2xl overflow-hidden shadow-xl border border-white/90 bg-white/70 backdrop-blur-sm">
                <Image src={imgFeatures} alt="Artist Features" width={0} height={0} sizes="100vw" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="py-12 bg-gray-50 text-center text-gray-400 text-sm border-t border-gray-200">
        <p>© 2026 PUMWI Inc. All rights reserved.</p>
        <p className="mt-2 text-xs">South Korea · Global Art Platform</p>
      </footer>

    </main>
  )
}
