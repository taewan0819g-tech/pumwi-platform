/**
 * Post row may have optional _ko columns for Pro Mode i18n.
 * Location/country can also come from parsed content JSON for pumwi_exhibition.
 */
export type PostForContent = {
  title?: string | null
  title_ko?: string | null
  content?: string | null
  content_ko?: string | null
  location?: string | null
  location_ko?: string | null
  country?: string | null
  country_ko?: string | null
  [key: string]: unknown
}

export interface ResolvedContent {
  title: string
  content: string | null
  location: string | null
  country: string | null
}

/**
 * Resolve title, content, location, country by locale.
 * KO: use _ko fields with fallback to EN. EN: use default fields.
 */
export function getContentByLocale(
  post: PostForContent,
  locale: string
): ResolvedContent {
  const isKo = locale === 'ko'
  const title = (isKo ? (post.title_ko ?? post.title) : post.title) ?? ''
  const content = (isKo ? (post.content_ko ?? post.content) : post.content) ?? null
  const location = (isKo ? (post.location_ko ?? post.location) : post.location) ?? null
  const country = (isKo ? (post.country_ko ?? post.country) : post.country) ?? null
  return {
    title: String(title),
    content: content ? String(content) : null,
    location: location ? String(location) : null,
    country: country ? String(country) : null,
  }
}
