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

/** Supabase 쿼리 결과 한 행을 ShipmentOrderRow로 정규화 (posts가 배열이면 첫 요소 사용) */
function mapShipmentRow(raw: unknown): ShipmentOrderRow {
  const r = raw as Record<string, unknown>
  const postsRaw = r?.posts
  const post =
    Array.isArray(postsRaw) && postsRaw.length > 0
      ? postsRaw[0]
      : postsRaw && typeof postsRaw === 'object' && !Array.isArray(postsRaw)
        ? postsRaw
        : null
  const postObj = post as Record<string, unknown> | null
  const postsMapped = postObj
    ? {
        title: typeof postObj.title === 'string' ? postObj.title : '',
        image_url: typeof postObj.image_url === 'string' ? postObj.image_url : null,
        image_urls: Array.isArray(postObj.image_urls) ? (postObj.image_urls as string[]) : null,
      }
    : null

  return {
    id: String(r?.id ?? ''),
    order_id: String(r?.order_id ?? ''),
    post_id: String(r?.post_id ?? ''),
    amount: Number(r?.amount ?? 0),
    delivery_status: r?.delivery_status != null ? String(r.delivery_status) : null,
    packaging_photos: Array.isArray(r?.packaging_photos) ? (r.packaging_photos as string[]) : null,
    packaging_confirmed: typeof r?.packaging_confirmed === 'boolean' ? r.packaging_confirmed : null,
    tracking_number: r?.tracking_number != null ? String(r.tracking_number) : null,
    receiver_name: r?.receiver_name != null ? String(r.receiver_name) : null,
    shipping_address: r?.shipping_address != null ? String(r.shipping_address) : null,
    created_at: String(r?.created_at ?? ''),
    posts: postsMapped,
  }
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
  const rows = (data ?? []) as unknown[]
  return rows.map(mapShipmentRow)
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
