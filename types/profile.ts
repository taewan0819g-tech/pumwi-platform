export type ProfileRole = 'user' | 'artist' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  cover_url: string | null
  /** 배경 이미지 (DB에 background_url 컬럼이 있으면 사용, 없으면 cover_url 사용) */
  background_url?: string | null
  bio: string | null
  value_philosophy: string | null
  /** 작업실 위치 (예: 서울 성수동) */
  studio_location?: string | null
  role: ProfileRole
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
