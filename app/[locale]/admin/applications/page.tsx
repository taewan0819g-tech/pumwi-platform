import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminApplicationsClient from './AdminApplicationsClient'

interface ApplicationRow {
  id: string
  user_id: string
  status: string
  answers: Record<string, unknown>
  application_details: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export default async function AdminApplicationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/profile')
  }

  const { data: applications, error } = await supabase
    .from('artist_applications')
    .select('id, user_id, status, answers, created_at, profiles(full_name, avatar_url)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="min-h-screen bg-[#F3F2EF] p-6">
        <p className="text-red-600">Failed to load the list.</p>
      </div>
    )
  }

  const list = (applications ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    user_id: row.user_id as string,
    status: row.status as string,
    answers: (row.answers as Record<string, unknown>) ?? {},
    application_details: (row.application_details as Record<string, unknown> | undefined) ?? null,
    created_at: row.created_at as string,
    profiles: row.profiles as { full_name: string | null; avatar_url: string | null } | null,
  })) as ApplicationRow[]

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-12">
      <AdminApplicationsClient applications={list} />
    </div>
  )
}
