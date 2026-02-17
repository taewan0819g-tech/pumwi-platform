'use client'

import { useTranslations } from 'next-intl'
import { MapPin } from 'lucide-react'

export default function ValuePropositionSection() {
  const t = useTranslations('landing')

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div className="space-y-4">
        <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
          Why PUMWI
        </h2>
        <p className="text-lg text-gray-600">
          {t('main_description')}
        </p>
      </div>

      <div className="space-y-6">
        {/* 1. 철저한 검증과 신뢰 */}
        <div className="flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-gray-100">
          <div className="w-12 h-12 rounded-full bg-[#F4F3FF] flex items-center justify-center flex-shrink-0 text-2xl">
            🛡️
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">{t('trust_title')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('trust_desc')}
            </p>
          </div>
        </div>

        {/* 2. 내 곁의 아티스트 (Location Service) — MapPin */}
        <div className="flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-gray-100">
          <div className="w-12 h-12 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0 text-[#8E86F5]">
            <MapPin className="w-6 h-6" aria-hidden />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">{t('location_title')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('location_desc')}
            </p>
          </div>
        </div>

        {/* 3. 올인원 스튜디오 OS */}
        <div className="flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-gray-100">
          <div className="w-12 h-12 rounded-full bg-[#E3F2FD] flex items-center justify-center flex-shrink-0 text-2xl">
            ⚙️
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">{t('os_title')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('os_desc')}
            </p>
          </div>
        </div>

        {/* 4. 철학으로 연결되다 */}
        <div className="flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-gray-100">
          <div className="w-12 h-12 rounded-full bg-[#FFF3E0] flex items-center justify-center flex-shrink-0 text-2xl">
            💜
          </div>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">{t('philosophy_title')}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('philosophy_desc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
