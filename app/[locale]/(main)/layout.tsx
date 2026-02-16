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
    // 1. 전체 컨테이너: 화면 높이 고정(헤더 제외), 전체 스크롤 방지 → 3단 각각 독립 스크롤
    <div className="w-full bg-[#F9F9F8] h-[calc(100vh-64px)] overflow-hidden overflow-x-hidden">
      {/* 2. 3단 그리드: h-full로 컨테이너 채움, 각 컬럼은 overflow-y-auto로 독립 스크롤 */}
      <div className="w-full h-full max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        {/* [왼쪽] 사이드바: h-full + overflow-y-auto + scrollbar-hide */}
        <aside className="hidden lg:block col-span-3 h-full overflow-y-auto scrollbar-hide">
          <div className="pb-6">
            <Sidebar
              user={user ? { id: user.id, email: user.email ?? null } : null}
              profile={profile}
              userEmail={user?.email ?? null}
              applicationStatus={applicationStatus}
            />
          </div>
        </aside>

        {/* [가운데] 피드/랜딩: h-full + overflow-y-auto + scrollbar-hide */}
        <main className="col-span-1 lg:col-span-9 xl:col-span-6 w-full h-full overflow-y-auto scrollbar-hide px-2">
          <div className="w-full max-w-2xl mx-auto pb-12">
            {children}
          </div>
        </main>

        {/* [오른쪽] 위젯: h-full + overflow-y-auto + scrollbar-hide */}
        <aside className="hidden xl:block col-span-3 h-full overflow-y-auto scrollbar-hide">
          <RightSidebar />
        </aside>
      </div>
    </div>
  )
}
