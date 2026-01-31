'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveApplication(applicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: '권한이 없습니다.' }

  const { data: app, error: fetchError } = await supabase
    .from('artist_applications')
    .select('user_id')
    .eq('id', applicationId)
    .eq('status', 'pending')
    .single()
  if (fetchError || !app) return { error: '신청을 찾을 수 없습니다.' }

  const { error: updateAppError } = await supabase
    .from('artist_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)
  if (updateAppError) return { error: updateAppError.message }

  revalidatePath('/admin/applications')
  return { success: true }
}

export async function rejectApplication(
  applicationId: string,
  rejectionReason?: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: '권한이 없습니다.' }

  const { data: app, error: fetchError } = await supabase
    .from('artist_applications')
    .select('user_id')
    .eq('id', applicationId)
    .eq('status', 'pending')
    .single()
  if (fetchError || !app) return { error: '신청을 찾을 수 없습니다.' }

  const payload: { status: string; rejection_reason?: string } = { status: 'rejected' }
  if (rejectionReason?.trim()) payload.rejection_reason = rejectionReason.trim()

  const { error: updateAppError } = await supabase
    .from('artist_applications')
    .update(payload)
    .eq('id', applicationId)
  if (updateAppError) return { error: updateAppError.message }

  revalidatePath('/admin/applications')
  return { success: true }
}
