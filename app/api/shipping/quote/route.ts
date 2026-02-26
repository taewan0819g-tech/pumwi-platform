import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getDHLRate } from '@/lib/shippoClient'
import { getOriginAddress } from '@/lib/shippingOrigin'
import { calculateChargedShippingPrice } from '@/utils/shippingEngine'

/**
 * GET /api/shipping/quote?country=US&weight=1&itemPrice=100000&postcode=...&street1=...&city=...&state=...&sellerId=...
 * Returns DHL shipping quote. Origin = seller address (address_main, zip_code, city) or platform_shipping_config when seller 미설정.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')?.trim()?.toUpperCase()?.slice(0, 2)
    const weight = Number(searchParams.get('weight')) || 1
    const itemPrice = searchParams.get('itemPrice') != null ? Number(searchParams.get('itemPrice')) : undefined
    const postcode = searchParams.get('postcode')?.trim()
    const street1 = searchParams.get('street1')?.trim()
    const street2 = searchParams.get('street2')?.trim()
    const city = searchParams.get('city')?.trim()
    const state = searchParams.get('state')?.trim()
    const sellerId = searchParams.get('sellerId')?.trim()
    if (!country) {
      return NextResponse.json({ error: 'country required' }, { status: 400 })
    }
    const supabase = await createClient()
    const addressTo =
      country && (postcode || street1 || city || state)
        ? { country, zip: postcode || undefined, street1: street1 || undefined, street2: street2 || undefined, city: city || undefined, state: state || undefined }
        : undefined

    const originAddress = await getOriginAddress(supabase, sellerId || null)
    let result: { realCostKrw: number; isRemoteArea: boolean; shipable: boolean }
    let shippingMessage: string | undefined
    if (sellerId && !originAddress) {
      result = { realCostKrw: 0, isRemoteArea: false, shipable: false }
      shippingMessage = '배송 설정을 완료해 주세요'
    } else {
      result = await getDHLRate(country, weight, supabase, itemPrice, addressTo, originAddress ?? undefined)
    }
    // Shippo 호출 결과 로깅 (getDHLRate 내부에서 raw Shippo 응답도 로그됨)
    console.log('=== DEBUG: Quote result ===', JSON.stringify({ country, addressTo, originAddress: originAddress ? 'present' : null, result }, null, 2))
    const charged = calculateChargedShippingPrice(result.realCostKrw)
    return NextResponse.json({
      charged_shipping_price_krw: result.shipable ? charged : 0,
      shipable: result.shipable,
      is_remote_area: result.isRemoteArea,
      ...(shippingMessage && { shipping_message: shippingMessage }),
    })
  } catch (e) {
    console.error('[shipping/quote]', e)
    return NextResponse.json({ error: 'Quote failed' }, { status: 500 })
  }
}
