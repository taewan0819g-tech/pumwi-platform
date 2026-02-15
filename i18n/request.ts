import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale ?? routing.defaultLocale
  const localeStr = typeof locale === 'string' ? locale : routing.defaultLocale
  const validLocale = routing.locales.includes(localeStr as any) ? localeStr : routing.defaultLocale

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  }
})
