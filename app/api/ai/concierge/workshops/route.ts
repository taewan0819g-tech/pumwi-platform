import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

export const dynamic = 'force-dynamic'

const LIMIT_PLACES = 5
const MAX_METERS_NATIONWIDE = 500_000

type ExperienceSpotRow = Database['public']['Tables']['experience_spots']['Row']
type NearbyRpcRow = Database['public']['Functions']['get_nearby_experiences']['Returns'][number] extends infer R ? R : never

export interface Workshop {
  id: string
  name: string
  description: string | null
  categories: string[]
  image_url: string | null
  link: string | null
  dist_meters?: number | null
  is_pumwi_verified?: boolean
  lat?: number | null
  lng?: number | null
  address_en?: string | null
}

const selectCols = 'id, name, description_en, category_m, category_s, category_l, image_url, is_pumwi_verified, mood_tags, anti_target, address_en'

function calculateScore(
  row: { category_m?: string | null; category_s?: string | null; mood_tags?: string[] | null; description_en?: string | null },
  params: { category_m?: string; category_s?: string; moodKeywords: string[] }
): number {
  const lower = (s: string) => (s ?? '').trim().toLowerCase()
  let score = 0

  if (params.category_m && row.category_m && lower(row.category_m) === lower(params.category_m)) score += 50
  if (params.category_s && row.category_s && lower(row.category_s) === lower(params.category_s)) score += 30

  if (params.moodKeywords.length > 0) {
    const text = [(row.description_en ?? ''), ...(Array.isArray(row.mood_tags) ? row.mood_tags : [])].join(' ').toLowerCase()
    const hasMatch = params.moodKeywords.some((kw) => {
      const k = lower(kw)
      return k && text.includes(k)
    })
    if (hasMatch) score += 20
  }
  return score
}

function toWorkshop(row: ExperienceSpotRow & { dist_meters?: number | null }): Workshop {
  return {
    id: row.id,
    name: row.name,
    description: row.description_en ?? null,
    categories: row.category_m ? [row.category_m] : [],
    image_url: row.image_url ?? null,
    link: null,
    dist_meters: row.dist_meters ?? null,
    is_pumwi_verified: row.is_pumwi_verified === true,
    lat: null,
    lng: null,
    address_en: row.address_en ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category_l = searchParams.get('category_l')?.trim() || undefined
    const category_m = searchParams.get('category_m')?.trim() || undefined
    const category_s = searchParams.get('category_s')?.trim() || undefined
    const moodKeywordsParam = searchParams.get('mood_keywords')?.trim()
    const latParam = searchParams.get('lat')
    const lngParam = searchParams.get('lng')

    const moodKeywords = moodKeywordsParam ? moodKeywordsParam.split(',').map((k) => k.trim()).filter(Boolean) : []
    const lat = latParam != null ? Number(latParam) : null
    const lng = lngParam != null ? Number(lngParam) : null

    if (lat == null || lng == null) {
      return NextResponse.json({ error: 'Location required.' }, { status: 400 })
    }

    const effectiveCategoryL = category_l && category_l.trim().length > 0 ? category_l.trim() : 'Workshop'
    const supabase = await createClient()

    const { data: rpcData, error: rpcError } = await supabase.rpc('get_ai_distances', {
      user_lat: lat,
      user_lng: lng,
      target_category: effectiveCategoryL
    })

    console.log("🔥 [긴급] DB 함수 에러:", rpcError);
    console.log("🔥 [긴급] DB에서 가져온 데이터 갯수:", rpcData?.length);

    if (rpcError || !Array.isArray(rpcData) || rpcData.length === 0) {
      return NextResponse.json({ places: [], noExactMatch: true, fallbackSuggested: false, workshopOnlyMessage: false })
    }

    const rpcList = rpcData as NearbyRpcRow[]
    const ids = rpcList.map((r) => r.id).filter(Boolean)

    const { data: spots } = await supabase.from('experience_spots').select(selectCols).in('id', ids)

    if (!spots?.length) {
      return NextResponse.json({ places: [], noExactMatch: true, fallbackSuggested: false, workshopOnlyMessage: false })
    }

    const spotMap = new Map(spots.map((s) => [s.id, s]))

    type Scored = { row: ExperienceSpotRow & { dist_meters: number | null }; dist_meters: number | null; score: number }
    const scored: Scored[] = rpcList
      .map((r) => {
        const spot = spotMap.get(r.id) as ExperienceSpotRow | undefined
        if (!spot) return null
        const score = calculateScore(spot, { category_m, category_s, moodKeywords })
        return { row: { ...spot, dist_meters: r.dist_meters ?? null }, dist_meters: r.dist_meters ?? null, score }
      })
      .filter((s): s is NonNullable<typeof s> => s != null)

    // 1. 점수가 0보다 큰(조금이라도 관련이 있는) 공방만 필터링 (합격자 추려내기)
    let validSpots = scored.filter(s => s.score > 0);

    // 2. 만약 관련 있는 공방이 하나도 없다면, 전체 공방을 대상으로 함 (Fallback)
    if (validSpots.length === 0) {
      validSpots = scored;
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

    // 🔥 원인 파악을 위한 X-ray 로그
    console.log("🔥 1. DB에서 가져온 데이터 수 (rpcData):", rpcData?.length);
    console.log("🔥 2. 상세 정보 가져온 수 (spots):", spots?.length);
    console.log("🔥 3. 상위 5개 점수 현황:", top5.map(s => ({ name: s.row.name, score: s.score })));
    console.log("🔥 4. 최종 매칭 성공 여부 (isMatchFound):", isMatchFound);

    return NextResponse.json({
      places: top5.map((s) => toWorkshop(s.row)),
      noExactMatch: !isMatchFound, // true면 '못 찾았다' 메시지 뜸, false면 정상 노출
      fallbackSuggested: !isMatchFound,
      workshopOnlyMessage: false,
    })
  } catch (err) {
    console.error('[concierge/workshops]', err)
    return NextResponse.json({ error: 'Workshops fetch failed.' }, { status: 500 })
  }
}