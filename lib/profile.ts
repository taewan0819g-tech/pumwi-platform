import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types/profile'

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, cover_url, bio, value_philosophy, role, is_artist_pending, updated_at')
    .eq('id', user.id)
    .single()

  if (error) {
    // 프로필이 없으면 기본값 반환 (신규 유저)
    if (error.code === 'PGRST116') {
      return {
        id: user.id,
        full_name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '사용자',
        avatar_url: null,
        cover_url: null,
        bio: null,
        value_philosophy: null,
        role: 'user',
        is_artist_pending: false,
      }
    }
    return null
  }

  return data as unknown as Profile
}
