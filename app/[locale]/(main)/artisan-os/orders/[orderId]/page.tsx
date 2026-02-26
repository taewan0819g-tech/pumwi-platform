import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OrderDetailClient } from './OrderDetailClient'
import {
  isRecord,
  hasSellerId,
  normalizePostEmbed,
  str,
  num,
  strOrNull,
  boolOrNull,
  strArrayOrNull,
  type PostEmbed,
} from '@/lib/orderRowMappers'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export const dynamic = 'force-dynamic'

/** OrderDetailClient가 기대하는 주문 행 타입 */
export type OrderRow = {
  id: string
  order_id: string
  post_id: string
  amount: number
  delivery_status: string | null
  packaging_photo_1: string | null
  packaging_photo_2: string | null
  packaging_photo_3: string | null
  packaging_photo_4: string | null
  packaging_photos: string[] | null
  packaging_confirmed: boolean | null
  tracking_number: string | null
  shippo_transaction_id: string | null
  pickup_confirmation_code: string | null
  pickup_requested_at: string | null
  pickup_time_slot: string | null
  receiver_name: string | null
  shipping_address: string | null
  created_at: string
  posts: PostEmbed | null
}

/** Supabase 쿼리 결과를 OrderRow로 변환. 타입 가드와 정규화만 사용. */
function mapOrderToRow(raw: unknown): OrderRow {
  if (!isRecord(raw)) {
    return {
      id: '',
      order_id: '',
      post_id: '',
      amount: 0,
      delivery_status: null,
      packaging_photo_1: null,
      packaging_photo_2: null,
      packaging_photo_3: null,
      packaging_photo_4: null,
      packaging_photos: null,
      packaging_confirmed: null,
      tracking_number: null,
      shippo_transaction_id: null,
      pickup_confirmation_code: null,
      pickup_requested_at: null,
      pickup_time_slot: null,
      receiver_name: null,
      shipping_address: null,
      created_at: '',
      posts: null,
    }
  }
  return {
    id: str(raw, 'id'),
    order_id: str(raw, 'order_id'),
    post_id: str(raw, 'post_id'),
    amount: num(raw, 'amount'),
    delivery_status: strOrNull(raw, 'delivery_status'),
    packaging_photo_1: strOrNull(raw, 'packaging_photo_1'),
    packaging_photo_2: strOrNull(raw, 'packaging_photo_2'),
    packaging_photo_3: strOrNull(raw, 'packaging_photo_3'),
    packaging_photo_4: strOrNull(raw, 'packaging_photo_4'),
    packaging_photos: strArrayOrNull(raw, 'packaging_photos'),
    packaging_confirmed: boolOrNull(raw, 'packaging_confirmed'),
    tracking_number: strOrNull(raw, 'tracking_number'),
    shippo_transaction_id: strOrNull(raw, 'shippo_transaction_id'),
    pickup_confirmation_code: strOrNull(raw, 'pickup_confirmation_code'),
    pickup_requested_at: strOrNull(raw, 'pickup_requested_at'),
    pickup_time_slot: strOrNull(raw, 'pickup_time_slot'),
    receiver_name: strOrNull(raw, 'receiver_name'),
    shipping_address: strOrNull(raw, 'shipping_address'),
    created_at: str(raw, 'created_at'),
    posts: normalizePostEmbed(raw.posts),
  }
}

export default async function ArtistOrderDetailPage({ params }: PageProps) {
  const { orderId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_id,
      post_id,
      seller_id,
      amount,
      delivery_status,
      packaging_photo_1,
      packaging_photo_2,
      packaging_photo_3,
      packaging_photo_4,
      packaging_photos,
      packaging_confirmed,
      tracking_number,
      shippo_transaction_id,
      delivery_status,
      pickup_confirmation_code,
      pickup_requested_at,
      pickup_time_slot,
      receiver_name,
      shipping_address,
      created_at,
      posts(title, image_url, image_urls)
    `)
    .eq('order_id', orderId)
    .single()

  if (error || !order) notFound()
  if (!hasSellerId(order) || order.seller_id !== user.id) notFound()

  const orderRow = mapOrderToRow(order)

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="max-w-2xl mx-auto w-full py-12 px-4">
        <OrderDetailClient
          order={orderRow}
          sellerId={user.id}
        />
      </div>
    </div>
  )
}
