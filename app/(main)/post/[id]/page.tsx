import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface PostRow {
  id: string
  user_id: string
  type: string
  title: string
  content: string | null
  image_url: string | null
  image_urls: string[] | null
  created_at: string
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) notFound()
  const post = data as unknown as PostRow
  const urls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : []

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
        <h1 className="text-xl font-semibold text-slate-900">{post.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date(post.created_at).toLocaleDateString('en-US', { dateStyle: 'long' })}
        </p>
        {post.content && (
          <div className="mt-4 text-slate-700 whitespace-pre-wrap text-sm">
            {post.type === 'pumwi_exhibition' && (() => {
              try {
                const meta = JSON.parse(post.content) as Record<string, string>
                const desc = meta.description
                return (
                  <>
                    {desc && <p className="mb-4">{desc}</p>}
                    {meta.location && <p><strong>Location:</strong> {meta.location}{meta.country ? `, ${meta.country}` : ''}</p>}
                    {meta.start_date && <p><strong>Start:</strong> {meta.start_date}</p>}
                    {meta.end_date && <p><strong>End:</strong> {meta.end_date}</p>}
                    {meta.external_link && (
                      <a href={meta.external_link} target="_blank" rel="noopener noreferrer" className="text-[#2F5D50] hover:underline mt-2 inline-block">
                        External link →
                      </a>
                    )}
                  </>
                )
              } catch {
                return <p>{post.content}</p>
              }
            })()}
            {post.type !== 'pumwi_exhibition' && <p>{post.content}</p>}
          </div>
        )}
      </div>
    </article>
  )
}
