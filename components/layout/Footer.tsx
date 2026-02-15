'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Instagram, Github } from 'lucide-react'

export default function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="bg-slate-50 border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs text-slate-500 mb-6">
              <Link
                href="/about"
                className="text-slate-600 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
              >
                {t('about')}
              </Link>
              <span className="text-slate-300 select-none">|</span>
              <Link
                href="/privacy"
                className="text-slate-600 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
              >
                {t('privacy')}
              </Link>
              <span className="text-slate-300 select-none">|</span>
              <Link
                href="/terms"
                className="text-slate-600 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
              >
                {t('termsShort')}
              </Link>
              <span className="text-slate-300 select-none">|</span>
              <Link
                href="/notice"
                className="text-slate-600 hover:text-slate-900 hover:underline transition-colors cursor-pointer"
              >
                {t('notice')}
              </Link>
            </div>

            <div className="text-xs text-slate-500 space-y-1 mb-6">
              <p className="font-semibold text-slate-600">PUMWI</p>
              <p>Representative: tw.Hwang | DPO: tw.Hwang</p>
              <p>Address: Icheon-si, Gyeonggi-do, Republic of Korea</p>
              <p>
                Email:{' '}
                <a
                  href="mailto:pumwi.team@gmail.com"
                  className="hover:text-slate-700 underline"
                >
                  pumwi.team@gmail.com
                </a>
              </p>
              <p className="text-slate-400 italic mt-2">
                *Beta. Full service coming soon.
              </p>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-xs font-medium text-slate-600 mb-2">{t('pumwiNews')}</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>
                <Link href="/notice" className="text-slate-600 hover:text-slate-900 hover:underline transition-colors">
                  {t('latestNews')}
                </Link>
              </li>
              <li>
                <Link href="/notice" className="text-slate-600 hover:text-slate-900 hover:underline transition-colors">
                  {t('notice')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-500">
          <p>Copyright © 2026 PUMWI. All Rights Reserved.</p>
          <div className="flex items-center gap-3">
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </a>
            <a
              href="https://github.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
