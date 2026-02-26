import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { createPickupRequest } from '@/lib/shippoClient'
import { buildOriginFromProfile } from '@/lib/shippingOrigin'

/**
 * POST /api/shipping/pickup
 * Body: { orderId: string, preferredDate: string (YYYY-MM-DD), timeSlot: 'am' | 'pm' }
 * 장인 본인 주문에 한해 Shippo Pickup 요청 후 주문 상태를 pickup_requested로 갱신.
 * 출발지 = profiles.address_main, address_detail, zip_code, city, country 사용.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const orderId = (body.orderId as string)?.trim()
    const preferredDate = (body.preferredDate as string)?.trim()
    const timeSlot = body.timeSlot === 'pm' ? 'pm' : 'am'

    if (!orderId || !preferredDate) {
      return NextResponse.json(
        { error: 'orderId and preferredDate (YYYY-MM-DD) required' },
        { status: 400 }
      )
    }
    const dateMatch = /^\d{4}-\d{2}-\d{2}$/.test(preferredDate)
    if (!dateMatch) {
      return NextResponse.json(
        { error: 'preferredDate must be YYYY-MM-DD' },
        { status: 400 }
      )
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_id, seller_id, shippo_transaction_id')
      .eq('order_id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const o = order as { seller_id: string; shippo_transaction_id?: string | null }
    if (o.seller_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!o.shippo_transaction_id?.trim()) {
      return NextResponse.json(
        { error: '운송장(Label) 생성이 완료된 주문만 방문 예약을 요청할 수 있습니다. Shippo Transaction ID를 저장해 주세요.' },
        { status: 400 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, address_main, address_detail, zip_code, city, country')
      .eq('id', user.id)
      .single()

    const p = profile as {
      full_name?: string | null
      address_main?: string | null
      address_detail?: string | null
      zip_code?: string | null
      city?: string | null
      country?: string | null
    } | null

    const origin = buildOriginFromProfile(p)
    if (!origin) {
      return NextResponse.json(
        { error: '배송 설정(기본 주소·우편번호)을 완료한 후 픽업을 요청해 주세요.' },
        { status: 400 }
      )
    }

    const result = await createPickupRequest({
      transactionId: o.shippo_transaction_id.trim(),
      addressFrom: {
        name: p?.full_name || 'Seller',
        ...origin,
      },
      preferredDate,
      timeSlot,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || '픽업 예약 요청에 실패했습니다.' },
        { status: 422 }
      )
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        delivery_status: 'pickup_requested',
        pickup_confirmation_code: result.confirmationCode || null,
        pickup_requested_at: new Date().toISOString(),
        pickup_time_slot: timeSlot,
        pickup_object_id: result.objectId || null,
      })
      .eq('order_id', orderId)

    if (updateError) {
      console.error('[pickup] order update failed', updateError)
      return NextResponse.json(
        { error: '픽업 예약은 완료되었으나 주문 상태 저장에 실패했습니다.', confirmation_code: result.confirmationCode },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      confirmation_code: result.confirmationCode,
      message: result.confirmationCode
        ? `DHL 픽업 예약이 완료되었습니다. (예약번호: ${result.confirmationCode})`
        : 'DHL 픽업 예약이 완료되었습니다.',
    })
  } catch (e) {
    console.error('[pickup]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
