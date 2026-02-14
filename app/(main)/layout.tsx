import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'
import Sidebar from '@/components/layout/Sidebar'
import RightSidebar from '@/components/layout/RightSidebar'

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
    // 1. 전체 배경 및 최소 높이 설정 (푸터 도달 가능하게)
    <div className="w-full bg-[#F9F9F8] min-h-screen overflow-x-hidden">
      {/* 2. 그리드 컨테이너:
          - gap-8: 두 번째 사진처럼 간격을 적절히 좁힘
          - min-w-[1200px]: 3단 구조 강제 고정
      */}
      <div className="max-w-[1600px] min-w-[1200px] mx-auto grid grid-cols-12 gap-8 px-6 lg:px-8 py-6">
        {/* [왼쪽] 사이드바: 화면 상단에 고정(Sticky) */}
        <aside className="col-span-3">
          <div className="sticky top-24 h-fit">
            <Sidebar
              user={user ? { id: user.id, email: user.email ?? null } : null}
              profile={profile}
              userEmail={user?.email ?? null}
              applicationStatus={applicationStatus}
            />
          </div>
        </aside>

        {/* [가운데] 피드:
            - h-[calc(100vh-100px)]: 화면 높이에 맞춰 높이 고정
            - overflow-y-auto: 여기만 마우스 올리고 굴리면 독립적으로 스크롤 됨
        */}
        <main className="col-span-6 h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide px-2">
          <div className="w-full max-w-2xl mx-auto pb-12">
            {children}
          </div>
        </main>

        {/* [오른쪽] 위젯: 화면 상단에 고정(Sticky) */}
        <aside className="col-span-3">
          <RightSidebar />
        </aside>
      </div>
    </div>
  )
}
