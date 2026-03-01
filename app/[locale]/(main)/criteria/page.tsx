import { Link } from '@/i18n/navigation'

export default function CriteriaPage() {
  return (
    <div className="min-h-screen w-full bg-[#FAFAFA] font-serif antialiased">
      <div className="w-full max-w-2xl mx-auto px-6 sm:px-8 lg:px-12 py-12 sm:py-16 pb-24">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-12"
        >
          <span aria-hidden>←</span>
          메인으로
        </Link>

        {/* Hero Section */}
        <header className="text-center mb-16 sm:mb-20">
          <p className="text-4xl sm:text-5xl mb-4" aria-hidden>
            🏛️
          </p>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 tracking-tight mb-6">
            PUMWI Selection Criteria
          </h1>
          <p className="text-lg font-medium text-gray-700 mb-8">Our Principle</p>
          <blockquote className="text-center">
            <p className="text-gray-700 leading-relaxed text-lg sm:text-xl italic">
              &ldquo;We do not select workshops based on popularity or marketing.
              <br />
              We select artisans who preserve craftsmanship, embody philosophy, and create meaningful human experiences.&rdquo;
            </p>
          </blockquote>
        </header>

        {/* Section 1: 5 Standards */}
        <section className="mb-16 sm:mb-20">
          <h2 className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
            <span aria-hidden>⭐</span>
            PUMWI Artisan Selection Standards
          </h2>
          <p className="text-center text-gray-700 mb-10">
            모든 공방은 아래 5가지 기준을 기반으로 평가됩니다.
          </p>

          <ul className="space-y-10">
            <li className="border-l-4 border-[#8E86F5] pl-6 py-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ① Craft Authenticity (제작의 진정성)
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm sm:text-base mb-3">
                <li>· 장인이 직접 제작에 참여하는가</li>
                <li>· 대량 생산이 아닌가</li>
                <li>· 기술적 숙련도가 확인되는가</li>
                <li>· 전통 혹은 독창적 기술이 존재하는가</li>
              </ul>
              <p className="text-gray-600 text-sm italic">
                👉 &ldquo;누가 만들었는가&rdquo;가 명확해야 합니다.
              </p>
            </li>

            <li className="border-l-4 border-[#8E86F5] pl-6 py-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ② Continuity & Dedication (지속성과 헌신)
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm sm:text-base mb-3">
                <li>· 최소 5년 이상 지속적 활동</li>
                <li>· 장기적인 작업 세계 존재</li>
                <li>· 일회성 브랜드가 아닌가</li>
              </ul>
              <p className="text-gray-600 text-sm italic">
                👉 시간은 가장 강력한 검증입니다.
              </p>
            </li>

            <li className="border-l-4 border-[#8E86F5] pl-6 py-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ③ Artistic Philosophy (작가의 철학)
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm sm:text-base mb-3">
                <li>· 작업에 명확한 세계관이 있는가</li>
                <li>· 단순 판매가 아닌 의미를 전달하는가</li>
                <li>· 작품과 삶이 연결되어 있는가</li>
              </ul>
              <p className="text-gray-600 text-sm italic">
                👉 우리는 물건이 아니라 생각을 선택합니다.
              </p>
            </li>

            <li className="border-l-4 border-[#8E86F5] pl-6 py-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ④ Space & Cultural Identity (공간성과 지역성)
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm sm:text-base mb-3">
                <li>· 공방 공간이 정체성을 가지는가</li>
                <li>· 지역 문화와 연결되는가</li>
                <li>· 방문 경험 자체가 가치가 있는가</li>
              </ul>
              <p className="text-gray-600 text-sm italic">
                👉 공간도 작품의 일부입니다.
              </p>
            </li>

            <li className="border-l-4 border-[#8E86F5] pl-6 py-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ⑤ Experience Quality (경험의 깊이)
              </h3>
              <ul className="text-gray-700 space-y-1 text-sm sm:text-base mb-3">
                <li>· 방문자가 제작 과정에 몰입할 수 있는가</li>
                <li>· 장인과의 상호작용이 가능한가</li>
                <li>· 단순 체험이 아닌 기억이 되는가</li>
              </ul>
              <p className="text-gray-600 text-sm italic">
                👉 경험은 소비가 아니라 참여여야 합니다.
              </p>
            </li>
          </ul>
        </section>

        {/* Section 2: Process & Scarcity */}
        <section className="space-y-12 mb-16 sm:mb-20">
          <div>
            <h2 className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
              <span aria-hidden>📊</span>
              Selection Process
            </h2>
            <ul className="text-gray-700 space-y-2 text-sm sm:text-base max-w-xl mx-auto">
              <li>· 모든 공방은 현장 검토 및 인터뷰를 거칩니다.</li>
              <li>· 내부 큐레이터 평가가 진행됩니다.</li>
              <li>· 선정 수는 지역 및 분야별로 제한됩니다.</li>
              <li>· 기준 미달 시 선정이 철회될 수 있습니다.</li>
            </ul>
          </div>

          <div>
            <h2 className="flex items-center justify-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wider mb-6">
              <span aria-hidden>🔒</span>
              Scarcity Policy
            </h2>
            <ul className="text-gray-700 space-y-2 text-sm sm:text-base max-w-xl mx-auto mb-6">
              <li>· 지역당 선정 공방 수 제한</li>
              <li>· 카테고리별 상위 소수만 선정</li>
              <li>· 연 1회 재평가</li>
            </ul>
            <p className="text-center text-gray-700 italic">
              &ldquo;Selection is not permanent. Excellence must be sustained.&rdquo;
            </p>
          </div>
        </section>

        {/* Footer Note */}
        <footer className="text-center pt-8 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
            🏷️ What Selection Means
          </p>
          <p className="text-gray-700">
            PUMWI Selection indicates:
            <br />
            <span className="text-gray-600">Verified craftsmanship / Cultural significance / Exceptional workshop experience</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
