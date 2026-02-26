'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Package, Check, Camera, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import {
  getOrdersToShip,
  updateOrderShipment,
  type ShipmentOrderRow,
} from './actions'

const BUCKET_POSTS = 'posts'

const PACKAGING_CHECKLIST = [
  '① 이중 박스 포장 (Double Boxing) 필수',
  '② 5-5-5 법칙 (사방 5cm 완충 공간)',
  '③ 흔들림 테스트 (내부 움직임 없음)',
  '④ 사진 증빙 필수 (완충된 작품, 내부 포장 상자, 송장 붙은 겉박스)',
  "⑤ 파손 주의(Fragile) 테이핑",
]

function getPostImageUrl(post: ShipmentOrderRow['posts']): string | null {
  if (!post) return null
  if (post.image_urls?.length) return (post.image_urls as string[])[0]
  return post.image_url
}

export default function ShipmentsClient({ sellerId }: { sellerId: string }) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [orders, setOrders] = useState<ShipmentOrderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [checklist, setChecklist] = useState<Record<string, boolean[]>>({})
  const [photos, setPhotos] = useState<Record<string, (string | File)[]>>({})
  const [tracking, setTracking] = useState<Record<string, string>>({})
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [guideOpen, setGuideOpen] = useState(true)

  useEffect(() => {
    getOrdersToShip(sellerId).then((data) => {
      setOrders(data)
      const initialCheck: Record<string, boolean[]> = {}
      const initialPhotos: Record<string, (string | File)[]> = {}
      const initialTracking: Record<string, string> = {}
      data.forEach((o) => {
        initialCheck[o.order_id] = new Array(PACKAGING_CHECKLIST.length).fill(false)
        initialPhotos[o.order_id] = (o.packaging_photos ?? []).slice(0, 3)
        initialTracking[o.order_id] = o.tracking_number ?? ''
      })
      setChecklist(initialCheck)
      setPhotos(initialPhotos)
      setTracking(initialTracking)
    }).finally(() => setLoading(false))
  }, [sellerId])

  const setCheck = (orderId: string, index: number, value: boolean) => {
    setChecklist((prev) => {
      const arr = [...(prev[orderId] ?? new Array(PACKAGING_CHECKLIST.length).fill(false))]
      arr[index] = value
      return { ...prev, [orderId]: arr }
    })
  }

  const setPhoto = (orderId: string, index: number, file: File | string) => {
    setPhotos((prev) => {
      const arr = [...(prev[orderId] ?? ['', '', ''])]
      arr[index] = file
      return { ...prev, [orderId]: arr }
    })
  }

  const allChecked = (orderId: string) => {
    const arr = checklist[orderId]
    return arr && arr.length === PACKAGING_CHECKLIST.length && arr.every(Boolean)
  }

  const hasThreePhotos = (orderId: string) => {
    const arr = photos[orderId] ?? []
    return arr.length >= 3 && arr[0] && arr[1] && arr[2]
  }

  const canSubmit = (orderId: string) =>
    allChecked(orderId) && hasThreePhotos(orderId) && (tracking[orderId] ?? '').trim().length > 0

  const uploadPhoto = async (orderId: string, file: File, index: number): Promise<string> => {
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `packaging/${orderId}/${Date.now()}-${index}.${ext}`
    const { error } = await supabase.storage.from(BUCKET_POSTS).upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from(BUCKET_POSTS).getPublicUrl(path)
    return data.publicUrl
  }

  const handleMarkShipped = async (orderId: string) => {
    if (!canSubmit(orderId)) {
      toast.error('체크리스트 5항목 완료, 사진 3장 업로드, 운송장 번호를 모두 입력해 주세요.')
      return
    }
    setSubmitting(orderId)
    try {
      const urls: string[] = []
      const photoList = photos[orderId] ?? []
      for (let i = 0; i < 3; i++) {
        const p = photoList[i]
        if (typeof p === 'string') urls.push(p)
        else if (p instanceof File) urls.push(await uploadPhoto(orderId, p, i))
      }
      if (urls.length !== 3) throw new Error('사진 3장이 필요합니다.')
      await updateOrderShipment(sellerId, orderId, {
        packaging_photos: urls,
        packaging_confirmed: true,
        tracking_number: (tracking[orderId] ?? '').trim(),
        delivery_status: '발송완료',
      })
      toast.success('발송 완료로 반영되었습니다.')
      setOrders((prev) => prev.filter((o) => o.order_id !== orderId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSubmitting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-10 h-10 border-2 border-[#2F5D50] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>발송 대기 중인 주문이 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />
      <div className="rounded-lg border border-[#2F5D50]/20 bg-[#2F5D50]/5 overflow-hidden">
        <button
          type="button"
          onClick={() => setGuideOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-2 font-serif text-lg font-semibold text-[#2F5D50] p-4 text-left"
        >
          <span>안심 포장 가이드</span>
          {guideOpen ? <ChevronUp className="h-5 w-5 shrink-0" /> : <ChevronDown className="h-5 w-5 shrink-0" />}
        </button>
        {guideOpen && (
          <div className="px-4 pb-4 pt-0 border-t border-[#2F5D50]/10">
            <p className="text-sm font-semibold text-gray-800 mb-3">[아티스트용] 100% 보험 보상을 위한 해외 배송 포장 가이드</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>① 이중 박스 포장 (Double Boxing) 필수: 작품을 1차 상자에 넣고, 그 상자를 더 큰 2차 상자에 넣어야 합니다. 두 상자 사이에는 최소 5cm 이상의 완충재(스티로폼, 에어캡 등)가 모든 면을 채워야 합니다.</li>
              <li>② 5-5-5 법칙: 작품과 박스 사이, 그리고 박스와 박스 사이에 5cm 이상의 여유 공간을 확보하고 완충재를 채워주세요.</li>
              <li>③ 흔들림 테스트: 포장을 마친 후 상자를 흔들었을 때 내부에서 아무런 소리나 움직임이 느껴지지 않아야 합니다.</li>
              <li>④ 사진 증빙 (가장 중요): 발송 전 반드시 3단계 사진을 찍어두어야 합니다 (완충재에 싸인 작품 사진, 내부 포장이 완료된 상자 안쪽 사진, 운송장이 붙은 최종 겉박스 사진).</li>
              <li>⑤ 파손 주의(Fragile) 테이핑: 박스 모든 면에 &apos;Fragile&apos; 스티커를 부착하고, 박스 모서리를 테이프로 보강하여 습기에 대비해 주세요.</li>
            </ul>
          </div>
        )}
      </div>

      <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#2F5D50]">
        <Package className="h-5 w-5" />
        [아티스트용] 100% 보험 보상을 위한 해외 배송 포장 가이드
      </h2>
      <p className="text-sm text-gray-600">
        아래 체크리스트를 모두 완료하고 사진 3장을 업로드한 뒤 운송장을 입력하면 발송 완료할 수 있습니다.
      </p>

      {orders.map((order) => {
        const post = order.posts
        const imageUrl = getPostImageUrl(post)
        const orderCheck = checklist[order.order_id] ?? []
        const orderPhotos = photos[order.order_id] ?? ['', '', '']
        const photoLabels = ['완충재에 싸인 작품 사진', '내부 포장 완료된 상자 안쪽 사진', '운송장이 붙은 최종 겉박스 사진']

        return (
          <div
            key={order.id}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5"
          >
            <div className="flex gap-4">
              {imageUrl ? (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  <Image src={imageUrl} alt={post?.title ?? ''} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg bg-gray-200 shrink-0 flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{post?.title ?? '작품'}</p>
                <p className="text-xs text-gray-500 mt-0.5">주문번호: {order.order_id}</p>
                <Link
                  href={`/${locale}/artisan-os/orders/${order.order_id}`}
                  className="inline-block mt-1 text-xs font-medium text-[#2F5D50] hover:underline"
                >
                  상세 (No Proof, No Shipping) →
                </Link>
                {order.receiver_name && (
                  <p className="text-xs text-gray-600 mt-1">수령인: {order.receiver_name}</p>
                )}
                {order.shipping_address && (
                  <p className="text-xs text-gray-500 truncate" title={order.shipping_address}>
                    {order.shipping_address}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-800 mb-3">포장 가이드 체크리스트 (5항목 필수)</p>
              <ul className="space-y-2">
                {PACKAGING_CHECKLIST.map((text, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-700">
                    <button
                      type="button"
                      onClick={() => setCheck(order.order_id, i, !orderCheck[i])}
                      className={`
                        shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                        ${orderCheck[i] ? 'bg-[#2F5D50] border-[#2F5D50] text-white' : 'border-gray-300 hover:border-[#2F5D50]/50'}
                      `}
                    >
                      {orderCheck[i] && <Check className="w-3 h-3" />}
                    </button>
                    <span className={orderCheck[i] ? 'text-gray-600' : ''}>{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">사진 증빙 (3장 필수)</p>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="space-y-1">
                    <label className="block text-xs text-gray-500">{photoLabels[i]}</label>
                    <input
                      ref={(el) => { fileInputRefs.current[`${order.order_id}-${i}`] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) setPhoto(order.order_id, i, f)
                      }}
                    />
                    {orderPhotos[i] ? (
                      <div className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                        {typeof orderPhotos[i] === 'string' ? (
                          <Image
                            src={orderPhotos[i] as string}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                            {(orderPhotos[i] as File).name}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setPhoto(order.order_id, i, '')}
                          className="absolute top-1 right-1 w-5 h-5 rounded bg-black/50 text-white text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[`${order.order_id}-${i}`]?.click()}
                        className="w-full aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#2F5D50]/50 hover:text-[#2F5D50] transition-colors"
                      >
                        <Camera className="w-6 h-6 mb-1" />
                        <span className="text-xs">업로드</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-700 mb-1">운송장 번호</label>
                <input
                  type="text"
                  value={tracking[order.order_id] ?? ''}
                  onChange={(e) => setTracking((t) => ({ ...t, [order.order_id]: e.target.value }))}
                  placeholder="DHL / FedEx 등 운송장 번호"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2F5D50] focus:border-transparent outline-none"
                />
              </div>
              <Button
                type="button"
                disabled={!canSubmit(order.order_id) || submitting === order.order_id}
                onClick={() => handleMarkShipped(order.order_id)}
                className="bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 shrink-0"
              >
                {submitting === order.order_id ? '처리 중...' : '발송 완료'}
              </Button>
            </div>

            {(!allChecked(order.order_id) || !hasThreePhotos(order.order_id)) && (
              <p className="text-xs text-amber-600">
                체크리스트 5항목 완료 및 사진 3장 업로드 후 운송장을 입력하면 발송 완료할 수 있습니다.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
