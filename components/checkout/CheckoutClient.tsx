'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { loadTossPayments } from '@tosspayments/payment-sdk'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { Toaster } from 'react-hot-toast'
import { motion, useSpring, useMotionValueEvent } from 'framer-motion'
import { Shield } from 'lucide-react'
import CheckoutAddressAutocomplete from './CheckoutAddressAutocomplete'
import { Dialog } from '@/components/ui/Dialog'
import { formatPhoneE164, isValidPhoneNumber } from '@/lib/phoneUtils'
import type { CountryCode } from 'libphonenumber-js'
import { getCountryCallingCode } from 'libphonenumber-js'

interface CheckoutPost {
  id: string
  title: string
  content: string | null
  image_url: string | null
  image_urls: string[] | null
  price: number | null
  type: string
}

interface CheckoutClientProps {
  postId: string
  initialPost: CheckoutPost | null
  sellerId?: string
}

function getPostImageUrl(post: CheckoutPost | null): string | null {
  if (!post) return null
  if (post.image_urls?.length) return post.image_urls[0]
  return post.image_url
}

/** Animated number that counts from previous to current value (smooth transition). */
function AnimatedNumberKrwn({ value }: { value: number }) {
  const spring = useSpring(value, { stiffness: 75, damping: 20 })
  const [display, setDisplay] = useState(value)
  useEffect(() => {
    spring.set(value)
  }, [value, spring])
  useMotionValueEvent(spring, 'change', (v) => setDisplay(Math.round(v)))
  return <span>{display.toLocaleString()} KRW</span>
}

