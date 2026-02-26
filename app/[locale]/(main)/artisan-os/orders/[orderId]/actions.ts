'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function savePackagingProof(
  sellerId: string,
  orderId: string,
  payload: {
    packaging_photo_1: string
    packaging_photo_2: string
    packaging_photo_3: string
    packaging_photo_4: string
    packaging_confirmed: boolean
  }
) {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id')
    .eq('order_id', orderId)
    .single()
  if (!order || (order as { seller_id: string }).seller_id !== sellerId) {
    throw new Error('Order not found or unauthorized')
  }
  const { error } = await supabase
    .from('orders')
    .update({
      packaging_photo_1: payload.packaging_photo_1 || null,
      packaging_photo_2: payload.packaging_photo_2 || null,
      packaging_photo_3: payload.packaging_photo_3 || null,
      packaging_photo_4: payload.packaging_photo_4 || null,
      packaging_confirmed: payload.packaging_confirmed,
      packaging_photos: [payload.packaging_photo_1, payload.packaging_photo_2, payload.packaging_photo_3, payload.packaging_photo_4].filter(Boolean),
    })
    .eq('order_id', orderId)
  if (error) throw error
  revalidatePath(`/artisan-os/orders/${orderId}`)
  revalidatePath('/artisan-os/shipments')
}

export async function saveShippoTransactionId(
  sellerId: string,
  orderId: string,
  transactionId: string
) {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id')
    .eq('order_id', orderId)
    .single()
  if (!order || (order as { seller_id: string }).seller_id !== sellerId) {
    throw new Error('Order not found or unauthorized')
  }
  const { error } = await supabase
    .from('orders')
    .update({ shippo_transaction_id: transactionId.trim() || null })
    .eq('order_id', orderId)
  if (error) throw error
  revalidatePath(`/artisan-os/orders/${orderId}`)
  revalidatePath('/artisan-os/shipments')
}

export async function markOrderShipped(
  sellerId: string,
  orderId: string,
  trackingNumber: string
) {
  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, seller_id')
    .eq('order_id', orderId)
    .single()
  if (!order || (order as { seller_id: string }).seller_id !== sellerId) {
    throw new Error('Order not found or unauthorized')
  }
  const { error } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber.trim() || null,
      delivery_status: '발송완료',
    })
    .eq('order_id', orderId)
  if (error) throw error
  revalidatePath(`/artisan-os/orders/${orderId}`)
  revalidatePath('/artisan-os/shipments')
}
