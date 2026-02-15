'use client'

import { useCallback } from 'react'
import { useLocale } from 'next-intl'
import type { PostForContent, ResolvedContent } from '@/lib/content-language'
import { getContentByLocale } from '@/lib/content-language'

/**
 * Returns a getter that resolves title, content, location, country by current locale.
 * Use in client components: const getContent = useContentLanguage(); then getContent(post).
 */
export function useContentLanguage(): (post: PostForContent) => ResolvedContent {
  const locale = useLocale()
  return useCallback(
    (post: PostForContent) => getContentByLocale(post, locale),
    [locale]
  )
}
