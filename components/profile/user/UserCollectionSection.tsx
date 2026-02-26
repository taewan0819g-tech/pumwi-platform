'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { Bookmark } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export interface CollectionOrderRow {
  id: string
  order_id: string
  amount: number
  created_at: string
  post_id: string
  delivery_status?: string | null
  posts: {
    id: string
    title: string
    image_url: string | null
    image_urls: string[] | null
    price: number | null
    user_id: string
  } | null
}

interface UserCollectionSectionProps {
  /** 프로필 주인(컬렉션 소유자) */
  profileUserId: string
  /** 현재 로그인한 유저 (본인 프로필일 때만 소장 목록 조회) */
  currentUserId: string | null
}

function getPostImageUrl(post: CollectionOrderRow['posts']): string | null {
  if (!post) return null
  if (post.image_urls?.length) return post.image_urls[0]
  return post.image_url
}

export default function UserCollectionSection({
  profileUserId,
  currentUserId,
}: UserCollectionSectionProps) {
  const [orders, setOrders] = useState<CollectionOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const isOwn = currentUserId != null && profileUserId === currentUserId

  useEffect(() => {
    if (!isOwn || !currentUserId) {
      setOrders([])
      setLoading(false)
      return
    }
    const supabase = createClient()
    supabase
      .from('orders')
      .select(`
        id,
        order_id,
        amount,
        created_at,
        post_id,
        delivery_status,
        posts (
          id,
          title,
          image_url,
          image_urls,
          price,
          user_id
        )
      `)
      .eq('buyer_id', currentUserId)
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          console.error('[UserCollectionSection] Supabase fetch error (RLS 또는 쿼리 오류 가능):', {
            message: error.message,
            details: error.details,
            code: error.code,
            hint: error.hint,
          })
          setOrders([])
          return
        }
        let rows = (data ?? []) as CollectionOrderRow[]
        const missingPostIds = rows.filter((r) => r.post_id && r.posts == null).map((r) => r.post_id)
        if (missingPostIds.length > 0) {
          console.warn('[UserCollectionSection] Join으로 posts 미포함. post_id로 별도 조회 시도:', missingPostIds)
          const { data: postsData } = await supabase
            .from('posts')
            .select('id, title, image_url, image_urls, price, user_id')
            .in('id', [...new Set(missingPostIds)])
          const postsMap = new Map((postsData ?? []).map((p: Record<string, unknown>) => [p.id as string, p]))
          rows = rows.map((r) => ({
            ...r,
            posts: r.posts ?? (postsMap.get(r.post_id) as CollectionOrderRow['posts']) ?? null,
          }))
        }
        if (rows.length === 0) {
          console.log('[UserCollectionSection] 주문 데이터 없음 (status=paid, buyer_id 일치). RLS 정책 또는 데이터 부재 확인 필요.')
        }
        setOrders(rows)
      })
      .finally(() => setLoading(false))
  }, [currentUserId, isOwn])

  if (!isOwn) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">Collection</h3>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <p className="text-gray-500">이 사용자의 소장 목록은 비공개입니다.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">My Collection</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900">My Collection</h3>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#8E86F5]/10 text-[#8E86F5] mb-4">
              <Bookmark className="w-7 h-7" />
            </div>
            <p className="text-gray-700 font-medium">
              아직 소장하신 작품이 없습니다. PUMWI의 멋진 작품들을 만나보세요!
            </p>
            <Link href="/">
              <Button className="mt-4" style={{ backgroundColor: '#8E86F5' }}>
                작품 탐색하기
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">My Collection</h3>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {orders.map((order) => {
            const post = order.posts
            const imageUrl = getPostImageUrl(post)
            const dateLabel = order.created_at
              ? new Date(order.created_at).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : ''

            return (
              <div
                key={order.id}
                className="group rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="aspect-square relative bg-gray-100">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={post?.title ?? '작품'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <Bookmark className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-medium text-slate-900 text-sm line-clamp-2" title={post?.title ?? ''}>
                    {post?.title ?? 'Untitled'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{dateLabel}</p>
                  {order.delivery_status != null && order.delivery_status !== '' && (
                    <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                      {order.delivery_status}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
