import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NewsAdminClient from './NewsAdminClient'

export const dynamic = 'force-dynamic'

export type NewsRow = {
  id: string
  title: string
  content: string | null
  created_at: string
}

export default async function AdminNewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/profile')
  }

  const { data: rows, error } = await supabase
    .from('news')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="rounded-xl bg-white border border-gray-200 p-6">
        <p className="text-red-600">Failed to load news.</p>
      </div>
    )
  }

  const list: NewsRow[] = (rows ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    title: r.title as string,
    content: (r.content as string) ?? null,
    created_at: r.created_at as string,
  }))

  return (
    <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
      <NewsAdminClient initialList={list} />
    </div>
  )
}
