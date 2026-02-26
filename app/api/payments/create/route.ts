import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getDHLRate } from '@/lib/shippoClient'
import { getOriginAddress } from '@/lib/shippingOrigin'
import { calculateChargedShippingPrice } from '@/utils/shippingEngine'

/** POST /api/payments/create
 * Creates a pending order row and returns orderId for Toss requestPayment.
 * Body: { postId, orderName, amount, productId?, receiver_name?, receiver_phone?, shipping_address?, shipping_request?, shipping_country_code? }
 * Response: orderId, amount (totalAmount), orderName, charged_shipping_price_krw. Does NOT expose real_shipping_cost or margin.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const postId = body?.postId as string | undefined
    const productId = body?.productId as string | undefined
    const orderName = (body?.orderName as string)?.trim() || 'PUMWI 작품'
    const amount = typeof body?.amount === 'number' ? body.amount : parseInt(String(body?.amount), 10)
    const receiver_name = (body?.receiver_name as string)?.trim() || null
    const receiver_phone = (body?.receiver_phone as string)?.trim() || null
    const shipping_address = (body?.shipping_address as string)?.trim() || null
    const shipping_request = (body?.shipping_request as string)?.trim() || null
    const shipping_country_code = (body?.shipping_country_code as string)?.trim()?.toUpperCase()?.slice(0, 2) || null
    if (!postId) {
      return NextResponse.json(
        { error: 'Invalid body: postId required' },
        { status: 400 }
      )
    }

    const { data: post } = await supabase
      .from('posts')
      .select('id, user_id, type, price')
      .eq('id', postId)
      .single()
    if (!post || (post as { type: string }).type !== 'sales') {
      return NextResponse.json({ error: 'Post not found or not for sale' }, { status: 404 })
    }
    const sellerId = (post as { user_id: string }).user_id
    const linkedProductId = productId ?? null

    let finalAmount: number = Number.isFinite(amount) && amount >= 100 ? amount : 0
    if (linkedProductId) {
      const { data: product } = await supabase
        .from('products')
        .select('price')
        .eq('id', linkedProductId)
        .single()
      const productPrice = product != null ? (product as { price: number | null }).price : null
      if (productPrice != null && Number.isFinite(productPrice) && productPrice >= 100) {
        finalAmount = Math.round(Number(productPrice))
      }
    } else {
      const postPrice = (post as { price: number | null }).price
      if (postPrice != null && Number.isFinite(postPrice) && postPrice >= 100) {
        finalAmount = Math.round(Number(postPrice))
      }
    }
    if (!Number.isFinite(finalAmount) || finalAmount < 100) {
      return NextResponse.json(
        { error: 'Amount must be at least 100 KRW. Set product price or post price.' },
        { status: 400 }
      )
    }

    let real_shipping_cost_krw = 0
    let charged_shipping_price_krw = 0
    let shipping_margin_krw = 0
    let is_remote_area = false
    if (shipping_country_code) {
      const addressTo =
        body.shipping_postcode || body.shipping_street1 || body.shipping_city || body.shipping_state
          ? {
              country: shipping_country_code,
              zip: (body.shipping_postcode as string)?.trim(),
              street1: (body.shipping_street1 as string)?.trim(),
              street2: (body.shipping_street2 as string)?.trim(),
              city: (body.shipping_city as string)?.trim(),
              state: (body.shipping_state as string)?.trim(),
            }
          : undefined
      const originAddress = await getOriginAddress(supabase, sellerId)
      const quoteResult = await getDHLRate(shipping_country_code, 1.0, supabase, finalAmount, addressTo, originAddress ?? undefined)
      real_shipping_cost_krw = quoteResult.realCostKrw
      charged_shipping_price_krw = quoteResult.shipable ? calculateChargedShippingPrice(real_shipping_cost_krw) : 0
      shipping_margin_krw = charged_shipping_price_krw - real_shipping_cost_krw
      is_remote_area = quoteResult.isRemoteArea
    }

    const totalAmount = finalAmount + charged_shipping_price_krw

    const orderId = `pumwi_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

    const { error } = await supabase.from('orders').insert({
      post_id: postId,
      buyer_id: user.id,
      seller_id: sellerId,
      amount: finalAmount,
      order_id: orderId,
      order_name: orderName,
      status: 'pending',
      ...(linkedProductId && { product_id: linkedProductId }),
      ...(receiver_name != null && { receiver_name }),
      ...(receiver_phone != null && { receiver_phone }),
      ...(shipping_address != null && { shipping_address }),
      ...(shipping_request != null && { shipping_request }),
      delivery_status: '배송준비중',
      ...(shipping_country_code != null && {
        shipping_country_code: shipping_country_code,
        real_shipping_cost_krw: real_shipping_cost_krw,
        charged_shipping_price_krw: charged_shipping_price_krw,
        shipping_margin_krw: shipping_margin_krw,
        is_remote_area: is_remote_area,
      }),
    })
    if (error) {
      console.error('[payments/create]', error)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    return NextResponse.json({
      orderId,
      amount: totalAmount,
      orderName,
      charged_shipping_price_krw,
    })
  } catch (e) {
    console.error('[payments/create]', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
