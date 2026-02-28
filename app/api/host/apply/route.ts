import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type HostApplicationType = 'artist' | 'space' | 'food'

const CATEGORY_L_MAP: Record<HostApplicationType, { category_l: string; category_m: string }> = {
  artist: { category_l: 'Art', category_m: 'craft' },
  space: { category_l: 'Culture', category_m: 'space' },
  food: { category_l: 'Food', category_m: 'cooking' },
}

/** experience_spots Insert 호환: 폼에서 전달하는 필드 (location은 RPC 내 ST_MakePoint(lng,lat)로 삽입) */
export interface HostApplyBody {
  application_type: HostApplicationType
  lat: number
  lng: number
  formatted_address: string
  detailed_address?: string
  application_details: {
    category_s?: string | null
    description_en?: string | null
    philosophy?: string | null
    mood_tags?: string[] | null
    anti_target?: string | null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Sign in required.' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as HostApplyBody
    const { application_type, lat, lng, formatted_address, detailed_address, application_details } = body

    if (
      application_type != null && application_type !== 'artist'
    ) {
      return NextResponse.json(
        { error: 'Bad request', details: 'Only artist applications are accepted.' },
        { status: 400 }
      )
    }
    const effectiveType: HostApplicationType = application_type === 'artist' ? 'artist' : 'artist'
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return NextResponse.json(
        { error: 'Bad request', details: 'lat and lng are required.' },
        { status: 400 }
      )
    }

    const { category_l, category_m } = CATEGORY_L_MAP[effectiveType]
    const category_s =
      application_details?.category_s != null && String(application_details.category_s).trim() !== ''
        ? String(application_details.category_s).trim().slice(0, 500)
        : 'Art'
    const name = category_s.slice(0, 200) || 'Host Venue'
    const description_en =
      application_details?.description_en != null && String(application_details.description_en).trim() !== ''
        ? String(application_details.description_en).trim()
        : null
    const philosophy =
      application_details?.philosophy != null && String(application_details.philosophy).trim() !== ''
        ? String(application_details.philosophy).trim()
        : null
    const mood_tags = Array.isArray(application_details?.mood_tags)
      ? application_details.mood_tags.filter((t) => typeof t === 'string').slice(0, 50)
      : null
    const anti_target =
      application_details?.anti_target != null && String(application_details.anti_target).trim() !== ''
        ? String(application_details.anti_target).trim()
        : null
    const address_en = [formatted_address, detailed_address].filter(Boolean).join(', ') || null

    const { data: spotId, error: rpcError } = await supabase.rpc('insert_experience_spot_from_host', {
      p_lat: lat,
      p_lng: lng,
      p_name: name,
      p_category_l: category_l,
      p_category_m: category_m,
      p_category_s: category_s,
      p_description_en: description_en,
      p_philosophy: philosophy,
      p_mood_tags: mood_tags,
      p_anti_target: anti_target,
      p_address_en: address_en,
    })

    if (rpcError) {
      console.error('[host/apply] RPC error:', rpcError)
      return NextResponse.json(
        { error: 'Insert failed', details: rpcError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, experience_spot_id: spotId })
  } catch (err) {
    console.error('[host/apply]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json(
      { error: 'Server error', details: message },
      { status: 500 }
    )
  }
}
