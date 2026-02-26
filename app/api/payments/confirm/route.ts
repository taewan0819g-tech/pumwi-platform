import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getActivePricingRules } from '@/lib/pricingEngineServer'
import { calculatePayoutRounded } from '@/utils/pricingEngine'

const TOSS_CONFIRM_URL = 'https://api.tosspayments.com/v1/payments/confirm'

/** POST /api/payments/confirm
 * Body: { paymentKey, orderId, amount }
 * Confirms payment with Toss, then updates orders with server-side fee snapshot.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const paymentKey = body?.paymentKey as string | undefined
    const orderId = body?.orderId as string | undefined
    const amount = typeof body?.amount === 'number' ? body.amount : parseInt(String(body?.amount), 10)
    if (!paymentKey?.trim() || !orderId?.trim() || !Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { error: 'Invalid body: paymentKey, orderId, amount(>=100) required' },
        { status: 400 }
      )
    }

    const secretKey = process.env.TOSS_SECRET_KEY
    if (!secretKey) {
      console.error('[payments/confirm] TOSS_SECRET_KEY not set')
      return NextResponse.json({ error: 'Payment not configured' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: row } = await supabase
      .from('orders')
      .select('id, amount, status, product_id, post_id')
      .eq('order_id', orderId)
      .single()
    if (!row) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const storedAmount = (row as { amount: number }).amount
    const status = (row as { status: string }).status
    const productId = (row as { product_id: string | null }).product_id
    const postId = (row as { post_id: string }).post_id
    if (status === 'paid') {
      return NextResponse.json({ error: 'Already paid', orderId }, { status: 400 })
    }
    if (storedAmount !== amount) {
      return NextResponse.json(
        { error: 'Amount mismatch', expected: storedAmount, received: amount },
        { status: 400 }
      )
    }

    // 1. Resolve price and tier from DB only (do not trust client)
    let priceKrwt: number = storedAmount
    let serviceTier: string = 'standard'

    if (postId) {
      const { data: post } = await supabase
        .from('posts')
        .select('price, service_tier, product_id')
        .eq('id', postId)
        .single()
      if (post) {
        const p = post as { price: number | null; service_tier: string | null; product_id: string | null }
        if (p.price != null && Number.isFinite(p.price) && p.price >= 100) priceKrwt = Math.round(Number(p.price))
        if (p.service_tier && ['standard', 'care', 'global'].includes(p.service_tier)) serviceTier = p.service_tier
        if (!p.service_tier && p.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('service_tier')
            .eq('id', p.product_id)
            .single()
          if (product && (product as { service_tier: string }).service_tier)
            serviceTier = (product as { service_tier: string }).service_tier
        }
      }
    }
    if (productId && serviceTier === 'standard') {
      const { data: product } = await supabase
        .from('products')
        .select('service_tier')
        .eq('id', productId)
        .single()
      if (product && (product as { service_tier: string }).service_tier)
        serviceTier = (product as { service_tier: string }).service_tier
    }

    // 2. Pricing Engine server-side: active rules only
    const rules = await getActivePricingRules(supabase)
    let payout = calculatePayoutRounded(priceKrwt, serviceTier, rules)
    if (!payout) {
      console.warn('[payments/confirm] DB 규칙 없음. 하드코딩된 Fallback 가동:', serviceTier)
      const rates: Record<string, number> = { standard: 0.2, care: 0.3, global: 0.4 }
      const rate = rates[serviceTier] ?? 0.2
      payout = {
        applied_rule_id: 'fallback_rule',
        applied_rate: rate,
        platform_fee: Math.round(priceKrwt * rate),
        artisan_payout: Math.round(priceKrwt * (1 - rate)),
      }
    }

    const pgFeePercent = 0.035
    const pgFee = Math.round(amount * pgFeePercent)

    const auth = Buffer.from(`${secretKey}:`, 'utf8').toString('base64')
    const res = await fetch(TOSS_CONFIRM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
    const data = await res.json().catch(() => ({}))
    console.log('[payments/confirm] Toss 승인 응답:', { ok: res.ok, status: res.status, data })
    if (!res.ok) {
      console.error('[payments/confirm] Toss error', res.status, data)
      await supabase
        .from('orders')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('order_id', orderId)
      return NextResponse.json(
        { error: data?.message || 'Payment confirmation failed', code: data?.code },
        { status: res.status >= 400 ? res.status : 502 }
      )
    }

    // 토스 승인 성공 → orders 테이블 업데이트 (status=paid, payment_key, 수수료 등)
    const updatePayload = {
      status: 'paid' as const,
      payment_key: paymentKey,
      service_tier: serviceTier,
      pg_fee: pgFee,
      platform_fee: payout.platform_fee,
      artisan_payout: payout.artisan_payout,
      applied_rule_id: payout.applied_rule_id,
      applied_rate: payout.applied_rate,
      updated_at: new Date().toISOString(),
    }
    console.log('[payments/confirm] orders 업데이트 시도:', { order_id: orderId, payload: updatePayload })
    const { error: updateError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('order_id', orderId)
    if (updateError) {
      console.error('[payments/confirm] DB update 실패 상세:', {
        message: updateError.message,
        details: updateError.details,
        code: updateError.code,
        hint: updateError.hint,
        payload: updatePayload,
      })
      return NextResponse.json(
        { error: 'Payment confirmed but record update failed' },
        { status: 500 }
      )
    }
    console.log('[payments/confirm] orders 업데이트 완료:', orderId)

    return NextResponse.json({ success: true, orderId })
  } catch (e) {
    console.error('[payments/confirm]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
