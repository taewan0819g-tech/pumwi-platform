import { notFound } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/server'
import { getTranslations } from 'next-intl/server'

const artistMock = {
  name: '이백연',
  title: '도예가 (Ceramic Artist)',
  studio: '고요 아틀리에 (Goyo Atelier)',
  works: [
    {
      id: 1,
      name: '백자 달항아리',
      img: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 2,
      name: '청자 다기 세트',
      img: 'https://images.unsplash.com/photo-1610701596087-0b1aeb0bc43d?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 3,
      name: '연꽃 굽접시',
      img: 'https://images.unsplash.com/photo-1603512392746-6017f8588bd6?q=80&w=800&auto=format&fit=crop',
    },
  ],
  editorNote:
    '전통 백자의 고루함을 벗어던지고 현대적인 라이프스타일에 스며드는 그녀의 달항아리는 일상 속 작은 위로가 됩니다. 물레질 속에서 피어나는 비정형의 아름다움을 PUMWI가 강력히 추천합니다.',
  links: {
    instagram: 'https://instagram.com/goyo_atelier',
    shop: 'https://shop.goyo-atelier.com',
  },
  address: '강원특별자치도 춘천시 공지로 123',
  mapUrl:
    'https://maps.google.com/maps?q=강원특별자치도+춘천시+공지로+123&t=&z=15&ie=UTF8&iwloc=&output=embed',
  experience: {
    title: '흙의 숨결을 느끼는 120분',
    price: '₩ 120,000',
    desc: '나만의 달항아리를 빚어보는 프라이빗 원데이 클래스',
  },
}

const MOCK_IDS = ['1', '2', '3', '4']

interface ArtistPageProps {
  params: Promise<{ id: string }> | { id: string }
}

export default async function ArtistPage(props: ArtistPageProps) {
  const { id } = await Promise.resolve(props.params)
  const supabase = await createClient()
  const { data: profile } = await supabase.from('profiles').select('id').eq('id', id).single()

  if (!profile && !MOCK_IDS.includes(id)) {
    notFound()
  }

  const t = await getTranslations('artist')
  const a = artistMock

  return (
    <div className="min-h-screen w-full bg-gray-50 font-serif antialiased">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
        <Link
          href="/search"
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <span aria-hidden>←</span>
          검색으로 돌아가기
        </Link>

        {/* 2-Column: 좌측 메인(lg:col-span-2) / 우측 스티키 예약(lg:col-span-1) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* [좌측] 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-10">
            {/* 1. 대표 작품 3개 (Masterpieces) — 가로 3열 */}
            <section aria-labelledby="works-heading">
              <h2 id="works-heading" className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Masterpieces
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {a.works.map((work) => (
                  <figure key={work.id} className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-md">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={work.img}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <figcaption className="p-3 text-center text-sm font-medium text-gray-900">
                      {work.name}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>

            {/* 2. PUMWI 큐레이션 노트 (다국어) — Blockquote */}
            <section aria-labelledby="editor-note-heading">
              <h2 id="editor-note-heading" className="flex items-center gap-2 text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                <span aria-hidden>✦</span>
                {t('curation_note_title')}
              </h2>
              <blockquote className="rounded-xl border-l-4 border-[#8E86F5] bg-white py-6 px-6 sm:px-8 shadow-md border border-gray-100">
                <p className="text-gray-700 leading-relaxed text-[1.05rem] italic">
                  &ldquo;{a.editorNote}&rdquo;
                </p>
              </blockquote>
            </section>

            {/* 3. 작가 외부 링크 (Artist Links) */}
            <section aria-labelledby="links-heading">
              <h2 id="links-heading" className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">
                Artist Links
              </h2>
              <div className="flex flex-wrap gap-3">
                <a
                  href={a.links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:border-[#8E86F5]/50 hover:text-[#8E86F5] transition-colors bg-white shadow-sm"
                >
                  <span aria-hidden>📷</span>
                  Instagram
                </a>
                <a
                  href={a.links.shop}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-gray-200 text-gray-700 font-medium hover:border-[#8E86F5]/50 hover:text-[#8E86F5] transition-colors bg-white shadow-sm"
                >
                  <span aria-hidden>↗</span>
                  Website
                </a>
              </div>
            </section>

            {/* 4. 작업실 위치 (Location) — 지도 + 주소 */}
            <section aria-labelledby="location-heading" className="rounded-xl overflow-hidden bg-white border border-gray-100 shadow-md">
              <div className="flex items-center gap-2 p-4 sm:p-5 border-b border-gray-100">
                <span className="text-gray-500" aria-hidden>📍</span>
                <h2 id="location-heading" className="text-sm font-medium text-gray-700">
                  작업실 위치
                </h2>
              </div>
              <p className="px-4 sm:px-5 py-3 text-gray-700 text-sm sm:text-base">
                {a.address}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mx-4 mb-4 text-sm font-medium text-[#8E86F5] hover:underline"
              >
                지도에서 보기
              </a>
              <div className="aspect-[16/9] sm:aspect-[21/9] w-full bg-gray-100">
                <iframe
                  title="작업실 위치"
                  src={a.mapUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-full"
                />
              </div>
            </section>
          </div>

          {/* [우측] Sticky 예약 카드 — 가격 미노출 */}
          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 rounded-xl overflow-hidden bg-white border border-gray-100 shadow-lg p-6">
              <p className="text-xs font-medium text-[#8E86F5] uppercase tracking-wider mb-2">
                {a.studio}
              </p>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">{a.name}</h1>
              <p className="text-sm text-gray-600 mb-6">{a.title}</p>
              <div className="border-t border-gray-100 pt-6">
                <h3 className="font-medium text-gray-900 mb-3">{a.experience.title}</h3>
                <p className="text-sm text-gray-600 mb-8 leading-relaxed">{a.experience.desc}</p>
                <Link
                  href="/login"
                  className="block w-full text-center py-3.5 rounded-lg text-sm font-semibold text-white bg-[#8E86F5] hover:opacity-95 transition-opacity"
                >
                  공방 체험 예약하기
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
