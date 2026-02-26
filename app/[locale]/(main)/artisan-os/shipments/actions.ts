'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ShipmentOrderRow = {
  id: string
  order_id: string
  post_id: string
  amount: number
  delivery_status: string | null
  packaging_photos: string[] | null
  packaging_confirmed: boolean | null
  tracking_number: string | null
  receiver_name: string | null
  shipping_address: string | null
  created_at: string
  posts: { title: string; image_url: string | null; image_urls: string[] | null } | null
}

export async function getOrdersToShip(sellerId: string): Promise<ShipmentOrderRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_id,
      post_id,
      amount,
      delivery_status,
      packaging_photos,
      packaging_confirmed,
      tracking_number,
      receiver_name,
      shipping_address,
      created_at,
      posts(title, image_url, image_urls)
    `)
    .eq('seller_id', sellerId)
    .eq('status', 'paid')
    .or('delivery_status.eq.배송준비중,delivery_status.is.null')
    .order('created_at', { ascending: false })
  if (error) return []
  return (data ?? []) as ShipmentOrderRow[]
}

export async function updateOrderShipment(
  sellerId: string,
  orderId: string,
  payload: {
    packaging_photos: string[]
    packaging_confirmed: boolean
    tracking_number: string
    delivery_status: string
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
      packaging_photos: payload.packaging_photos,
      packaging_confirmed: payload.packaging_confirmed,
      tracking_number: payload.tracking_number.trim() || null,
      delivery_status: payload.delivery_status,
    })
    .eq('order_id', orderId)
  if (error) throw error
  revalidatePath('/artisan-os/shipments')
  revalidatePath('/ko/artisan-os/shipments')
  revalidatePath('/en/artisan-os/shipments')
}
