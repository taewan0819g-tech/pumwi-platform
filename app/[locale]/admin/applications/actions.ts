'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function approveApplication(applicationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in required.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Access denied.' }

  const { data: app, error: fetchError } = await supabase
    .from('artist_applications')
    .select('user_id')
    .eq('id', applicationId)
    .eq('status', 'pending')
    .single()
  if (fetchError || !app) {
    console.error('[approveApplication] Fetch application failed:', fetchError?.message, fetchError?.details, fetchError?.code)
    return { error: 'Application not found.' }
  }

  const { error: updateAppError } = await supabase
    .from('artist_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)
  if (updateAppError) {
    console.error('[approveApplication] artist_applications update failed:', updateAppError.message, updateAppError.details, updateAppError.code)
    return { error: updateAppError.message }
  }

  // Set applicant's profile: role -> artist, application_status -> approved, verified -> true
  // (DB에 verified 대신 is_verified 컬럼이 있으면 아래에서 verified 대신 is_verified 사용)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'artist',
      is_artist_pending: false,
      application_status: 'approved',
      verified: true,
    })
    .eq('id', app.user_id)
  if (profileError) {
    console.error('[approveApplication] Profile update failed:', profileError.message, profileError.details, profileError.code)
    return { error: 'Application approved but profile update failed.' }
  }

  revalidatePath('/admin/applications')
  revalidatePath('/')
  revalidatePath('/profile')
  return { success: true }
}

export async function rejectApplication(
  applicationId: string,
  rejectionReason?: string | null
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in required.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Access denied.' }

  const { data: app, error: fetchError } = await supabase
    .from('artist_applications')
    .select('user_id')
    .eq('id', applicationId)
    .eq('status', 'pending')
    .single()
  if (fetchError || !app) {
    console.error('[rejectApplication] Fetch application failed:', fetchError?.message, fetchError?.details, fetchError?.code)
    return { error: 'Application not found.' }
  }

  const payload: { status: string; rejection_reason?: string } = { status: 'rejected' }
  if (rejectionReason?.trim()) payload.rejection_reason = rejectionReason.trim()

  const { error: updateAppError } = await supabase
    .from('artist_applications')
    .update(payload)
    .eq('id', applicationId)
  if (updateAppError) {
    console.error('[rejectApplication] artist_applications update failed:', updateAppError.message, updateAppError.details, updateAppError.code)
    return { error: updateAppError.message }
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_artist_pending: false, role: 'user' })
    .eq('id', app.user_id)
  if (profileError) {
    console.error('[rejectApplication] Profile update failed:', profileError.message, profileError.details, profileError.code)
    return { error: profileError.message }
  }
  revalidatePath('/admin/applications')
  revalidatePath('/')
  revalidatePath('/profile')
  return { success: true }
}

export async function approveCollector(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in required.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Access denied.' }

  const { data: target } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single()
  if (!target || (target as { role: string }).role !== 'pending_collector') {
    return { error: 'Applicant not found or not pending collector.' }
  }

  // Approve: role -> collector, application_status -> approved, verified -> true
  // (DB에 verified 대신 is_verified 컬럼이 있으면 아래에서 verified 대신 is_verified 사용)
  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'collector',
      application_status: 'approved',
      verified: true,
    })
    .eq('id', userId)
  if (error) {
    console.error('[approveCollector] Profile update failed:', error.message, error.details, error.code)
    return { error: error.message }
  }

  revalidatePath('/admin/applications')
  revalidatePath('/')
  revalidatePath('/profile')
  return { success: true }
}

export async function rejectCollector(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in required.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') return { error: 'Access denied.' }

  const { data: target } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .single()
  if (!target || (target as { role: string }).role !== 'pending_collector') {
    return { error: 'Applicant not found or not pending collector.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'user' })
    .eq('id', userId)
  if (error) {
    console.error('[rejectCollector] Profile update failed:', error.message, error.details, error.code)
    return { error: error.message }
  }

  revalidatePath('/admin/applications')
  revalidatePath('/')
  revalidatePath('/profile')
  return { success: true }
}
