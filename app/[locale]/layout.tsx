import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/layout/Footer'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const messages = await getMessages()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Navbar user={user} />
      <div className="flex-1">{children}</div>
      <Footer />
    </NextIntlClientProvider>
  )
}
