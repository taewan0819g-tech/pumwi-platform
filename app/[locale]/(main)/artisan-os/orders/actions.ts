'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProduct(userId: string, formData: FormData) {
  const supabase = await createClient()
  const product_name = (formData.get('product_name') as string)?.trim()
  const unique_id = (formData.get('unique_id') as string)?.trim() || null
  const raw = formData.get('stock_count')
  const stock_count = raw != null && raw !== '' ? Number(raw) : null
  const service_tier = ((formData.get('service_tier') as string) || 'standard') as 'standard' | 'care' | 'global'
  const commission_rate = (() => {
    const v = formData.get('commission_rate')
    if (v === null || v === undefined) return tierDefaultRate(service_tier)
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : tierDefaultRate(service_tier)
  })()
  const rawPrice = formData.get('price')
  const price = rawPrice != null && rawPrice !== '' ? parseInt(String(rawPrice), 10) : null
  if (!product_name) throw new Error('Product name is required')
  const { error } = await supabase.from('products').insert({
    user_id: userId,
    product_name,
    unique_id,
    stock_count,
    service_tier,
    commission_rate,
    ...(price != null && Number.isFinite(price) && price >= 0 && { price: price }),
  })
  if (error) throw error
  revalidatePath('/artisan-os/orders')
}

function tierDefaultRate(tier: string): number {
  switch (tier) {
    case 'care': return 0.35
    case 'global': return 0.30
    default: return 0.40
  }
}

export async function updateProduct(userId: string, id: string, formData: FormData) {
  const supabase = await createClient()
  const product_name = (formData.get('product_name') as string)?.trim()
  const unique_id = (formData.get('unique_id') as string)?.trim() || null
  const rawStock = formData.get('stock_count')
  const stock_count = rawStock != null && rawStock !== '' ? Number(rawStock) : null
  const rawSold = formData.get('sold_count')
  const sold_count = rawSold != null && rawSold !== '' ? Number(rawSold) : null
  const service_tier = (formData.get('service_tier') as string) || undefined
  const rawRate = formData.get('commission_rate')
  const commission_rate = rawRate !== null && rawRate !== undefined && rawRate !== '' ? Number(rawRate) : undefined
  const rawPrice = formData.get('price')
  const price = rawPrice !== null && rawPrice !== undefined && rawPrice !== '' ? parseInt(String(rawPrice), 10) : undefined
  const updates: {
    product_name?: string
    unique_id?: string | null
    stock_count?: number | null
    sold_count?: number | null
    service_tier?: string
    commission_rate?: number
    price?: number | null
  } = {}
  if (product_name != null) updates.product_name = product_name
  if (unique_id !== undefined) updates.unique_id = unique_id
  if (stock_count !== undefined) updates.stock_count = stock_count
  if (sold_count !== undefined) updates.sold_count = sold_count
  if (service_tier !== undefined) updates.service_tier = service_tier
  if (commission_rate !== undefined && Number.isFinite(commission_rate)) updates.commission_rate = commission_rate
  if (price !== undefined) updates.price = Number.isFinite(price) && price >= 0 ? price : null
  const { error } = await supabase.from('products').update(updates).eq('id', id).eq('user_id', userId)
  if (error) throw error
  revalidatePath('/artisan-os/orders')
}

export async function deleteProduct(userId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  revalidatePath('/artisan-os/orders')
}

export async function createOrder(userId: string, formData: FormData) {
  const supabase = await createClient()
  const customer_name = (formData.get('customer_name') as string)?.trim() || ''
  const quantity = Number(formData.get('quantity')) || 0
  const product_id = (formData.get('product_id') as string)?.trim() || null
  const { error } = await supabase.from('orders').insert({
    user_id: userId,
    customer_name,
    quantity,
    status: 'completed',
    ...(product_id && { product_id }),
  })
  if (error) throw error
  revalidatePath('/artisan-os/orders')
}

export async function deleteOrder(userId: string, id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('orders').delete().eq('id', id).eq('user_id', userId)
  if (error) throw error
  revalidatePath('/artisan-os/orders')
}
