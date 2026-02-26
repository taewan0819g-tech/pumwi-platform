'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('payment')
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const paymentKey = searchParams.get('paymentKey')
    const orderId = searchParams.get('orderId')
    const amount = searchParams.get('amount')
    if (!paymentKey || !orderId || !amount) {
      setStatus('error')
      setErrorMessage('Missing payment parameters.')
      return
    }

    const confirm = async () => {
      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount, 10),
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.success) {
          setStatus('success')
          return
        }
        setStatus('error')
        setErrorMessage(data?.error || `Confirm failed (${res.status})`)
      } catch (e) {
        setStatus('error')
        setErrorMessage(e instanceof Error ? e.message : 'Request failed')
      }
    }
    confirm()
  }, [searchParams])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {status === 'processing' && (
        <>
          <p className="text-lg text-slate-700 mb-2">
            {t('processing')}
          </p>
          <div className="w-8 h-8 border-2 border-[#2F5D50] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 mt-4">
            paymentKey: {searchParams.get('paymentKey')?.slice(0, 20)}...
          </p>
          <p className="text-sm text-gray-500">
            orderId: {searchParams.get('orderId')}
          </p>
          <p className="text-sm text-gray-500">
            amount: {searchParams.get('amount')}원
          </p>
        </>
      )}
      {status === 'success' && (
        <>
          <p className="text-xl font-medium text-[#2F5D50] mb-4">
            {t('success_title')}
          </p>
          <p className="text-slate-600 mb-6">
            {t('success_message')}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-md font-medium text-white"
            style={{ backgroundColor: '#2F5D50' }}
          >
            {t('back_to_feed')}
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <p className="text-xl font-medium text-amber-700 mb-4">
            {t('error_title')}
          </p>
          <p className="text-slate-600 mb-6">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-6 py-2.5 rounded-md font-medium text-white bg-slate-600 hover:bg-slate-700"
          >
            {t('back_to_feed')}
          </button>
        </>
      )}
    </div>
  )
}
