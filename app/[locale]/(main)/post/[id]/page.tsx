import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getContentByLocale } from '@/lib/content-language'

interface PostRow {
  id: string
  user_id: string
  type: string
  title: string
  title_ko?: string | null
  content: string | null
  content_ko?: string | null
  location_ko?: string | null
  country_ko?: string | null
  image_url: string | null
  image_urls: string[] | null
  created_at: string
}

function parsePumwiMeta(content: string | null): Record<string, string> {
  if (!content?.trim()) return {}
  try {
    return JSON.parse(content) as Record<string, string>
  } catch {
    return {}
  }
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) notFound()
  const post = data as unknown as PostRow
  const urls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : []

  const meta = post.type === 'pumwi_exhibition' ? parsePumwiMeta(post.content) : {}
  const postForContent =
    post.type === 'pumwi_exhibition'
      ? { ...post, location: meta.location, country: meta.country }
      : post
  const resolved = getContentByLocale(postForContent, locale)
  const descriptionText =
    post.type === 'pumwi_exhibition'
      ? locale === 'ko'
        ? (post.content_ko ?? meta.description ?? '')
        : (meta.description ?? '')
      : resolved.content

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <Link href="/" className="text-sm text-[#2F5D50] hover:underline">← Back to Feed</Link>
      </div>
      {urls.length > 0 && (
        <div className="aspect-video max-h-[60vh] bg-gray-100">
          <img src={urls[0]} alt="" className="w-full h-full object-contain" />
        </div>
      )}
      <div className="p-6">
        <h1 className="text-xl font-semibold text-slate-900">{resolved.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(post.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
        </p>
        {(descriptionText || (post.type === 'pumwi_exhibition' && (meta.location || meta.country))) && (
          <div className="mt-4 text-slate-700 whitespace-pre-wrap text-sm">
            {post.type === 'pumwi_exhibition' ? (
              <>
                {descriptionText && <p className="mb-4">{descriptionText}</p>}
                {(resolved.location || resolved.country) && (
                  <p>
                    <strong>Location:</strong>{' '}
                    {[resolved.location, resolved.country].filter(Boolean).join(', ')}
                  </p>
                )}
                {meta.start_date && <p><strong>Start:</strong> {meta.start_date}</p>}
                {meta.end_date && <p><strong>End:</strong> {meta.end_date}</p>}
                {meta.external_link && (
                  <a
                    href={meta.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2F5D50] hover:underline mt-2 inline-block"
                  >
                    External link →
                  </a>
                )}
              </>
            ) : (
              descriptionText && <p>{descriptionText}</p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
