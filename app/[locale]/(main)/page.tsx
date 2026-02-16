import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'
import HomeCenterColumn from '@/components/HomeCenterColumn'
import HomePageWithFounderModal from '@/components/HomePageWithFounderModal'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data ? (data as unknown as Profile) : null
  }

  return (
    <HomePageWithFounderModal>
      <div className="w-full h-full">
        {user ? (
          <HomeCenterColumn userId={user.id} profile={profile} />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center text-gray-500">
            Sign in to continue.
          </div>
        )}
      </div>
    </HomePageWithFounderModal>
  )
}
