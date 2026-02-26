'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export type PostCardPost = {
  id: string
  user_id: string
  type: string
  title: string
  content: string | null
  price?: number | null
  service_tier?: string | null
  edition_number?: number | null
  edition_total?: number | null
}

export type SalesBlockProps = {
  payingPostId: string | null
  currentUserRole: string | null
  currentUserId: string | null
  onCollectClick: (post: PostCardPost) => void
  onOpenCollectorModal: () => void
}

const TIER_RATES = { standard: 0.2, care: 0.3, global: 0.4 } as const
type TierKey = keyof typeof TIER_RATES

export interface PostCardProps {
  post: PostCardPost
  /** Override title (e.g. from getContent for feed) */
  title?: string
  /** Override content (e.g. from getContent for feed) */
  content?: string | null
  /** When provided and post.type === 'sales', renders price + Collect block */
  salesBlock?: SalesBlockProps | null
  /** Optional actions (e.g. Edit/Delete) rendered between body and sales block */
  actions?: React.ReactNode
  /** 'feed' = padded block (px-4 py-3); 'modal' = no extra padding, compact */
  variant?: 'feed' | 'modal'
  children?: React.ReactNode
}

export function PostCard({
  post,
  title,
  content,
  salesBlock,
  actions,
  variant = 'feed',
  children,
}: PostCardProps) {
  const tFeed = useTranslations('feed')
  const displayTitle = title ?? post.title
  const displayContent = content ?? post.content
  const isSales = post.type === 'sales'
  const showSalesBlock = isSales && salesBlock != null

  const wrapperClass = variant === 'feed' ? 'px-4 py-3' : ''
  const salesWrapperClass = variant === 'feed' ? 'px-4 py-3 border-t border-gray-100 bg-white' : 'py-3 border-t border-gray-100 mt-3'
  const engagementWrapperClass = variant === 'feed' ? 'px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100' : ''

  return (
    <>
      <div className={wrapperClass}>
        <p className="text-sm font-medium text-slate-900">{displayTitle}</p>
        {(displayContent != null && displayContent !== '') && (
          <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{displayContent}</p>
        )}
        {post.edition_number != null && post.edition_total != null && (
          <p className="text-sm text-slate-500 mt-1">
            Edition {post.edition_number}/{post.edition_total}
          </p>
        )}
      </div>
      {actions}
      {showSalesBlock && salesBlock && (
        <div className={salesWrapperClass}>
          {(() => {
            const tier = (post.service_tier ?? 'standard') as TierKey
            const tierMessage =
              tier === 'global'
                ? tFeed('service_tier_global')
                : tier === 'care'
                  ? tFeed('service_tier_care')
                  : tFeed('service_tier_standard')
            const priceKrwt = post.price != null && Number(post.price) >= 100 ? Number(post.price) : null
            const estimatedPayout = priceKrwt != null ? Math.round(priceKrwt * (1 - TIER_RATES[tier])) : null
            const isAuthor = post.user_id === salesBlock.currentUserId
            return (
              <>
                {priceKrwt != null && (
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-xl font-semibold text-slate-900">
                      {priceKrwt.toLocaleString()} KRW
                    </span>
                    {salesBlock.currentUserRole === 'collector' ? (
                      <Button
                        onClick={() => salesBlock.onCollectClick(post)}
                        disabled={!!salesBlock.payingPostId}
                        className="font-medium shrink-0"
                        style={{ backgroundColor: '#2F5D50' }}
                      >
                        {salesBlock.payingPostId === post.id ? '...' : tFeed('collect_btn')}
                      </Button>
                    ) : salesBlock.currentUserId ? (
                      <Button
                        variant="outline"
                        onClick={salesBlock.onOpenCollectorModal}
                        className="shrink-0"
                      >
                        {tFeed('apply_collector_btn')}
                      </Button>
                    ) : null}
                  </div>
                )}
                <p className="text-xs text-slate-600 mb-2">{tierMessage}</p>
                {!priceKrwt && (
                  <>
                    {salesBlock.currentUserRole === 'collector' ? (
                      <Button
                        onClick={() => salesBlock.onCollectClick(post)}
                        disabled={!!salesBlock.payingPostId}
                        className="w-full font-medium"
                        style={{ backgroundColor: '#2F5D50' }}
                      >
                        {salesBlock.payingPostId === post.id ? '...' : tFeed('collect_btn')}
                      </Button>
                    ) : salesBlock.currentUserId ? (
                      <div className="space-y-2">
                        <p className="text-sm text-amber-700">{tFeed('collector_gate_message')}</p>
                        <Button variant="outline" onClick={salesBlock.onOpenCollectorModal} className="w-full">
                          {tFeed('apply_collector_btn')}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
                {isAuthor && estimatedPayout != null && (
                  <p className="text-xs text-slate-500 mt-2">
                    예상 정산 금액 (Estimated Payout): <span className="font-medium text-slate-700">{estimatedPayout.toLocaleString()}원</span>
                  </p>
                )}
              </>
            )
          })()}
        </div>
      )}
      {engagementWrapperClass && children != null ? (
        <div className={engagementWrapperClass}>{children}</div>
      ) : children != null ? (
        children
      ) : null}
    </>
  )
}
