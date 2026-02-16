'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import ValuePropositionSection from '@/components/auth/ValuePropositionSection'

const LOGO_SRC = '/logo.png'

function useFadeInUp(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true)
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

export default function LandingPage() {
  const t = useTranslations('landing')
  const tNav = useTranslations('nav')
  const sectionA = useFadeInUp()
  const sectionB = useFadeInUp()
  const sectionC = useFadeInUp()
  const sectionD = useFadeInUp()

  const fadeClass = (visible: boolean) =>
    `transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`

  return (
    <div className="w-full overflow-x-hidden min-h-screen">
      {/* Hero: 첫 화면 꽉 차게 유지 */}
      <section className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center gap-10 lg:gap-16 py-10 lg:py-14">
        <div className="order-2 lg:order-1 lg:max-w-md">
          <ValuePropositionSection />
        </div>
        <div className="order-1 lg:order-2 w-full max-w-md flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 text-center">
            <div className="relative h-12 w-[140px] mx-auto mb-4">
              <Image src={LOGO_SRC} alt="PUMWI" fill className="object-contain object-center" sizes="140px" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{t('hero_title')}</h1>
            <p className="text-gray-600 mt-2 text-sm">{t('hero_subtitle')}</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
              >
                {tNav('signIn')}
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 rounded-xl text-white font-medium hover:opacity-90"
                style={{ backgroundColor: '#8E86F5' }}
              >
                {tNav('join')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section A: Global Discovery — text left / image right */}
      <section
        ref={sectionA.ref}
        className={`py-12 lg:py-16 ${fadeClass(sectionA.visible)}`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">
          <div className="lg:w-1/2 space-y-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">{t('sectionA_title')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('sectionA_desc')}</p>
          </div>
          <div className="lg:w-1/2 relative aspect-video lg:aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
            <Image src="/landing-feed.png" alt="Feed" fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      {/* Section B: Philosophy — image group left / text right */}
      <section
        ref={sectionB.ref}
        className={`py-12 lg:py-16 ${fadeClass(sectionB.visible)}`}
      >
        <div className="flex flex-col lg:flex-row-reverse lg:items-center gap-8 lg:gap-12">
          <div className="lg:w-1/2 space-y-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">{t('sectionB_title')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('sectionB_desc')}</p>
          </div>
          <div className="lg:w-1/2 grid grid-cols-2 gap-3">
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <Image src="/landing-profile.png" alt="Profile" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" />
            </div>
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-gray-200 bg-gray-50 mt-6">
              <Image src="/landing-bio.png" alt="Bio" fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Section C: Trust — dark background, centered */}
      <section
        ref={sectionC.ref}
        className={`py-12 lg:py-16 rounded-2xl ${fadeClass(sectionC.visible)}`}
        style={{ backgroundColor: '#1e293b' }}
      >
        <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12 text-white">
          <div className="lg:w-1/2 space-y-4">
            <h2 className="text-2xl lg:text-3xl font-bold">{t('sectionC_title')}</h2>
            <p className="text-slate-300 leading-relaxed">{t('sectionC_desc')}</p>
          </div>
          <div className="lg:w-1/2 relative aspect-video rounded-xl overflow-hidden bg-slate-800/50">
            <Image src="/landing-apply.png" alt="Apply" fill className="object-contain" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      {/* Section D: Artist OS — text top center, images below */}
      <section
        ref={sectionD.ref}
        className={`py-12 lg:py-16 ${fadeClass(sectionD.visible)}`}
      >
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900">{t('sectionD_title')}</h2>
            <p className="text-gray-600 leading-relaxed">{t('sectionD_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative aspect-[4/3] md:aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <Image src="/landing-menu.png" alt="Menu" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
            <div className="relative aspect-[4/3] md:aspect-video rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
              <Image src="/landing-features.png" alt="Features" fill className="object-contain" sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
