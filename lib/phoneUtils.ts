import parsePhoneNumberFromString, { type CountryCode } from 'libphonenumber-js'

/**
 * 전화번호를 E.164 형식(+821012345678)으로 반환.
 * 유효하지 않으면 null.
 */
export function formatPhoneE164(nationalNumber: string, countryCode: CountryCode): string | null {
  if (!nationalNumber?.trim()) return null
  const parsed = parsePhoneNumberFromString(nationalNumber.trim(), countryCode)
  return parsed?.isValid() ? parsed.format('E.164') : null
}

/**
 * 전화번호 문자열이 해당 국가 형식으로 유효한지 검사.
 */
export function isValidPhoneNumber(nationalNumber: string, countryCode: CountryCode): boolean {
  if (!nationalNumber?.trim()) return false
  const parsed = parsePhoneNumberFromString(nationalNumber.trim(), countryCode)
  return parsed?.isValid() ?? false
}

/**
 * Shippo 등 외부 API 전달용: 전화번호를 E.164 형식으로 정규화.
 * 이미 + 포함이면 parse만, 아니면 country 기준으로 해석.
 */
export function toE164ForShippo(phone: string, countryCode?: CountryCode): string | null {
  if (!phone?.trim()) return null
  const trimmed = phone.trim()
  const parsed = trimmed.startsWith('+')
    ? parsePhoneNumberFromString(trimmed)
    : parsePhoneNumberFromString(trimmed, (countryCode as CountryCode) || 'KR')
  return parsed?.isValid() ? parsed.format('E.164') : null
}
