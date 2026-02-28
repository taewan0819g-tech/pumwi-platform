import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminApplicationsClient from './AdminApplicationsClient'

interface ApplicationRow {
  id: string
  user_id: string
  status: string
  answers: Record<string, unknown>
  application_details: Record<string, unknown> | null
  portfolio_images: string[] | null
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

interface CollectorApplicantRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  collector_bio: string | null
  updated_at: string
}

export default async function AdminApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (adminProfile?.role !== 'admin') {
    redirect('/profile')
  }

  // Single query: users with role pending_collector OR pending_artist
  // Use select('*') to avoid missing-column errors; we map to needed fields below.
  const { data: pendingProfiles, error: pendingError } = await supabase
    .from('profiles')
    .select('*')
    .in('role', ['pending_collector', 'pending_artist'])
    .order('created_at', { ascending: false })

  if (pendingError) {
    console.error('Error fetching applications:', pendingError)
    return (
      <div className="min-h-screen bg-[#F3F2EF] p-6">
        <p className="text-red-600">Failed to load the list.</p>
      </div>
    )
  }

  const pendingArtists = (pendingProfiles ?? []).filter(
    (p: { role?: string }) => p.role === 'pending_artist'
  )
  const pendingCollectors = (pendingProfiles ?? []).filter(
    (p: { role?: string }) => p.role === 'pending_collector'
  )

  const artistIds = pendingArtists.map((p: { id: string }) => p.id)

  // Fetch artist_applications for pending_artist users (for Review modal and status)
  const { data: applications, error: appError } =
    artistIds.length > 0
      ? await supabase
          .from('artist_applications')
          .select('id, user_id, status, answers, application_details, portfolio_images, created_at, profiles(full_name, avatar_url)')
          .in('user_id', artistIds)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
      : { data: [], error: null }

  if (appError) {
    console.error('Error fetching artist applications:', appError)
    return (
      <div className="min-h-screen bg-[#F3F2EF] p-6">
        <p className="text-red-600">Failed to load artist applications.</p>
      </div>
    )
  }

  const list = (applications ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    status: row.status as string,
    answers: (row.answers as Record<string, unknown>) ?? {},
    application_details: (row.application_details as Record<string, unknown> | undefined) ?? null,
    portfolio_images: (row.portfolio_images as string[] | undefined) ?? null,
    created_at: row.created_at as string,
    profiles: row.profiles as { full_name: string | null; avatar_url: string | null } | null,
  })) as ApplicationRow[]

  const collectors: CollectorApplicantRow[] = (pendingCollectors ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    full_name: (row.full_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    collector_bio: (row.collector_bio as string | null) ?? null,
    updated_at: (row.updated_at as string) ?? (row.created_at as string) ?? '',
  }))

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-12">
      <AdminApplicationsClient applications={list} collectorApplicants={collectors} />
    </div>
  )
}
