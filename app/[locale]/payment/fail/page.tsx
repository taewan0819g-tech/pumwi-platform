'use client'

import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

export default function PaymentFailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('payment')
  const code = searchParams.get('code')
  const message = searchParams.get('message')

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      <p className="text-xl font-medium text-amber-700 mb-2">
        {t('fail_title')}
      </p>
      {code && (
        <p className="text-sm text-gray-500 mb-1">
          code: {code}
        </p>
      )}
      {message && (
        <p className="text-slate-600 mb-6">
          {message}
        </p>
      )}
      <button
        type="button"
        onClick={() => router.push('/')}
        className="px-6 py-2.5 rounded-md font-medium text-white bg-slate-600 hover:bg-slate-700"
      >
        {t('back_to_feed')}
      </button>
    </div>
  )
}
