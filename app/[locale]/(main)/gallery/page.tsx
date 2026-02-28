import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'
import HomeCenterColumn from '@/components/HomeCenterColumn'
import HomePageWithFounderModal from '@/components/HomePageWithFounderModal'
import LandingPage from '@/components/landing/LandingPage'

/**
 * 갤러리 피드 페이지. 기존 메인(홈) 내용 보존.
 * 로그인 시 피드 + 포스트 입력, 비로그인 시 랜딩.
 */
export default async function GalleryPage() {
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
          <LandingPage />
        )}
      </div>
    </HomePageWithFounderModal>
  )
}
