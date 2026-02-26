'use client'

import React, { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Package, Check, Camera, Printer, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { savePackagingProof, markOrderShipped, saveShippoTransactionId } from './actions'

const BUCKET_POSTS = 'posts'

const PHOTO_LABELS = [
  '① 완충재에 싸인 작품 사진',
  '② 내부 포장 상자 안쪽 사진',
  '③ 송장 붙은 겉박스 사진',
  '④ 5-5-5 법칙 및 흔들림 테스트 확인 사진',
]
const CHECKLIST_55_SHAKE = '⑤ 5-5-5 법칙 및 흔들림 테스트 확인'

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

function getPostImageUrl(post: OrderRow['posts']): string | null {
  if (!post) return null
  if (post.image_urls?.length) return (post.image_urls as string[])[0]
  return post.image_url
}

export function OrderDetailClient({ order, sellerId }: { order: OrderRow; sellerId: string }) {
  const params = useParams()
  const locale = (params?.locale as string) ?? 'ko'
  const [photos, setPhotos] = useState<(string | File)[]>([
    order.packaging_photo_1 || '',
    order.packaging_photo_2 || '',
    order.packaging_photo_3 || '',
    order.packaging_photo_4 || '',
  ])
  const [check55Shake, setCheck55Shake] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState(order.tracking_number ?? '')
  const [shippoTransactionId, setShippoTransactionId] = useState(order.shippo_transaction_id ?? '')
  const [saving, setSaving] = useState(false)
  const [shipping, setShipping] = useState(false)
  const [pickupModalOpen, setPickupModalOpen] = useState(false)
  const [pickupDate, setPickupDate] = useState('')
  const [pickupTimeSlot, setPickupTimeSlot] = useState<'am' | 'pm'>('am')
  const [pickupSubmitting, setPickupSubmitting] = useState(false)
  const [deliveryStatus, setDeliveryStatus] = useState(order.delivery_status ?? '')
  const [pickupConfirmationCode, setPickupConfirmationCode] = useState(order.pickup_confirmation_code ?? '')
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const setPhoto = (index: number, file: File | string) => {
    setPhotos((prev) => {
      const arr = [...prev]
      arr[index] = file
      return arr
    })
  }

  const hasFourPhotos = photos.length >= 4 && photos[0] && photos[1] && photos[2] && photos[3]
  const canEnableDHL = hasFourPhotos && check55Shake

  const uploadPhoto = async (file: File, index: number): Promise<string> => {
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `packaging/${order.order_id}/${Date.now()}-${index}.${ext}`
    const { error } = await supabase.storage.from(BUCKET_POSTS).upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from(BUCKET_POSTS).getPublicUrl(path)
    return data.publicUrl
  }

  const handleDHLPrint = async () => {
    if (!canEnableDHL) return
    setSaving(true)
    try {
      const urls: string[] = []
      for (let i = 0; i < 4; i++) {
        const p = photos[i]
        if (typeof p === 'string' && p) urls.push(p)
        else if (p instanceof File) urls.push(await uploadPhoto(p, i))
        else throw new Error(`사진 ${i + 1}을 업로드해 주세요.`)
      }
      await savePackagingProof(sellerId, order.order_id, {
        packaging_photo_1: urls[0],
        packaging_photo_2: urls[1],
        packaging_photo_3: urls[2],
        packaging_photo_4: urls[3],
        packaging_confirmed: true,
      })
      toast.success('포장 증빙이 저장되었습니다. DHL 운송장 출력이 가능합니다.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleMarkShipped = async () => {
    const tn = trackingNumber.trim()
    if (!tn) {
      toast.error('운송장 번호를 입력해 주세요.')
      return
    }
    setShipping(true)
    try {
      await markOrderShipped(sellerId, order.order_id, tn)
      toast.success('발송 완료로 반영되었습니다.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setShipping(false)
    }
  }

  const handleSaveTransactionId = async () => {
    const tid = shippoTransactionId.trim()
    if (!tid) {
      toast.error('Shippo Transaction ID를 입력해 주세요.')
      return
    }
    setSaving(true)
    try {
      await saveShippoTransactionId(sellerId, order.order_id, tid)
      toast.success('운송장(Transaction) ID가 저장되었습니다. 방문 예약을 요청할 수 있습니다.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handlePickupRequest = async () => {
    if (!pickupDate) {
      toast.error('방문 희망 날짜를 선택해 주세요.')
      return
    }
    setPickupSubmitting(true)
    try {
      const res = await fetch('/api/shipping/pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.order_id,
          preferredDate: pickupDate,
          timeSlot: pickupTimeSlot,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || '픽업 예약 요청에 실패했습니다.')
        return
      }
      const msg = data.message || (data.confirmation_code ? `DHL 픽업 예약이 완료되었습니다. (예약번호: ${data.confirmation_code})` : 'DHL 픽업 예약이 완료되었습니다.')
      toast.success(msg)
      setDeliveryStatus('pickup_requested')
      setPickupConfirmationCode(data.confirmation_code || '')
      setPickupModalOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '픽업 예약 요청에 실패했습니다.')
    } finally {
      setPickupSubmitting(false)
    }
  }

  const canShowPickupButton = (order.shippo_transaction_id ?? shippoTransactionId)?.trim() && (deliveryStatus || order.delivery_status) !== 'pickup_requested'

  const post = order.posts
  const imageUrl = getPostImageUrl(post)

  return (
    <div className="space-y-6">
      <Toaster position="top-center" />
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/artisan-os/shipments`}
          className="text-sm text-[#2F5D50] hover:underline"
        >
          ← 발송 목록
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-[#2F5D50]">주문 상세 (No Proof, No Shipping)</h1>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-6">
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
          <p className="text-sm font-semibold text-gray-800 mb-3">4단계 사진 업로드 (필수)</p>
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <label className="block text-xs text-gray-600">{PHOTO_LABELS[i]}</label>
                <input
                  ref={(el) => { fileInputRefs.current[i] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setPhoto(i, f)
                  }}
                />
                {photos[i] ? (
                  <div className="relative aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    {typeof photos[i] === 'string' ? (
                      <Image src={photos[i] as string} alt="" fill className="object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
                        {(photos[i] as File).name}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhoto(i, '')}
                      className="absolute top-1 right-1 w-5 h-5 rounded bg-black/50 text-white text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[i]?.click()}
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

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-gray-800 mb-2">체크리스트</p>
          <label className="flex gap-2 text-sm text-gray-700 cursor-pointer">
            <button
              type="button"
              onClick={() => setCheck55Shake(!check55Shake)}
              className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                check55Shake ? 'bg-[#2F5D50] border-[#2F5D50] text-white' : 'border-gray-300 hover:border-[#2F5D50]/50'
              }`}
            >
              {check55Shake && <Check className="w-3 h-3" />}
            </button>
            <span>{CHECKLIST_55_SHAKE}</span>
          </label>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <Button
            type="button"
            disabled={!canEnableDHL || saving}
            onClick={handleDHLPrint}
            className="w-full bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {saving ? '저장 중...' : 'DHL 운송장 출력'}
          </Button>
          {!canEnableDHL && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              위 4단계 사진 업로드와 체크리스트 완료 후 버튼이 활성화됩니다.
            </p>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">운송장 번호</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="DHL / FedEx 등 운송장 번호"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2F5D50] focus:border-transparent outline-none"
            />
          </div>
          <Button
            type="button"
            disabled={shipping || !trackingNumber.trim()}
            onClick={handleMarkShipped}
            variant="outline"
            className="border-[#2F5D50] text-[#2F5D50] hover:bg-[#2F5D50]/10 shrink-0"
          >
            {shipping ? '처리 중...' : '발송 완료'}
          </Button>
        </div>

        <div className="border-t border-gray-100 pt-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Shippo Transaction ID (운송장 생성 후 DHL 방문 예약용)</label>
          <div className="flex gap-2 flex-wrap items-end">
            <input
              type="text"
              value={shippoTransactionId}
              onChange={(e) => setShippoTransactionId(e.target.value)}
              placeholder="Shippo에서 운송장 생성 후 복사한 Transaction ID"
              className="flex-1 min-w-[200px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2F5D50] focus:border-transparent outline-none"
            />
            <Button
              type="button"
              disabled={saving || !shippoTransactionId.trim()}
              onClick={handleSaveTransactionId}
              variant="outline"
              className="border-[#2F5D50] text-[#2F5D50] hover:bg-[#2F5D50]/10 shrink-0"
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>

        {canShowPickupButton && (
          <div className="border-t border-gray-100 pt-4">
            <Button
              type="button"
              onClick={() => {
                const tomorrow = new Date()
                tomorrow.setDate(tomorrow.getDate() + 1)
                setPickupDate(tomorrow.toISOString().slice(0, 10))
                setPickupTimeSlot('am')
                setPickupModalOpen(true)
              }}
              className="w-full bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 flex items-center justify-center gap-2"
            >
              <Truck className="w-4 h-4" />
              방문 예약 요청
            </Button>
          </div>
        )}

        {(deliveryStatus || order.delivery_status) === 'pickup_requested' && (pickupConfirmationCode || order.pickup_confirmation_code) && (
          <div className="border-t border-gray-100 pt-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm font-medium text-green-800">
              DHL 픽업 예약 완료 (예약번호: {pickupConfirmationCode || order.pickup_confirmation_code})
            </p>
          </div>
        )}

        {pickupModalOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/50" aria-hidden onClick={() => setPickupModalOpen(false)} />
            <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="pickup-modal-title">
              <h2 id="pickup-modal-title" className="text-lg font-semibold text-slate-900 mb-4">DHL 방문 예약</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">방문 희망 날짜</label>
                  <input
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#2F5D50] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">희망 시간대</label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pickupTimeSlot"
                        checked={pickupTimeSlot === 'am'}
                        onChange={() => setPickupTimeSlot('am')}
                        className="text-[#2F5D50] focus:ring-[#2F5D50]"
                      />
                      <span className="text-sm">오전 (09:00~12:00)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="pickupTimeSlot"
                        checked={pickupTimeSlot === 'pm'}
                        onChange={() => setPickupTimeSlot('pm')}
                        className="text-[#2F5D50] focus:ring-[#2F5D50]"
                      />
                      <span className="text-sm">오후 (13:00~18:00)</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setPickupModalOpen(false)} disabled={pickupSubmitting}>
                  취소
                </Button>
                <Button type="button" onClick={handlePickupRequest} disabled={pickupSubmitting || !pickupDate} className="bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90">
                  {pickupSubmitting ? '예약 중...' : '예약 요청'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
