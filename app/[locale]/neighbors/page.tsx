import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NeighborsClient from './NeighborsClient'

export default async function NeighborsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <NeighborsClient currentUserId={user.id} />
}
