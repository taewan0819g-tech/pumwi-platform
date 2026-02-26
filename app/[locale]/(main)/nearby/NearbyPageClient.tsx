'use client'

import { useState, useMemo } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import LocationPlacesAutocomplete from '@/components/profile/LocationPlacesAutocomplete'
import NearbyArtists from '@/components/right-sidebar/NearbyArtists'

const NEARBY_PAGE_FALLBACKS: Record<string, Record<string, string>> = {
  ko: { title: '내 주변 작가', searchPlaceholder: '주소 또는 지역명을 입력하세요', searchClear: '검색 초기화' },
  en: { title: 'Artists Near Me', searchPlaceholder: 'Enter address or city name', searchClear: 'Clear search' },
  ja: { title: '近くの作家', searchPlaceholder: '住所または地域名を入力してください', searchClear: '検索をクリア' },
}

interface NearbyPageClientProps {
  currentUserId: string | null
}

export default function NearbyPageClient({ currentUserId }: NearbyPageClientProps) {
  const t = useTranslations('nearbyArtists')
  const locale = useLocale()
  const [searchOrigin, setSearchOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [addressSearchKey, setAddressSearchKey] = useState(0)

  const getSafeText = (key: string, fallbackText: string): string => {
    try {
      const text = t(key)
      if (!text || text === key || (typeof text === 'string' && text.includes('.'))) {
        return fallbackText
      }
      return text
    } catch {
      return fallbackText
    }
  }

  const textData = useMemo(() => {
    const fallback = NEARBY_PAGE_FALLBACKS[locale] ?? NEARBY_PAGE_FALLBACKS.en
    return {
      title: getSafeText('title', fallback.title),
      searchPlaceholder: getSafeText('searchPlaceholder', fallback.searchPlaceholder),
      searchClear: getSafeText('searchClear', fallback.searchClear),
    }
  }, [t, locale])

  const mapLanguage = locale === 'ja' ? 'ja' : locale === 'ko' ? 'ko' : 'en'

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span>{textData.title}</span>
        </h1>

        <section className="flex-shrink-0 space-y-2" aria-label={textData.searchPlaceholder}>
          <LocationPlacesAutocomplete
            key={addressSearchKey}
            value=""
            onChange={(result) => {
              if (result.lat != null && result.lng != null) {
                setSearchOrigin({ lat: result.lat, lng: result.lng })
              }
            }}
            placeholder={textData.searchPlaceholder}
            language={mapLanguage}
            className="w-full"
            inputClassName="w-full rounded-lg border border-gray-200 py-3 px-3 text-[15px] min-h-[48px] focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent bg-white"
          />
          {searchOrigin && (
            <button
              type="button"
              onClick={() => {
                setSearchOrigin(null)
                setAddressSearchKey((k) => k + 1)
              }}
              className="w-full rounded-lg py-2.5 text-center text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 min-h-[44px]"
            >
              {textData.searchClear}
            </button>
          )}
        </section>

        <NearbyArtists
          currentUserId={currentUserId}
          variant="sidebar"
          searchOrigin={searchOrigin}
        />
      </div>
    </div>
  )
}
