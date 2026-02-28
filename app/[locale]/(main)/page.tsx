import AIConciergeClient from '@/components/concierge/AIConciergeClient'

/**
 * 메인 페이지: AI Concierge.
 * 로그인 없이 이용 가능. 갤러리 피드는 /gallery 에서 제공.
 */
export default function HomePage() {
  return (
    <div className="w-full h-full">
      <AIConciergeClient />
    </div>
  )
}
