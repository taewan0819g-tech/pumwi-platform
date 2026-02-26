import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OrderDetailClient } from './OrderDetailClient'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export const dynamic = 'force-dynamic'

/** OrderDetailClient가 기대하는 주문 행 타입 */
type OrderRow = {
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
  posts: { title: string; image_url: string | null; image_urls: string[] | null } | null
}

/** Supabase에서 온 order.posts를 단일 객체 | null 로 정규화 (배열이면 첫 요소 사용) */
function mapOrderToRow(raw: Record<string, unknown>): OrderRow {
  const postsRaw = raw.posts
  const post =
    Array.isArray(postsRaw) && postsRaw.length > 0
      ? postsRaw[0]
      : postsRaw && typeof postsRaw === 'object' && !Array.isArray(postsRaw)
        ? postsRaw
        : null
  const postsMapped = post
    ? {
        title: typeof (post as Record<string, unknown>).title === 'string' ? (post as Record<string, unknown>).title as string : '',
        image_url: typeof (post as Record<string, unknown>).image_url === 'string' ? (post as Record<string, unknown>).image_url as string | null : null,
        image_urls: Array.isArray((post as Record<string, unknown>).image_urls) ? (post as Record<string, unknown>).image_urls as string[] : null,
      }
    : null

  return {
    id: String(raw.id ?? ''),
    order_id: String(raw.order_id ?? ''),
    post_id: String(raw.post_id ?? ''),
    amount: Number(raw.amount ?? 0),
    delivery_status: raw.delivery_status != null ? String(raw.delivery_status) : null,
    packaging_photo_1: raw.packaging_photo_1 != null ? String(raw.packaging_photo_1) : null,
    packaging_photo_2: raw.packaging_photo_2 != null ? String(raw.packaging_photo_2) : null,
    packaging_photo_3: raw.packaging_photo_3 != null ? String(raw.packaging_photo_3) : null,
    packaging_photo_4: raw.packaging_photo_4 != null ? String(raw.packaging_photo_4) : null,
    packaging_photos: Array.isArray(raw.packaging_photos) ? (raw.packaging_photos as string[]) : null,
    packaging_confirmed: typeof raw.packaging_confirmed === 'boolean' ? raw.packaging_confirmed : null,
    tracking_number: raw.tracking_number != null ? String(raw.tracking_number) : null,
    shippo_transaction_id: raw.shippo_transaction_id != null ? String(raw.shippo_transaction_id) : null,
    pickup_confirmation_code: raw.pickup_confirmation_code != null ? String(raw.pickup_confirmation_code) : null,
    pickup_requested_at: raw.pickup_requested_at != null ? String(raw.pickup_requested_at) : null,
    pickup_time_slot: raw.pickup_time_slot != null ? String(raw.pickup_time_slot) : null,
    receiver_name: raw.receiver_name != null ? String(raw.receiver_name) : null,
    shipping_address: raw.shipping_address != null ? String(raw.shipping_address) : null,
    created_at: String(raw.created_at ?? ''),
    posts: postsMapped,
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
  const o = order as { seller_id?: string }
  if (o.seller_id !== user.id) notFound()

  const orderRow = mapOrderToRow(order as unknown as Record<string, unknown>)

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
