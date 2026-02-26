import { NextResponse } from 'next/server'
import { validateAddress } from '@/lib/shippoClient'

/**
 * POST /api/shipping/validate-address
 * Body: { street1, city?, state?, postcode?, country_code }
 * Returns { valid: boolean, message?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const street1 = (body?.street1 ?? body?.address_line1 ?? body?.street) as string
    const city = body?.city as string | undefined
    const state = body?.state ?? body?.state_province as string | undefined
    const postcode = body?.postcode ?? body?.postal_code as string | undefined
    const country_code = (body?.country_code ?? body?.country) as string
    if (!street1?.trim() || !country_code?.trim()) {
      return NextResponse.json({ valid: false, message: 'Street and country required' }, { status: 400 })
    }
    const result = await validateAddress({
      address_line1: String(street1).trim(),
      city: city?.trim(),
      state_province: state?.trim(),
      postal_code: postcode?.trim(),
      country_code: String(country_code).trim().toUpperCase().slice(0, 2),
    })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[shipping/validate-address]', e)
    return NextResponse.json({ valid: false, message: 'Validation failed' }, { status: 500 })
  }
}
