'use client'

import { useTranslations } from 'next-intl'
import { Shield, Settings, Heart } from 'lucide-react'

const FEATURE_KEYS = [
  { key: 'feature1', icon: Shield, accent: '#8E86F5' },
  { key: 'feature2', icon: Settings, accent: '#2F5D50' },
  { key: 'feature3', icon: Heart, accent: '#8E86F5' },
] as const

export default function ValuePropositionSection() {
  const t = useTranslations('auth.left_panel')

  return (
    <section className="space-y-8 lg:space-y-10">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight lg:text-2xl">
          {t('title')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 leading-relaxed max-w-md">
          {t('subtitle')}
        </p>
      </div>
      <ul className="space-y-6 lg:space-y-8">
        {FEATURE_KEYS.map(({ key, icon: Icon, accent }) => (
          <li key={key} className="flex gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent}18`, color: accent }}
              aria-hidden
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <h3
                className="text-sm font-semibold"
                style={{ color: accent }}
              >
                {t(`${key}_title`)}
              </h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {t(`${key}_desc`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
