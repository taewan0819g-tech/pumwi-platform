import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { OrderDetailClient } from './OrderDetailClient'

interface PageProps {
  params: Promise<{ orderId: string }>
}

export const dynamic = 'force-dynamic'

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

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="max-w-2xl mx-auto w-full py-12 px-4">
        <OrderDetailClient
          order={order as OrderRow}
          sellerId={user.id}
        />
      </div>
    </div>
  )
}

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
