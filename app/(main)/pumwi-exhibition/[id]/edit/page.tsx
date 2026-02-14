import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ExhibitionEditForm from '@/components/pumwi-exhibition/ExhibitionEditForm'
import { isExhibitionAdminEmail } from '@/lib/exhibition-admin'

interface PostRow {
  id: string
  type: string
  title: string
  content: string | null
  image_url: string | null
  image_urls: string[] | null
}

function parseMeta(content: string | null) {
  if (!content?.trim()) return {}
  try {
    return JSON.parse(content) as Record<string, string>
  } catch {
    return {}
  }
}

export default async function ExhibitionEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const canEdit = isExhibitionAdminEmail(user.email ?? null)
  if (!canEdit) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if ((profile as { role?: string } | null)?.role !== 'admin') redirect('/')
  }

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, type, title, content, image_url, image_urls')
    .eq('id', id)
    .single()

  if (error || !post || (post as PostRow).type !== 'pumwi_exhibition') notFound()

  const row = post as PostRow
  const meta = parseMeta(row.content)
  const initial = {
    title: row.title,
    description: meta.description ?? '',
    location: meta.location ?? '',
    country: meta.country ?? '',
    start_date: meta.start_date ?? '',
    end_date: meta.end_date ?? '',
    exhibition_status: (meta.exhibition_status as 'ongoing' | 'upcoming' | 'closed') || 'upcoming',
    external_link: meta.external_link ?? '',
    image_urls: row.image_urls ?? (row.image_url ? [row.image_url] : []),
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/pumwi-exhibition/${id}`} className="text-sm text-[#2F5D50] hover:underline">
          ← Back to Exhibition
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-slate-900 mb-4">Edit PUMWI Exhibition</h1>
      <ExhibitionEditForm postId={id} initial={initial} />
    </div>
  )
}
