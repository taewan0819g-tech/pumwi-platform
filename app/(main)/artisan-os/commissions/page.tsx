import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommissionsClient from './commissions-client'

export const dynamic = 'force-dynamic'

function normalizeImageUrls(val: unknown): string[] | null {
  if (Array.isArray(val) && val.length > 0) return val as string[]
  if (typeof val === 'string' && val) return [val]
  return null
}

export default async function CommissionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('artwork_requests')
    .select('id, requester_id, artist_id, details, image_urls, created_at, profiles!requester_id(full_name, avatar_url)')
    .eq('artist_id', user.id)
    .order('created_at', { ascending: false })

  const requests = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    requester_id: r.requester_id as string,
    artist_id: r.artist_id as string,
    details: r.details as string,
    image_urls: normalizeImageUrls(r.image_urls),
    created_at: r.created_at as string,
    status: (r.status as string) || 'pending',
    profiles: r.profiles as { full_name: string | null; avatar_url: string | null } | null,
  }))

  const pendingCount = requests.filter((r) => (r.status || 'pending') === 'pending').length

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="max-w-4xl mx-auto w-full py-12 px-4">
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#2F5D50] font-serif"
          >
            Commissions
          </h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#2F5D50]/15 text-[#2F5D50] border border-[#2F5D50]/30">
              {pendingCount} Pending
            </span>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <CommissionsClient
            requests={requests}
            currentUserId={user.id}
          />
        </div>
      </div>
    </div>
  )
}
