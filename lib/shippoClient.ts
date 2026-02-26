import type { SupabaseClient } from '@supabase/supabase-js'
import type { CountryCode } from 'libphonenumber-js'
import { toE164ForShippo } from '@/lib/phoneUtils'

const SHIPPO_SHIPMENTS_URL = 'https://api.goshippo.com/shipments'

/** .env.local의 SHIPPO_API_KEY 사용. Shippo 응답은 USD이므로 KRW로 변환. */
const DEFAULT_USD_TO_KRW = 1350

/** Shippo/Zone 실패 시 사용하는 기본 배송비 (KRW). */
const FALLBACK_SHIPPING_KRW = 50000

interface ShippoRate {
  amount?: string
  currency?: string
  carrier?: string
  carrier_account?: string
  servicelevel?: { token?: string; name?: string }
  attributes?: string[]
  [key: string]: unknown
}

interface ShippoShipmentResponse {
  rates?: ShippoRate[]
  status?: string
  [key: string]: unknown
}

export interface DHLQuoteResult {
  realCostKrw: number
  isRemoteArea: boolean
  shipable: boolean
}

/**
 * Shippo API(SHIPPO_API_KEY)로 배송지 국가의 DHL Express 실시간 요금 조회.
 * address_from(픽업지): originAddress(seller 워크샵)가 있으면 요금 계산용으로 사용, 없으면 PUMWI 본사(env) 사용.
 * 보험: insuranceAmountKrw 있으면 extra.insurance 포함.
 * @param addressTo 수령지 상세(우편번호 등). 있으면 rate 정확도 향상.
 * @param originAddress 선택; 주문 seller의 워크샵 주소. 요금 계산용 픽업지. 없으면 SHIPPO_ORIGIN_* (PUMWI 본사) 사용.
 * @returns { realCostKrw, isRemoteArea, shipable }. 호출측에서 5,000원 단위 올림 적용.
 */
