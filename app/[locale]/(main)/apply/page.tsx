import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function ApplyPage() {
  const t = await getTranslations('apply')
  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">{t('title')}</h1>
      <p className="text-sm text-gray-600 mb-6">
        {t('page_description')}
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center justify-center py-3 px-6 rounded-md border border-gray-900 text-gray-900 text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
      >
        Go to Profile
      </Link>
    </div>
  )
}
