import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const LIMIT_PLACES = 5
const MAX_METERS_NATIONWIDE = 500_000

const ALLOWED_CATEGORY_L = ['Traditional Art', 'Workshop', 'Art']
function isAllowedCategoryL(cat: string | null | undefined): boolean {
  if (!cat) return false
  return ALLOWED_CATEGORY_L.some((a) => a.toLowerCase() === cat.trim().toLowerCase())
}

export interface ExperiencePlace {
  id: string
  name: string
  description: string | null
  categories: string[]
  image_url: string | null
  link: string | null
  is_pumwi_verified?: boolean
  lat?: number | null
  lng?: number | null
  dist_meters?: number | null
  address_en?: string | null
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category_l = searchParams.get('category_l')?.trim() || 'Workshop'
    const category_m = searchParams.get('category_m')?.trim() || ''
    const category_s = searchParams.get('category_s')?.trim() || ''
    const moodKeywordsParam = searchParams.get('mood_keywords')?.trim()
    const mainEntityParam = searchParams.get('main_entity')?.trim() || ''
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')

    const lat = latParam != null ? Number(latParam) : null
    const lng = lngParam != null ? Number(lngParam) : null

    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
      return NextResponse.json({ error: 'Location required.' }, { status: 400 })
    }

    const requestedWasNonWorkshop = !isAllowedCategoryL(category_l)
    const effectiveCategoryL = requestedWasNonWorkshop ? 'Workshop' : category_l

    const supabase = await createClient()

    // 💡 1단계: 깐깐한 중/소분류 조건(category_m, category_s)을 DB에 넘기지 않고 대분류(Workshop) 전체를 가져옵니다.
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_ai_distances', {
      user_lat: lat,
      user_lng: lng,
      target_category: effectiveCategoryL
    })

    if (rpcError || !Array.isArray(rpcData) || rpcData.length === 0) {
      return NextResponse.json({ places: [], noExactMatch: true, fallbackSuggested: false, workshopOnlyMessage: requestedWasNonWorkshop })
    }

    const ids = rpcData.map((r) => r.id).filter(Boolean)
    const { data: spots } = await supabase
      .from('experience_spots')
      .select('id, name, description_en, category_l, category_m, category_s, image_url, is_pumwi_verified, mood_tags, address_en')
      .in('id', ids)

    if (!spots || spots.length === 0) {
      return NextResponse.json({ places: [], noExactMatch: true, fallbackSuggested: false, workshopOnlyMessage: requestedWasNonWorkshop })
    }

    // 키워드 병합 (추론된 단어들)
    const searchTerms = [mainEntityParam, ...(moodKeywordsParam ? moodKeywordsParam.split(',') : [])]
      .map(k => k.trim().toLowerCase())
      .filter(Boolean)

    // 💡 2단계: 백엔드에서 직접 점수(Score) 계산
    const scoredSpots = spots.map(spot => {
      const distInfo = rpcData.find(r => r.id === spot.id)
      const dist_meters = distInfo?.dist_meters ?? Infinity
      let score = 0

      const spotCatM = (spot.category_m || '').toLowerCase()
      const spotCatS = (spot.category_s || '').toLowerCase()
      const nameDesc = `${spot.name || ''} ${spot.description_en || ''}`.toLowerCase()

      // 1. 중분류/소분류 정확도 스코어
      if (category_m && spotCatM === category_m.toLowerCase()) score += 50
      if (category_s && spotCatS === category_s.toLowerCase()) score += 30

      // 2. 검색 키워드 스코어
      searchTerms.forEach(kw => {
        if (spotCatM.includes(kw) || spotCatS.includes(kw)) score += 20
        if (nameDesc.includes(kw)) score += 10
      })

      return { ...spot, dist_meters, score }
    })

    // 1. 점수가 0보다 큰(조금이라도 관련이 있는) 공방만 필터링 (합격자 추려내기)
    let validSpots = scoredSpots.filter(s => s.score > 0);

    // 2. 만약 관련 있는 공방이 하나도 없다면, 전체 공방을 대상으로 함 (Fallback)
    if (validSpots.length === 0) {
      validSpots = scoredSpots;
    }

    // 💡 핵심: 1순위는 '점수(Score) 내림차순', 2순위가 '거리(dist_meters) 오름차순'
    validSpots.sort((a, b) => {
      // 점수가 다르면 점수 높은 애가 무조건 승리!
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 점수가 동점일 때만 거리가 가까운 애가 승리!
      const da = a.dist_meters != null ? a.dist_meters : Infinity;
      const db = b.dist_meters != null ? b.dist_meters : Infinity;
      return da - db;
    });

    const top5 = validSpots.slice(0, LIMIT_PLACES);

    const isMatchFound = top5.length > 0 && top5[0].score > 0;

    // 프론트엔드 포맷 맞추기
    const places = top5.map(spot => ({
      id: String(spot.id),
      name: String(spot.name),
      description: spot.description_en ?? null,
      categories: spot.category_m ? [spot.category_m] : [],
      image_url: spot.image_url ?? null,
      link: null,
      is_pumwi_verified: spot.is_pumwi_verified === true,
      lat: null,
      lng: null,
      dist_meters: spot.dist_meters !== Infinity ? Number(spot.dist_meters) : null,
      address_en: spot.address_en ?? null,
    }));

    return NextResponse.json({
      places,
      noExactMatch: !isMatchFound, // 점수 받은 애가 한 명이라도 있으면 성공!
      fallbackSuggested: !isMatchFound,
      workshopOnlyMessage: requestedWasNonWorkshop,
    })
  } catch (err) {
    console.error('[concierge/places]', err)
    return NextResponse.json({ error: 'Places fetch failed.' }, { status: 500 })
  }
}