export async function getDHLRate(
  destinationCountryCode: string,
  weightKg: number = 1.0,
  supabase?: SupabaseClient,
  insuranceAmountKrw?: number,
  addressTo?: { street1?: string; street2?: string; city?: string; state?: string; zip?: string; country: string },
  originAddress?: { name?: string; street1: string; city: string; state?: string; zip: string; country: string }
): Promise<DHLQuoteResult> {
  const apiKey = process.env.SHIPPO_API_KEY || process.env.SHIPPO_SECRET_KEY
  const usdToKrw = Number(process.env.SHIPPO_USD_TO_KRW) || DEFAULT_USD_TO_KRW
  const notShipable: DHLQuoteResult = { realCostKrw: 0, isRemoteArea: false, shipable: false }

  if (apiKey) {
    try {
      const addressFrom = originAddress
        ? {
            name: originAddress.name || 'Seller',
            street1: (originAddress.street1 || 'Address').trim(),
            city: (originAddress.city || 'City').trim(),
            state: (originAddress.state || '').trim(),
            zip: (originAddress.zip || '00000').trim(),
            country: (originAddress.country || 'KR').toUpperCase().slice(0, 2),
          }
        : {
            name: process.env.SHIPPO_ORIGIN_NAME || 'PUMWI',
            street1: process.env.SHIPPO_ORIGIN_STREET || '123 Origin St',
            city: process.env.SHIPPO_ORIGIN_CITY || 'Seoul',
            state: process.env.SHIPPO_ORIGIN_STATE || '',
            zip: process.env.SHIPPO_ORIGIN_ZIP || '04500',
            country: process.env.SHIPPO_ORIGIN_COUNTRY || 'KR',
          }
      const toCountry = (addressTo?.country || destinationCountryCode).toUpperCase().slice(0, 2)
      const addressToPayload = {
        name: 'Recipient',
        street1: (addressTo?.street1 || 'Address line').trim() || 'Address line',
        street2: (addressTo?.street2 || '').trim() || '',
        city: (addressTo?.city || 'City').trim() || 'City',
        state: (addressTo?.state || 'State').trim() || 'State',
        zip: (addressTo?.zip || '00000').trim() || '00000',
        country: toCountry,
      }
      const parcels = [
        {
          length: '20',
          width: '20',
          height: '10',
          distance_unit: 'cm',
          weight: String(weightKg),
          mass_unit: 'kg',
        },
      ]

      const body: Record<string, unknown> = {
        address_from: addressFrom,
        address_to: addressToPayload,
        parcels,
      }
      if (Number.isFinite(insuranceAmountKrw) && insuranceAmountKrw! > 0) {
        body.extra = {
          insurance: {
            amount: String(Math.round(insuranceAmountKrw!)),
            currency: 'KRW',
            content: 'artwork',
          },
        }
      }

      const res = await fetch(SHIPPO_SHIPMENTS_URL, {
        method: 'POST',
        headers: {
          Authorization: `ShippoToken ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = (await res.json().catch(() => ({}))) as ShippoShipmentResponse
      if (res.ok && Array.isArray(data.rates) && data.rates.length > 0) {
        const dhl = data.rates.find(
          (r) =>
            (r.carrier && r.carrier.toUpperCase().includes('DHL')) ||
            (r.carrier_account && String(r.carrier_account).toUpperCase().includes('DHL')) ||
            (r.servicelevel?.name && r.servicelevel.name.toUpperCase().includes('DHL'))
        )
        if (dhl && dhl.amount != null) {
          const amountUsd = parseFloat(String(dhl.amount))
          if (Number.isFinite(amountUsd)) {
            const realCostKrw = Math.round(amountUsd * usdToKrw)
            const attrs = (dhl.attributes || []) as string[]
            const serviceName = (dhl.servicelevel?.name || '').toUpperCase()
            const isRemoteArea =
              attrs.some((a) => String(a).toUpperCase().includes('REMOTE') || String(a).toUpperCase().includes('EXTENDED') || String(a).toUpperCase().includes('SURCHARGE')) ||
              serviceName.includes('REMOTE') ||
              serviceName.includes('EXTENDED')
            return { realCostKrw, isRemoteArea, shipable: true }
          }
        }
        return notShipable
      }
      if (!res.ok || !Array.isArray(data.rates) || data.rates.length === 0) {
        const msgText = Array.isArray(data.messages) && data.messages[0] && typeof data.messages[0] === 'object' && data.messages[0] !== null && 'text' in data.messages[0]
          ? String((data.messages[0] as { text?: string }).text)
          : ''
        console.error(`[Shipping Error] No rates found${msgText ? `: ${msgText}` : ''} (status: ${res.status})`)
      }
      return notShipable
    } catch (err) {
      console.warn('[shippoClient] getDHLRate Shippo request failed:', err)
      return notShipable
    }
  } else {
    console.warn('[shippoClient] SHIPPO_API_KEY not set')
  }

  // Zone-based fallback from DB (no remote/shipable info)
  if (supabase && destinationCountryCode) {
    try {
      const countryUpper = destinationCountryCode.toUpperCase().slice(0, 2)
      const { data: zoneRow } = await supabase
        .from('country_zone_map')
        .select('zone_id')
        .eq('country_code', countryUpper)
        .maybeSingle()
      const zoneId = (zoneRow as { zone_id?: string } | null)?.zone_id
      if (zoneId) {
        const { data: zoneData } = await supabase
          .from('shipping_zones')
          .select('rate_krw, rate_usd')
          .eq('id', zoneId)
          .maybeSingle()
        const z = zoneData as { rate_krw?: number; rate_usd?: number } | null
        if (z?.rate_krw != null && Number.isFinite(z.rate_krw)) {
          return { realCostKrw: Math.round(Number(z.rate_krw)), isRemoteArea: false, shipable: true }
        }
        if (z?.rate_usd != null && Number.isFinite(z.rate_usd)) {
          const usdToKrwEnv = Number(process.env.SHIPPO_USD_TO_KRW) || DEFAULT_USD_TO_KRW
          return { realCostKrw: Math.round(Number(z.rate_usd) * usdToKrwEnv), isRemoteArea: false, shipable: true }
        }
      }
    } catch (e) {
      console.warn('[shippoClient] Zone fallback failed:', e)
    }
  }

  return { ...notShipable, realCostKrw: FALLBACK_SHIPPING_KRW }
}

const SHIPPO_VALIDATE_URL = 'https://api.goshippo.com/v2/addresses/validate'

export interface ValidateAddressParams {
  address_line1: string
  city?: string
  state_province?: string
  postal_code?: string
  country_code: string
}

export interface ValidateAddressResult {
  valid: boolean
  message?: string
  validation_result?: string
}

/**
 * Shippo Address Validation API. Requires live API token.
 * GET .../validate?address_line_1=...&city_locality=...&state_province=...&postal_code=...&country_code=...
 */
export async function validateAddress(params: ValidateAddressParams): Promise<ValidateAddressResult> {
  const apiKey = process.env.SHIPPO_API_KEY || process.env.SHIPPO_SECRET_KEY
  if (!apiKey) {
    return { valid: false, message: 'Shipping not configured' }
  }
  try {
    const q = new URLSearchParams()
    q.set('address_line1', params.address_line1.trim())
    if (params.city?.trim()) q.set('city_locality', params.city.trim())
    if (params.state_province?.trim()) q.set('state_province', params.state_province.trim())
    if (params.postal_code?.trim()) q.set('postal_code', params.postal_code.trim())
    q.set('country_code', params.country_code.toUpperCase().slice(0, 2))
    const res = await fetch(`${SHIPPO_VALIDATE_URL}?${q.toString()}`, {
      method: 'GET',
      headers: { Authorization: `ShippoToken ${apiKey}` },
    })
    const data = (await res.json().catch(() => ({}))) as {
      validation_result?: { is_valid?: boolean; messages?: Array<{ text?: string }> }
      [key: string]: unknown
    }
    if (!res.ok) {
      const msg = (data as { message?: string }).message || (data?.validation_result as { messages?: Array<{ text?: string }> })?.messages?.[0]?.text || 'Address validation failed'
      return { valid: false, message: msg }
    }
    const result = data.validation_result as { is_valid?: boolean; messages?: Array<{ text?: string }> } | undefined
    const valid = result?.is_valid === true
    const message = result?.messages?.[0]?.text
    return { valid, message, validation_result: valid ? 'valid' : 'invalid' }
  } catch (e) {
    console.warn('[shippoClient] validateAddress failed:', e)
    return { valid: false, message: 'Could not validate address' }
  }
}

const SHIPPO_TRANSACTIONS_URL = 'https://api.goshippo.com/transactions'
const SHIPPO_PICKUPS_URL = 'https://api.goshippo.com/pickups'

export interface CreatePickupParams {
  transactionId: string
  addressFrom: {
    name?: string
    street1: string
    city: string
    state?: string
    zip: string
    country: string
    phone?: string
    email?: string
  }
  /** YYYY-MM-DD */
  preferredDate: string
  timeSlot: 'am' | 'pm'
}

export interface CreatePickupResult {
  success: boolean
  confirmationCode?: string
  objectId?: string
  status?: string
  message?: string
}

/**
 * Shippo Pickup API: GET transaction으로 carrier_account 확인 후 POST /pickups로 방문 예약.
 * address_from = 장인 워크샵 주소, transactions = [transactionId], requested_start/end_time = 희망일+오전/오후(KST 기준).
 */
export async function createPickupRequest(params: CreatePickupParams): Promise<CreatePickupResult> {
  const apiKey = process.env.SHIPPO_API_KEY || process.env.SHIPPO_SECRET_KEY
  if (!apiKey) {
    return { success: false, message: 'SHIPPO_API_KEY not set' }
  }
  try {
    const trRes = await fetch(`${SHIPPO_TRANSACTIONS_URL}/${params.transactionId}`, {
      method: 'GET',
      headers: { Authorization: `ShippoToken ${apiKey}` },
    })
    const trData = (await trRes.json().catch(() => ({}))) as { carrier_account?: string; object_id?: string; [key: string]: unknown }
    if (!trRes.ok || !trData.carrier_account) {
      const msg = (trData as { message?: string }).message || 'Transaction not found or invalid'
      return { success: false, message: String(msg) }
    }
    const carrierAccount = String(trData.carrier_account).trim()

    const dateStr = params.preferredDate
    const isAm = params.timeSlot === 'am'
    const startTime = new Date(`${dateStr}T${isAm ? '09:00' : '13:00'}:00+09:00`)
    const endTime = new Date(`${dateStr}T${isAm ? '12:00' : '18:00'}:00+09:00`)
    const requested_start_time = startTime.toISOString()
    const requested_end_time = endTime.toISOString()

    const a = params.addressFrom
    const phoneE164 = a.phone ? toE164ForShippo(a.phone, (a.country || 'KR') as CountryCode) : null
    const pickupBody = {
      carrier_account: carrierAccount,
      location: {
        address: {
          name: (a.name || 'Seller').replace(/[/&*]/g, ' ').trim() || 'Seller',
          company: '',
          street1: (a.street1 || 'Address').replace(/[/&*]/g, ' ').trim(),
          street2: '',
          city: (a.city || 'City').replace(/[/&*]/g, ' ').trim(),
          state: (a.state || '').replace(/[/&*]/g, ' ').trim(),
          zip: (a.zip || '00000').trim(),
          country: (a.country || 'KR').toUpperCase().slice(0, 2),
          phone: phoneE164 || (a.phone || '').replace(/[/&*]/g, ' ').trim() || '+821012345678',
          email: (a.email || '').replace(/[/&*]/g, ' ').trim() || 'seller@pumwi.com',
        },
        building_location_type: 'Front Door',
        building_type: null as string | null,
        instructions: '',
      },
      transactions: [params.transactionId],
      requested_start_time,
      requested_end_time,
      is_test: process.env.NODE_ENV !== 'production',
    }

    const pickRes = await fetch(SHIPPO_PICKUPS_URL, {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pickupBody),
    })
    const pickData = (await pickRes.json().catch(() => ({}))) as {
      confirmation_code?: string
      object_id?: string
      status?: string
      messages?: Array<{ text?: string }>
      message?: string
      [key: string]: unknown
    }
    if (!pickRes.ok) {
      const msg = pickData.messages?.[0]?.text || (pickData as { message?: string }).message || 'Pickup request failed'
      return { success: false, message: String(msg) }
    }
    return {
      success: true,
      confirmationCode: pickData.confirmation_code,
      objectId: pickData.object_id,
      status: pickData.status,
    }
  } catch (err) {
    console.warn('[shippoClient] createPickupRequest failed:', err)
    return { success: false, message: err instanceof Error ? err.message : 'Pickup request failed' }
  }
}
