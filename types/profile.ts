export type ProfileRole = 'user' | 'artist' | 'admin' | 'collector' | 'pending_collector' | 'pending_artist'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  cover_url: string | null
  /** 배경 이미지 (DB에 background_url 컬럼이 있으면 사용, 없으면 cover_url 사용) */
  background_url?: string | null
  bio: string | null
  value_philosophy: string | null
  /** 작업실 위치 (예: 서울 성수동) — deprecated, use address_main */
  studio_location?: string | null
  /** Google 기본 주소 (지도·프로필 지역명 및 Shippo 픽업지) */
  address_main?: string | null
  /** 상세 주소 (Apartment, Suite 등). is_address_detail_public일 때만 프로필 노출 */
  address_detail?: string | null
  /** 우편번호 (Shippo 배송비 계산용) */
  zip_code?: string | null
  /** true일 때만 프로필에 상세 주소 노출 */
  is_address_detail_public?: boolean | null
  /** Shippo 픽업지: 도로 주소 */
  workshop_street1?: string | null
  workshop_city?: string | null
  workshop_state?: string | null
  workshop_zip?: string | null
  workshop_country?: string | null
  /** 활동 지역: 도시 (profiles.city) */
  city?: string | null
  /** 활동 지역: 국가 (profiles.country, 예: kr, jp, usa 또는 기타 입력값) */
  country?: string | null
  /** 위도 (Google Places 선택 시 저장) */
  lat?: number | null
  /** 경도 (Google Places 선택 시 저장) */
  lng?: number | null
  role: ProfileRole
  /** 본인/주소 확인 여부 (컬렉터 신청 시 사용) */
  verified?: boolean | null
  /** 컬렉터 상세 프로필 (컬렉터 신청 시 작성) */
  collector_bio?: string | null
  is_artist_pending: boolean
  updated_at?: string
}

export interface Career {
  id: string
  user_id: string
  company_name: string
  title: string
  start_date: string
  end_date: string | null
  description: string | null
  created_at?: string
}

export type PostType = 'work_log' | 'studio_log' | 'sales' | 'exhibition'

export interface Post {
  id: string
  user_id: string
  type: PostType
  title: string
  content: string | null
  image_url: string | null
  /** 다중 이미지 URL (DB 컬럼 image_urls, text[] 또는 JSONB) */
  image_urls?: string[] | null
  price: number | null
  /** 서비스 티어: standard | care | global (Collect 정산용) */
  service_tier?: string | null
  /** 에디션 현재 번호 (예: 1) */
  edition_number?: number | null
  /** 에디션 총 수량 (예: 5) */
  edition_total?: number | null
  created_at: string
  updated_at?: string
}

export interface Recommendation {
  id: string
  /** 받는 사람(대상) ID */
  user_id: string
  target_user_id?: string
  author_id: string
  /** 추천인 이름 (DB 컬럼) */
  writer_name?: string | null
  /** 추천인 직함/관계 (DB 컬럼) */
  writer_role?: string | null
  content: string
  created_at: string
}
