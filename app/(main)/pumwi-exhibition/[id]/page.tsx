import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ExhibitionAdminControls from '@/components/pumwi-exhibition/ExhibitionAdminControls'
import ExhibitionHeroAndGallery from '@/components/pumwi-exhibition/ExhibitionHeroAndGallery'
import { isExhibitionAdminEmail } from '@/lib/exhibition-admin'

interface PostRow {
  id: string
  type: string
  title: string
  content: string | null
  image_url: string | null
  image_urls: string[] | null
  created_at: string
}

function parseMeta(content: string | null): {
  description?: string
  location?: string
  country?: string
  start_date?: string
  end_date?: string
  external_link?: string
  exhibition_status?: string
} {
  if (!content?.trim()) return {}
  try {
    const p = JSON.parse(content) as Record<string, unknown>
    return {
      description: typeof p.description === 'string' ? p.description : undefined,
      location: typeof p.location === 'string' ? p.location : undefined,
      country: typeof p.country === 'string' ? p.country : undefined,
      start_date: typeof p.start_date === 'string' ? p.start_date : undefined,
      end_date: typeof p.end_date === 'string' ? p.end_date : undefined,
      external_link: typeof p.external_link === 'string' ? p.external_link : undefined,
      exhibition_status: typeof p.exhibition_status === 'string' ? p.exhibition_status : undefined,
    }
  } catch {
    return {}
  }
}

function formatDateRange(start?: string, end?: string) {
  if (!start && !end) return null
  const s = start ? new Date(start).toLocaleDateString('en-US', { dateStyle: 'long' }) : ''
  const e = end ? new Date(end).toLocaleDateString('en-US', { dateStyle: 'long' }) : ''
  if (s && e) return `${s} – ${e}`
  return s || e
}

export default async function PumwiExhibitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post, error } = await supabase
    .from('posts')
    .select('id, type, title, content, image_url, image_urls, created_at')
    .eq('id', id)
    .single()

  if (error || !post || (post as PostRow).type !== 'pumwi_exhibition') notFound()

  const row = post as PostRow
  const meta = parseMeta(row.content)
  const mainPoster = row.image_url ?? (row.image_urls?.[0] ?? null)
  const galleryUrls = row.image_urls?.length ? row.image_urls : mainPoster ? [mainPoster] : []
  const locationLine = [meta.location, meta.country].filter(Boolean).join(', ')
  const dateLine = formatDateRange(meta.start_date, meta.end_date)

  let profile: { role?: string } | null = null
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    profile = data as { role?: string } | null
  }
  const isAdmin = isExhibitionAdminEmail(user?.email ?? null) || profile?.role === 'admin'

  const statusBadge =
    meta.exhibition_status === 'ongoing'
      ? { label: 'On-going', emoji: '🔴', className: 'bg-red-50 text-red-800 border-red-200' }
      : meta.exhibition_status === 'closed'
        ? { label: 'Closed', emoji: '⚫', className: 'bg-gray-100 text-gray-700 border-gray-200' }
        : { label: 'Upcoming', emoji: '🟡', className: 'bg-amber-50 text-amber-800 border-amber-200' }

  return (
    <article className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 1. TOP: Header Info (Status, Title, Date, Location) — first thing user sees */}
      <header className="border-b border-gray-100">
        <div className="p-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[#2F5D50] hover:underline"
          >
            ← Back to Feed
          </Link>
        </div>
        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border ${statusBadge.className}`}
            >
              <span aria-hidden>{statusBadge.emoji}</span>
              {statusBadge.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{row.title}</h1>
          {dateLine && (
            <p className="text-sm text-gray-500 mt-1">{dateLine}</p>
          )}
          {locationLine && (
            <p className="text-sm text-gray-600 mt-0.5">{locationLine}</p>
          )}
        </div>
      </header>

      {/* 2. MIDDLE: Interactive Gallery (Hero + Thumbnails) — below Header Info */}
      {galleryUrls.length > 0 && (
        <section className="px-6 py-6 border-b border-gray-100" aria-label="Gallery">
          <ExhibitionHeroAndGallery galleryUrls={galleryUrls} />
        </section>
      )}

      {/* 3. BELOW GALLERY: Description */}
      {meta.description && (
        <section className="p-6 border-b border-gray-100">
          <div
            className="text-slate-700 whitespace-pre-wrap text-[15px] leading-relaxed max-w-none font-serif"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {meta.description}
          </div>
        </section>
      )}

      {/* 4. BOTTOM: CTA Buttons — mt-12 to separate from description */}
      <section className="p-6 mt-12 flex flex-wrap justify-end gap-4">
        {meta.external_link?.trim() ? (
          <a
            href={meta.external_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center py-3 px-6 rounded-md bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Get Ticket
          </a>
        ) : (
          <span
            className="inline-flex items-center justify-center py-3 px-6 rounded-md bg-gray-200 text-gray-500 text-sm font-medium cursor-not-allowed"
            aria-disabled
          >
            Get Ticket
          </span>
        )}
        <Link
          href="/apply"
          className="inline-flex items-center justify-center py-3 px-6 rounded-md border border-gray-900 text-gray-900 text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
        >
          Apply as Artist
        </Link>
      </section>

      {/* 4. Admin Controls */}
      {isAdmin && (
        <div className="p-6 border-t border-gray-100">
          <ExhibitionAdminControls postId={row.id} />
        </div>
      )}
    </article>
  )
}
