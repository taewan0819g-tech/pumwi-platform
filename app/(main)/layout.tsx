import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'
import Sidebar from '@/components/layout/Sidebar'
import NewsWidget from '@/components/NewsWidget'
import ArtistList from '@/components/ArtistList'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  let applicationStatus: 'pending' | 'approved' | 'rejected' | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data ? (data as unknown as Profile) : null
    const { data: app } = await supabase
      .from('artist_applications')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    applicationStatus = app?.status ?? null
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF]">
      <div className="max-w-7xl mx-auto pt-6 px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Sidebar
            user={user ? { id: user.id, email: user.email ?? null } : null}
            profile={profile}
            userEmail={user?.email ?? null}
            applicationStatus={applicationStatus}
          />
          <main className="lg:col-span-6 order-1 lg:order-2">
            {children}
          </main>
          <aside className="lg:col-span-3 order-3 space-y-4">
            <NewsWidget />
            <ArtistList />
          </aside>
        </div>
      </div>
    </div>
  )
}
