'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isExhibitionAdminEmail } from '@/lib/exhibition-admin'

export async function deleteExhibition(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const isAdminByEmail = isExhibitionAdminEmail(user.email ?? null)
  if (isAdminByEmail) {
    // Allow: taewan0819g@gmail.com
  } else {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if ((profile as { role?: string } | null)?.role !== 'admin') {
      return { error: 'Forbidden' }
    }
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .eq('type', 'pumwi_exhibition')

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath(`/pumwi-exhibition/${id}`)
  return {}
}
