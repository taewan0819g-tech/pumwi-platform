import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import ProfileClient from '../ProfileClient'
import type { Profile } from '@/types/profile'

interface ProfileUserIdPageProps {
  params: Promise<{ userId: string }>
}

export default async function ProfileUserIdPage({ params }: ProfileUserIdPageProps) {
  const { userId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  if (user.id === userId) {
    redirect('/profile')
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error || !data) {
    notFound()
  }

  const initialProfile = data as unknown as Profile
  return <ProfileClient serverUser={user} initialProfile={initialProfile} />
}
