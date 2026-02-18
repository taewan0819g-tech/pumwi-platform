import { createClient } from '@/lib/supabase/server'
import NearbyPageClient from './NearbyPageClient'

export default async function NearbyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return <NearbyPageClient currentUserId={user?.id ?? null} />
}
