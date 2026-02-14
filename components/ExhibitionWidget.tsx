'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type ExhibitionPost = {
  id: string
  title: string
  content: string | null
  image_url: string | null
  image_urls: string[] | null
  exhibition_status?: string | null
  created_at: string
}

function parseExhibitionMeta(content: string | null): {
  location?: string
  country?: string
  start_date?: string
  end_date?: string
  description?: string
  external_link?: string
  exhibition_status?: string
} {
  if (!content?.trim()) return {}
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>
    return {
      location: typeof parsed.location === 'string' ? parsed.location : undefined,
      country: typeof parsed.country === 'string' ? parsed.country : undefined,
      start_date: typeof parsed.start_date === 'string' ? parsed.start_date : undefined,
      end_date: typeof parsed.end_date === 'string' ? parsed.end_date : undefined,
      description: typeof parsed.description === 'string' ? parsed.description : undefined,
      external_link: typeof parsed.external_link === 'string' ? parsed.external_link : undefined,
      exhibition_status: typeof parsed.exhibition_status === 'string' ? parsed.exhibition_status : undefined,
    }
  } catch {
    return {}
  }
}

/** Badge from manual exhibition_status only (do not derive from date). */
function getStatusBadge(status: string | null | undefined): { emoji: string; label: string } {
  switch (status) {
    case 'ongoing':
      return { emoji: '🔴', label: 'On-going' }
    case 'upcoming':
      return { emoji: '🟡', label: 'Upcoming' }
    case 'closed':
      return { emoji: '⚫', label: 'Closed' }
    default:
      return { emoji: '🟡', label: 'Upcoming' }
  }
}

function formatLocation(location: string | undefined, country: string | undefined) {
  if (location && country) return `${location}, ${country}`
  if (location) return location
  if (country) return country
  return ''
}

export default function ExhibitionWidget() {
  const [posts, setPosts] = useState<ExhibitionPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('posts')
      .select('id, title, content, image_url, image_urls, created_at')
      .eq('type', 'pumwi_exhibition')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (error) {
          console.error('[ExhibitionWidget]', error)
          setPosts([])
        } else {
          setPosts((data ?? []) as ExhibitionPost[])
        }
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-slate-900">PUMWI Exhibition</h3>
        <p className="text-xs text-gray-500 mt-0.5">Global Offline Events</p>
        <p className="text-xs text-gray-400 mt-1.5" aria-hidden>
          🔴 On-going | 🟡 Upcoming | ⚫ Closed
        </p>
      </div>
      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">Loading...</div>
      ) : posts.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-500">No exhibitions scheduled.</div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {posts.map((post) => {
            const meta = parseExhibitionMeta(post.content)
            const status = post.exhibition_status ?? meta.exhibition_status
            const badge = getStatusBadge(status)
            const locationStr = formatLocation(meta.location, meta.country)
            const line = locationStr ? `${post.title} - ${locationStr}` : post.title
            return (
              <li key={post.id}>
                <Link
                  href={`/pumwi-exhibition/${post.id}`}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span aria-hidden className="shrink-0">
                    {badge.emoji}
                  </span>
                  <span className="line-clamp-1">{line}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
