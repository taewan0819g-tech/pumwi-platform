import type { SupabaseClient } from '@supabase/supabase-js'

export interface ProfileAddressRow {
  address_main?: string | null
  address_detail?: string | null
  zip_code?: string | null
}

export interface OriginAddress {
  name?: string
  street1: string
  city: string
  state?: string
  zip: string
  country: string
}

function normalizeCountry(c: string | null | undefined): string {
  if (!c?.trim()) return 'KR'
  // Syntax Error 해결: 괄호 추가
  return (c.trim().toUpperCase().slice(0, 2)) || 'KR'
}

export function buildOriginFromProfile(p: ProfileAddressRow | null): OriginAddress | null {
  if (!p || !p.address_main || !p.zip_code) return null
  const main = p.address_main.trim()
  const city = main.split(',')[1]?.trim() || 'Seoul'
  return {
    street1: p.address_detail ? `${main} ${p.address_detail}` : main,
    city: city,
    zip: p.zip_code.trim(),
    country: 'KR',
  }
}

export async function getOriginAddress(supabase: SupabaseClient, sellerId: string | null): Promise<OriginAddress | null> {
  if (sellerId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('address_main, address_detail, zip_code')
      .eq('id', sellerId)
      .maybeSingle()
    const origin = buildOriginFromProfile(profile as ProfileAddressRow | null)
    if (origin) return origin
  }
  // DB 구조에 맞게 수정: key 대신 id=1 사용
  const { data: config } = await supabase
    .from('platform_shipping_config')
    .select('company_name, street_address, city, state, zip_code, country_code')
    .eq('id', 1)
    .maybeSingle()
  
  if (!config) return null
  return {
    name: config.company_name || 'PUMWI',
    street1: config.street_address || '',
    city: config.city || 'Seoul',
    state: config.state || '',
    zip: config.zip_code || '',
    country: config.country_code || 'KR',
  }
}