export default function CheckoutClient({ postId, initialPost, sellerId }: CheckoutClientProps) {
  const router = useRouter()
  const [post, setPost] = useState<CheckoutPost | null>(initialPost)
  const [loading, setLoading] = useState(!initialPost)
  const [submitting, setSubmitting] = useState(false)
  const [shippingQuoteLoading, setShippingQuoteLoading] = useState(false)
  const [chargedShippingPrice, setChargedShippingPrice] = useState(0)
  const [shipable, setShipable] = useState(true)
  const [isRemoteArea, setIsRemoteArea] = useState(false)
  const [shippingMessage, setShippingMessage] = useState<string | null>(null)
  const quoteAbortRef = useRef<AbortController | null>(null)
  const [form, setForm] = useState({
    receiver_name: '',
    receiver_phone: '',
    phone_country_code: 'KR' as CountryCode,
    street_address: '',
    address_detail: '',
    postcode: '',
    city: '',
    state: '',
    shipping_country_code: 'KR',
    shipping_request: '',
    customs_id: '',
    address_zh: '',
  })
  const [insuredModalOpen, setInsuredModalOpen] = useState(false)

  const phoneValid = !form.receiver_phone.trim() || isValidPhoneNumber(form.receiver_phone.trim(), form.phone_country_code)
  const phoneInvalidTouched = form.receiver_phone.trim() && !phoneValid

  useEffect(() => {
    const cc = form.shipping_country_code as CountryCode
    if (['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'SG', 'HK'].includes(cc)) {
      setForm((f) => (f.phone_country_code === cc ? f : { ...f, phone_country_code: cc }))
    }
  }, [form.shipping_country_code])

  useEffect(() => {
    if (initialPost) return
    const supabase = createClient()
    let cancelled = false
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, content, image_url, image_urls, price, type')
          .eq('id', postId)
          .single()
        if (cancelled) return
        if (error || !data) setPost(null)
        else setPost(data as CheckoutPost)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPost()
    return () => { cancelled = true }
  }, [postId, initialPost])

  const itemPrice = post?.price != null && post.price >= 100 ? Math.round(Number(post.price)) : 100
  const totalAmount = itemPrice + chargedShippingPrice
  const orderName = (post?.title || 'PUMWI 작품').slice(0, 100)
  const imageUrl = getPostImageUrl(post)

  const fetchQuote = useCallback((country: string, itemPriceForInsurance: number, postcode?: string, street1?: string, street2?: string, city?: string, state?: string) => {
    if (!country) {
      setChargedShippingPrice(0)
      setShipable(false)
      setIsRemoteArea(false)
      setShippingMessage(null)
      return
    }
    if (quoteAbortRef.current) quoteAbortRef.current.abort()
    quoteAbortRef.current = new AbortController()
    setShippingQuoteLoading(true)
    const itemParam = Number.isFinite(itemPriceForInsurance) && itemPriceForInsurance >= 100
      ? `&itemPrice=${encodeURIComponent(Math.round(itemPriceForInsurance))}`
      : ''
    const postcodeParam = postcode ? `&postcode=${encodeURIComponent(postcode)}` : ''
    const streetParam = street1 ? `&street1=${encodeURIComponent(street1)}` : ''
    const street2Param = street2 ? `&street2=${encodeURIComponent(street2)}` : ''
    const cityParam = city ? `&city=${encodeURIComponent(city)}` : ''
    const stateParam = state ? `&state=${encodeURIComponent(state)}` : ''
    const sellerParam = sellerId ? `&sellerId=${encodeURIComponent(sellerId)}` : ''
    fetch(`/api/shipping/quote?country=${encodeURIComponent(country)}&weight=1${itemParam}${postcodeParam}${streetParam}${street2Param}${cityParam}${stateParam}${sellerParam}`, {
      signal: quoteAbortRef.current.signal,
    })
      .then((res) => (res.ok ? res.json() : { charged_shipping_price_krw: 0, shipable: false, is_remote_area: false }))
      .then((data) => {
        setChargedShippingPrice(Number(data.charged_shipping_price_krw) || 0)
        setShipable(data.shipable !== false)
        setIsRemoteArea(Boolean(data.is_remote_area))
        setShippingMessage(data.shipping_message ?? null)
      })
      .catch(() => {
        setChargedShippingPrice(0)
        setShipable(false)
        setIsRemoteArea(false)
        setShippingMessage(null)
      })
      .finally(() => {
        setShippingQuoteLoading(false)
        quoteAbortRef.current = null
      })
  }, [sellerId])

  // 실시간 배송비: country, postcode, street_address, address_detail(street2), city, state 변경 시 재계산
  useEffect(() => {
    fetchQuote(
      form.shipping_country_code,
      itemPrice,
      form.postcode || undefined,
      form.street_address || undefined,
      form.address_detail?.trim() || undefined, // 5번째 인자 = street2 (Shippo addressTo)
      form.city || undefined,
      form.state || undefined
    )
  }, [form.shipping_country_code, form.postcode, form.street_address, form.address_detail, form.city, form.state, itemPrice, sellerId, fetchQuote])

  const handleAddressSelect = useCallback((result: { street_address: string; city: string; state: string; postcode: string; country_code: string }) => {
    setForm((f) => ({
      ...f,
      street_address: result.street_address,
      city: result.city,
      state: result.state,
      postcode: result.postcode,
      shipping_country_code: result.country_code || f.shipping_country_code,
    }))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY
    if (!clientKey) {
      toast.error('결제 설정이 되어 있지 않습니다.')
      return
    }
    if (!form.receiver_name.trim() || !form.receiver_phone.trim() || !form.street_address.trim()) {
      toast.error('수령인 이름, 연락처, 배송지 주소를 모두 입력해 주세요.')
      return
    }
    const receiverPhoneE164 = formatPhoneE164(form.receiver_phone.trim(), form.phone_country_code)
    if (!receiverPhoneE164) {
      toast.error('유효하지 않은 전화번호 형식입니다. 국가코드와 번호를 확인해 주세요.')
      return
    }
    const validateRes = await fetch('/api/shipping/validate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        street1: form.street_address,
        city: form.city,
        state: form.state,
        postcode: form.postcode,
        country_code: form.shipping_country_code,
      }),
    })
    const validateData = await validateRes.json().catch(() => ({}))
    if (!validateData.valid) {
      toast.error(validateData.message || '정확한 배송을 위해 주소를 다시 확인해 주세요.')
      return
    }
    const shipping_address_full = [form.postcode, form.city, form.state, form.street_address, form.address_detail.trim()].filter(Boolean).join(', ')
    setSubmitting(true)
    try {
      const createRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          orderName,
          amount: itemPrice,
          receiver_name: form.receiver_name.trim(),
          receiver_phone: receiverPhoneE164,
          shipping_address: shipping_address_full.trim(),
          shipping_country_code: form.shipping_country_code || undefined,
          shipping_postcode: form.postcode || undefined,
          shipping_street1: form.street_address || undefined,
          shipping_street2: form.address_detail.trim() || undefined,
          shipping_city: form.city || undefined,
          shipping_state: form.state || undefined,
          shipping_request: form.shipping_request.trim() || undefined,
        }),
      })
      const createData = await createRes.json().catch(() => ({}))
      if (!createRes.ok) {
        toast.error(createData?.error || '주문 생성에 실패했습니다.')
        return
      }
      const { orderId, amount: resolvedAmount } = createData as { orderId: string; amount: number }
      const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'ko' : 'ko'
      const base = typeof window !== 'undefined' ? window.location.origin : ''
      const successUrl = `${base}/${locale}/payment/success`
      const failUrl = `${base}/${locale}/payment/fail`
      const toss = await loadTossPayments(clientKey)
      await toss.requestPayment({
        amount: resolvedAmount,
        orderId,
        orderName,
        successUrl,
        failUrl,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '결제 요청에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#8E86F5] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!post || post.type !== 'sales') {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <p className="text-slate-600 mb-4">해당 작품을 찾을 수 없거나 구매할 수 없습니다.</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          홈으로
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <h1 className="text-xl font-semibold text-slate-900 mb-6">주문서 작성</h1>
      <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name (English) *</label>
            <input
              type="text"
              value={form.receiver_name}
              onChange={(e) => setForm((f) => ({ ...f, receiver_name: e.target.value }))}
              required
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone (country code included) *</label>
            <div className="flex gap-2">
              <select
                value={form.phone_country_code}
                onChange={(e) => setForm((f) => ({ ...f, phone_country_code: e.target.value as CountryCode }))}
                className="w-[120px] shrink-0 px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none bg-white"
                aria-label="Country code"
              >
                {(['KR', 'US', 'JP', 'CN', 'GB', 'DE', 'FR', 'SG', 'HK'] as CountryCode[]).map((cc) => (
                  <option key={cc} value={cc}>
                    {cc} +{getCountryCallingCode(cc)}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={form.receiver_phone}
                onChange={(e) => setForm((f) => ({ ...f, receiver_phone: e.target.value.replace(/\s/g, '') }))}
                required
                placeholder="1012345678"
                className={`flex-1 min-w-0 px-3 py-2 border rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none ${phoneInvalidTouched ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
                aria-invalid={!!phoneInvalidTouched}
              />
            </div>
            {phoneInvalidTouched && (
              <p className="mt-1 text-sm text-red-600">유효하지 않은 전화번호 형식입니다.</p>
            )}
            <p className="mt-1 text-xs text-slate-500">배송 및 통관 안내를 위해 정확한 번호(국가코드 포함)가 필요합니다.</p>
          </div>
          <CheckoutAddressAutocomplete
            value={form.street_address}
            onSelect={handleAddressSelect}
            label="Street Address *"
            placeholder="Search address (street, city, country)..."
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Detailed Address (Apartment, Suite, Unit, etc.) <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={form.address_detail}
              onChange={(e) => setForm((f) => ({ ...f, address_detail: e.target.value }))}
              placeholder="Apt 4B, Suite 100, Building name..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Country</label>
            <select
              value={form.shipping_country_code}
              onChange={(e) => setForm((f) => ({ ...f, shipping_country_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            >
              <option value="KR">대한민국</option>
              <option value="US">United States</option>
              <option value="JP">日本</option>
              <option value="CN">中国</option>
              <option value="GB">United Kingdom</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="SG">Singapore</option>
              <option value="HK">Hong Kong</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={form.postcode}
              onChange={(e) => setForm((f) => ({ ...f, postcode: e.target.value }))}
              placeholder="12345"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Seoul"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State / Province</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
              placeholder="State or Province"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
            />
          </div>
          {form.shipping_country_code === 'KR' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">개인통관고유부호</label>
              <input
                type="text"
                value={form.customs_id}
                onChange={(e) => setForm((f) => ({ ...f, customs_id: e.target.value }))}
                placeholder="P로 시작하는 12자리"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
              />
            </div>
          )}
          {form.shipping_country_code === 'CN' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">중국어 주소 (선택)</label>
              <input
                type="text"
                value={form.address_zh}
                onChange={(e) => setForm((f) => ({ ...f, address_zh: e.target.value }))}
                placeholder="中国语地址"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">배송 요청사항</label>
            <textarea
              value={form.shipping_request}
              onChange={(e) => setForm((f) => ({ ...f, shipping_request: e.target.value }))}
              placeholder="문 앞에 놓아 주세요 등"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none"
            />
          </div>
        </div>

        <div>
          <div className="sticky top-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            {imageUrl ? (
              <div className="aspect-square relative rounded-lg overflow-hidden bg-gray-100 mb-4">
                <Image src={imageUrl} alt={post.title} fill className="object-cover" sizes="320px" />
              </div>
            ) : (
              <div className="aspect-square rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 mb-4">
                이미지 없음
              </div>
            )}
            <p className="font-medium text-slate-900">{post.title}</p>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-slate-700 mb-3">Order Summary</p>
              <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Item Price</span>
                <span className="font-medium text-slate-900">{itemPrice.toLocaleString()} KRW</span>
              </div>
              <div className="flex justify-between text-sm items-start gap-2">
                <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                  <span className="text-slate-600">Shipping (DHL Express + 전액 안심 보험 포함)</span>
                  <button
                    type="button"
                    onClick={() => setInsuredModalOpen(true)}
                    className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[#2F5D50]/10 text-[#2F5D50] hover:bg-[#2F5D50]/20 transition-colors"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    100% Insured Shipping
                  </button>
                </div>
                {shippingQuoteLoading ? (
                  <span className="text-amber-600 shrink-0">DHL 요금 및 보험료 계산 중...</span>
                ) : (
                  <motion.span
                    key={chargedShippingPrice}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-medium text-slate-900 shrink-0"
                  >
                    <AnimatedNumberKrwn value={chargedShippingPrice} />
                  </motion.span>
                )}
              </div>
              {!shippingQuoteLoading && form.shipping_country_code && (
                <div className="text-sm mt-1">
                  {shipable ? (
                    isRemoteArea ? (
                      <p className="text-amber-600">⚠️ Remote Area Delivery: 도서산간 지역으로 추가 배송일이 소요될 수 있습니다.</p>
                    ) : (
                      <p className="text-green-600">✓ DHL Express 배송 가능 지역입니다.</p>
                    )
                  ) : (
                    <p className="text-red-600">
                      {shippingMessage || '✕ 현재 해당 지역은 배송이 지원되지 않습니다.'}
                    </p>
                  )}
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-gray-200">
                <span className="font-semibold text-slate-900">Total</span>
                <motion.span
                  key={totalAmount}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="font-semibold text-slate-900"
                >
                  <AnimatedNumberKrwn value={totalAmount} />
                </motion.span>
              </div>
              </div>
            </div>

            <p className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
              🌐 국제 배송 안내: 통관 과정에서 DHL 또는 현지 세관이 수령인에게 추가 정보(신분증 번호 등)를 직접 요청할 수 있습니다.
            </p>
            <Button
              type="submit"
              disabled={submitting || shippingQuoteLoading || !shipable || !!phoneInvalidTouched}
              className="w-full mt-4"
              style={{ backgroundColor: '#2F5D50' }}
            >
              {submitting ? '처리 중...' : '결제하기'}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={insuredModalOpen}
        onClose={() => setInsuredModalOpen(false)}
        title="[컬렉터용] 파손/분실 사고 발생 시 보상 가이드라인"
        className="max-w-lg"
      >
        <div className="p-4 space-y-4 text-sm text-slate-700">
          <p><strong>① 48시간 이내 접수 (Golden Time) 필수</strong></p>
          <p><strong>② 외관 및 내부 사진 촬영 필수</strong></p>
          <p><strong>③ 포장재 보존 필수 (보상 완료 시까지)</strong></p>
          <p><strong>④ 보상 범위:</strong> 가이드 준수 시 결제 금액 100% 환불 또는 재발송 보장.</p>
        </div>
      </Dialog>
    </div>
  )
}
