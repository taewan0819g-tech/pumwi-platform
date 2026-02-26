'use client'

import React from 'react'
import { Label } from '@/components/ui/label'

const PG_FEE_PERCENT = 0.035

export const SERVICE_TIERS = [
  { value: 'standard', labelKey: 'tier_standard', commissionRate: 0.4 },
  { value: 'care', labelKey: 'tier_care', commissionRate: 0.35 },
  { value: 'global', labelKey: 'tier_global', commissionRate: 0.3 },
] as const

export type ServiceTierValue = (typeof SERVICE_TIERS)[number]['value']

export function getCommissionRateForTier(tier: ServiceTierValue): number {
  return SERVICE_TIERS.find((t) => t.value === tier)?.commissionRate ?? 0.4
}

interface PayoutPreviewProps {
  /** 판매가 (KRW) - 미입력 시 0으로 계산 */
  salePrice: number
  commissionRate: number
  className?: string
  labels?: {
    title?: string
    platformFee?: string
    pgFee?: string
    payout?: string
  }
}

export function PayoutPreview({
  salePrice,
  commissionRate,
  className = '',
  labels = {},
}: PayoutPreviewProps) {
  const t = labels
  const pgFee = Math.round(salePrice * PG_FEE_PERCENT)
  const platformFee = Math.round(salePrice * commissionRate)
  const payout = salePrice - pgFee - platformFee

  return (
    <div className={className}>
      <p className="text-xs font-medium text-gray-500 mb-1.5">
        {t.title ?? 'Expected payout (at sale price)'}
      </p>
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-600">{t.platformFee ?? 'Platform fee'}</span>
          <span className="font-mono">-₩{platformFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">{t.pgFee ?? 'Payment fee'}</span>
          <span className="font-mono">-₩{pgFee.toLocaleString()}</span>
        </div>
        <div className="flex justify-between pt-1.5 border-t border-gray-200 font-medium text-[#2F5D50]">
          <span>{t.payout ?? 'Your payout'}</span>
          <span className="font-mono">₩{payout.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}

interface ServiceTierSelectProps {
  value: ServiceTierValue
  onChange: (tier: ServiceTierValue) => void
  labels?: Record<string, string>
  className?: string
}

export function ServiceTierSelect({
  value,
  onChange,
  labels = {},
  className = '',
}: ServiceTierSelectProps) {
  return (
    <div className={className}>
      <Label className="text-xs text-gray-600 block mb-1.5">
        {labels.service_tier ?? 'Service tier'}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ServiceTierValue)}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-[#2F5D50] focus:ring-1 focus:ring-[#2F5D50] outline-none"
      >
        {SERVICE_TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {labels[t.labelKey] ?? t.value}
          </option>
        ))}
      </select>
    </div>
  )
}
