/**
 * Supabase orders + posts(embed) 쿼리 결과를 UI용 Row 타입으로 안전하게 변환하기 위한
 * 타입 가드 및 정규화 함수. 강제 형변환(as) 없이 런타임 검증만 사용합니다.
 */

/** UI에서 사용하는 posts 임베드 공통 형태 (OrderRow, ShipmentOrderRow) */
export type PostEmbed = {
  title: string
  image_url: string | null
  image_urls: string[] | null
}

/** 컬렉션용 posts 임베드 (id, price, user_id 포함) */
export type CollectionPostEmbed = {
  id: string
  title: string
  image_url: string | null
  image_urls: string[] | null
  price: number | null
  user_id: string
}

/** unknown이 null이 아닌 객체인지 검사 (타입 가드) */
export function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

/** Supabase posts 임베드(raw)를 단일 객체로 추출. 배열이면 첫 요소, 아니면 그대로 또는 null */
function extractSinglePostEmbed(postsRaw: unknown): Record<string, unknown> | null {
  if (postsRaw == null) return null
  if (Array.isArray(postsRaw) && postsRaw.length > 0) {
    const first = postsRaw[0]
    return isRecord(first) ? first : null
  }
  return isRecord(postsRaw) ? postsRaw : null
}

/**
 * raw posts 값을 PostEmbed | null 로 정규화. 형변환 없이 런타임 검증만 수행.
 */
export function normalizePostEmbed(postsRaw: unknown): PostEmbed | null {
  const obj = extractSinglePostEmbed(postsRaw)
  if (!obj) return null
  const title = typeof obj.title === 'string' ? obj.title : ''
  const image_url = typeof obj.image_url === 'string' ? obj.image_url : null
  const image_urls = Array.isArray(obj.image_urls)
    ? (obj.image_urls.filter((x): x is string => typeof x === 'string'))
    : null
  return { title, image_url, image_urls }
}

/**
 * raw posts 값을 CollectionPostEmbed | null 로 정규화. 형변환 없이 런타임 검증만 수행.
 */
export function normalizeCollectionPostEmbed(postsRaw: unknown): CollectionPostEmbed | null {
  const obj = extractSinglePostEmbed(postsRaw)
  if (!obj) return null
  const id = typeof obj.id === 'string' ? obj.id : ''
  const title = typeof obj.title === 'string' ? obj.title : ''
  const image_url = typeof obj.image_url === 'string' ? obj.image_url : null
  const image_urls = Array.isArray(obj.image_urls)
    ? (obj.image_urls.filter((x): x is string => typeof x === 'string'))
    : null
  const price = typeof obj.price === 'number' && Number.isFinite(obj.price) ? obj.price : null
  const user_id = typeof obj.user_id === 'string' ? obj.user_id : ''
  return { id, title, image_url, image_urls, price, user_id }
}

/** Record<string, unknown>에서 문자열 필드 안전 추출 */
export function str(r: Record<string, unknown>, key: string): string {
  const v = r[key]
  return typeof v === 'string' ? v : ''
}

/** Record<string, unknown>에서 number 필드 안전 추출 */
export function num(r: Record<string, unknown>, key: string): number {
  const v = r[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Record<string, unknown>에서 string | null 필드 안전 추출 */
export function strOrNull(r: Record<string, unknown>, key: string): string | null {
  const v = r[key]
  if (v == null) return null
  return typeof v === 'string' ? v : String(v)
}

/** Record<string, unknown>에서 boolean | null 필드 안전 추출 */
export function boolOrNull(r: Record<string, unknown>, key: string): boolean | null {
  const v = r[key]
  if (v == null) return null
  return typeof v === 'boolean' ? v : null
}

/** Record<string, unknown>에서 string[] | null 필드 안전 추출 */
export function strArrayOrNull(r: Record<string, unknown>, key: string): string[] | null {
  const v = r[key]
  if (!Array.isArray(v)) return null
  return v.filter((x): x is string => typeof x === 'string')
}

/** order가 seller_id를 갖는지 검사 (타입 가드) */
export function hasSellerId(x: unknown): x is Record<string, unknown> & { seller_id: string } {
  return isRecord(x) && typeof x.seller_id === 'string'
}
