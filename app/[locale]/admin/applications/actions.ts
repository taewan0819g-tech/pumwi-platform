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
  if (fetchError || !app) return { error: 'Application not found.' }

  const { error: updateAppError } = await supabase
    .from('artist_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)
  if (updateAppError) return { error: updateAppError.message }

  // Set applicant's profile to artist and clear pending flag
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'artist', is_artist_pending: false })
    .eq('id', app.user_id)
  if (profileError) return { error: 'Application approved but profile update failed.' }

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
  if (fetchError || !app) return { error: 'Application not found.' }

  const payload: { status: string; rejection_reason?: string } = { status: 'rejected' }
  if (rejectionReason?.trim()) payload.rejection_reason = rejectionReason.trim()

  const { error: updateAppError } = await supabase
    .from('artist_applications')
    .update(payload)
    .eq('id', applicationId)
  if (updateAppError) return { error: updateAppError.message }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ is_artist_pending: false })
    .eq('id', app.user_id)
  if (profileError) return { error: 'Application was rejected but profile update failed.' }

  revalidatePath('/admin/applications')
  revalidatePath('/')
  revalidatePath('/profile')
  return { success: true }
}
