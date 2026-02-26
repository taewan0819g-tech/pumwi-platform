'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { PenLine, X } from 'lucide-react'
import VoiceWriteButton from '@/components/VoiceWriteButton'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

/** Collect tab only: partnership tier rates (Standard 20%, Care 30%, Global 40%) */
const COLLECT_TIER_RATES: Record<ServiceTierValue, number> = {
  standard: 0.2,
  care: 0.3,
  global: 0.4,
}

const BUCKET_POSTS = 'posts'

type ServiceTierValue = 'standard' | 'care' | 'global'
type PostTypeTab = 'log' | 'work' | 'exhibition' | 'pumwi_exhibition'

interface PostInputProps {
  userId: string
  profile?: { role?: string } | null
  /** When true, shows the PUMWI Exhibition tab (admin or taewan0819g@gmail.com). */
  isExhibitionAdmin?: boolean
  onPostCreated?: () => void
}

export default function PostInput({ userId, profile, isExhibitionAdmin = false, onPostCreated }: PostInputProps) {
  const tCreate = useTranslations('feed.create_post')
  const searchParams = useSearchParams()
  const isAdmin = isExhibitionAdmin || profile?.role === 'admin'
  const [expanded, setExpanded] = useState(false)
  const [postType, setPostType] = useState<PostTypeTab>('log')

  useEffect(() => {
    if (searchParams.get('create') === 'pumwi_exhibition' && isAdmin) {
      setExpanded(true)
      setPostType('pumwi_exhibition')
    }
  }, [searchParams, isAdmin])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editionCurrent, setEditionCurrent] = useState('')
  const [editionTotal, setEditionTotal] = useState('')
  const [exhibitionLocation, setExhibitionLocation] = useState('')
  const [exhibitionCountry, setExhibitionCountry] = useState('')
  const [titleKo, setTitleKo] = useState('')
  const [contentKo, setContentKo] = useState('')
  const [exhibitionLocationKo, setExhibitionLocationKo] = useState('')
  const [exhibitionCountryKo, setExhibitionCountryKo] = useState('')
  const [exhibitionStartDate, setExhibitionStartDate] = useState('')
  const [exhibitionEndDate, setExhibitionEndDate] = useState('')
  const [exhibitionStatus, setExhibitionStatus] = useState<'ongoing' | 'upcoming' | 'closed'>('upcoming')
  const [exhibitionExternalLink, setExhibitionExternalLink] = useState('')
  const [posting, setPosting] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  // Work (sales): price & tier for pricing preview
  const [workPrice, setWorkPrice] = useState('')
  const [serviceTier, setServiceTier] = useState<ServiceTierValue>('global')

  useEffect(() => {
    if (imageFiles.length === 0) {
      setPreviewUrls([])
      return
    }
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setImageFiles((prev) => [...prev, ...list].slice(0, 10))
    e.target.value = ''
  }

  const removePreview = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const resetForm = () => {
    setTitle('')
    setContent('')
    setEditionCurrent('')
    setEditionTotal('')
    setExhibitionLocation('')
    setExhibitionCountry('')
    setTitleKo('')
    setContentKo('')
    setExhibitionLocationKo('')
    setExhibitionCountryKo('')
    setExhibitionStartDate('')
    setExhibitionEndDate('')
    setExhibitionStatus('upcoming')
    setExhibitionExternalLink('')
    setImageFiles([])
    setWorkPrice('')
    setServiceTier('global')
  }

  const voiceWriteTab =
    postType === 'work'
      ? ('product' as const)
      : postType === 'exhibition' || postType === 'pumwi_exhibition'
        ? ('exhibition' as const)
        : ('journal' as const)

  const handleSubmit = async () => {
    const titleTrim = title.trim()
    const contentTrim = content.trim()
    if (!titleTrim && !contentTrim) return

    if (postType === 'exhibition') {
      if (!titleTrim || !contentTrim) {
        toast.error('Exhibition requires Title and Description.')
        return
      }
      if (imageFiles.length === 0) {
        toast.error('Exhibition requires at least one image.')
        return
      }
    }

    if (postType === 'pumwi_exhibition') {
      if (!titleTrim) {
        toast.error('PUMWI Exhibition requires a title.')
        return
      }
      if (!exhibitionLocation.trim() || !exhibitionCountry.trim()) {
        toast.error('Location and Country are required.')
        return
      }
      if (imageFiles.length === 0) {
        toast.error('At least one image is required.')
        return
      }
    }

    if (postType === 'work') {
      const et = editionTotal.trim()
      const editionTotalNum = et ? parseInt(et, 10) : NaN
      if (!et || Number.isNaN(editionTotalNum) || editionTotalNum < 1) {
        toast.error('Edition Total must be a number greater than 0.')
        return
      }
      const priceNum = workPrice.trim() ? parseInt(workPrice.trim(), 10) : NaN
      if (!Number.isFinite(priceNum) || priceNum < 100) {
        toast.error('Price (KRW) must be at least 100.')
        return
      }
    }

    setPosting(true)
    try {
      const supabase = createClient()
      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        const ts = Date.now()
        const uploads = imageFiles.map((file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${userId}/post-${ts}-${i}.${ext}`
          return supabase.storage
            .from(BUCKET_POSTS)
            .upload(path, file, { upsert: true })
            .then(({ data, error }) => {
              if (error) throw error
              const { data: urlData } = supabase.storage
                .from(BUCKET_POSTS)
                .getPublicUrl(data!.path)
              return urlData.publicUrl
            })
        })
        imageUrls = await Promise.all(uploads)
      }

      const isWork = postType === 'work'
      const isExhibition = postType === 'exhibition'
      const isPumwiExhibition = postType === 'pumwi_exhibition'
      const ec = editionCurrent.trim()
      const et = editionTotal.trim()
      const edition_number =
        isWork && ec ? (parseInt(ec, 10) || null) : null
      const edition_total =
        isWork && et ? (parseInt(et, 10) || null) : null

      const dbType = isWork ? 'sales' : isExhibition ? 'exhibition' : isPumwiExhibition ? 'pumwi_exhibition' : 'work_log'
      const mainImage = imageUrls.length > 0 ? imageUrls[0] : null
      const allImages = imageUrls.length > 0 ? imageUrls : null

      let contentPayload: string | null = contentTrim || null
      if (isPumwiExhibition) {
        contentPayload = JSON.stringify({
          description: contentTrim || '',
          location: exhibitionLocation.trim(),
          country: exhibitionCountry.trim(),
          start_date: exhibitionStartDate || undefined,
          end_date: exhibitionEndDate || undefined,
          exhibition_status: exhibitionStatus,
          external_link: exhibitionExternalLink.trim() || undefined,
        })
      }

      const payload: Record<string, unknown> = {
        user_id: userId,
        type: dbType,
        title: titleTrim || 'Untitled',
        content: contentPayload,
        price: isWork && workPrice.trim() ? Math.round(Number(workPrice)) : null,
        image_url: mainImage,
        image_urls: allImages,
      }
      if (dbType === 'sales') {
        payload.edition_number = edition_number
        payload.edition_total = edition_total
        if (serviceTier) payload.service_tier = serviceTier
      }
      if (dbType === 'pumwi_exhibition') {
        if (titleKo.trim()) payload.title_ko = titleKo.trim()
        if (contentKo.trim()) payload.content_ko = contentKo.trim()
        if (exhibitionLocationKo.trim()) payload.location_ko = exhibitionLocationKo.trim()
        if (exhibitionCountryKo.trim()) payload.country_ko = exhibitionCountryKo.trim()
      }

      const { error } = await supabase.from('posts').insert(payload)
      if (error) throw error
      toast.success('Post published.')
      resetForm()
      setExpanded(false)
      onPostCreated?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPosting(false)
    }
  }

  const canSubmit =
    (postType === 'exhibition'
      ? title.trim() && content.trim() && imageFiles.length > 0
      : postType === 'pumwi_exhibition'
        ? title.trim() &&
          exhibitionLocation.trim() &&
          exhibitionCountry.trim() &&
          imageFiles.length > 0
        : (title.trim() || content.trim()) &&
          (postType !== 'work' ||
            (editionTotal.trim() &&
              !Number.isNaN(parseInt(editionTotal.trim(), 10)) &&
              parseInt(editionTotal.trim(), 10) > 0 &&
              workPrice.trim() &&
              Number.isFinite(parseInt(workPrice.trim(), 10)) &&
              parseInt(workPrice.trim(), 10) >= 100)))

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <PenLine className="h-5 w-5 text-gray-500" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 text-left px-4 py-2.5 rounded-full border border-gray-200 bg-[#F3F2EF] hover:bg-gray-100 text-gray-500 text-sm transition-colors"
        >
          {tCreate('placeholder_collapsed')}
        </button>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Tab Switcher: 마스터의 시간 | 소장하기 | 갤러리 (i18n) */}
          <div className="flex p-1 bg-gray-100/80 rounded-lg flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setPostType('log')}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center py-2 rounded-sm text-sm font-light tracking-wide transition-colors',
                postType === 'log'
                  ? 'bg-white text-[#2F5D50] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tCreate('type_craft_diary')}
            </button>
            <button
              type="button"
              onClick={() => setPostType('work')}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center py-2 rounded-sm text-sm font-light tracking-wide transition-colors',
                postType === 'work'
                  ? 'bg-white text-[#2F5D50] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tCreate('type_work_for_sale')}
            </button>
            <button
              type="button"
              onClick={() => setPostType('exhibition')}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center py-2 rounded-sm text-sm font-light tracking-wide transition-colors',
                postType === 'exhibition'
                  ? 'bg-white text-[#2F5D50] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              {tCreate('type_exhibition')}
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setPostType('pumwi_exhibition')}
                className={cn(
                  'flex-1 min-w-[100px] flex items-center justify-center py-2 rounded-sm text-sm font-light tracking-wide transition-colors',
                  postType === 'pumwi_exhibition'
                    ? 'bg-white text-[#2F5D50] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                PUMWI Exhibition
              </button>
            )}
          </div>

          {/* Exhibition: Image required */}
          {postType === 'exhibition' && (
            <p className="text-xs text-gray-500">Image, Title, and Description are required for exhibitions.</p>
          )}
          {postType === 'pumwi_exhibition' && (
            <p className="text-xs text-gray-500">Global offline event: title, location, country, dates, and image required.</p>
          )}
          {/* Write by Voice: prominent button above Title */}
          <div className="flex flex-wrap items-center gap-2">
            <VoiceWriteButton
              tab={voiceWriteTab}
              onSuccess={(t, c) => {
                setTitle(t)
                setContent(c)
              }}
            />
          </div>
          {/* Common: Title */}
          {postType === 'pumwi_exhibition' ? (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Title (EN) *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (English)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
              />
              <label className="block text-sm font-medium text-gray-700">Title (KO)</label>
              <input
                type="text"
                value={titleKo}
                onChange={(e) => setTitleKo(e.target.value)}
                placeholder="제목 (한국어, 선택)"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
              />
            </div>
          ) : (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={tCreate('input_title')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
            />
          )}
          {/* Common: Content (multi-line for PUMWI Exhibition) */}
          {postType === 'pumwi_exhibition' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (EN) *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Gallery introduction, curator's note, etc. (optional)"
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-y min-h-[160px] text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (KO)</label>
                <textarea
                  value={contentKo}
                  onChange={(e) => setContentKo(e.target.value)}
                  placeholder="갤러리 소개, 큐레이터 노트 등 (한국어, 선택)"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-y min-h-[120px] text-slate-900"
                />
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={tCreate('input_placeholder')}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none text-slate-900"
            />
          )}

          {/* PUMWI Exhibition only: Location, Country, Dates (date only), Status, External link */}
          {postType === 'pumwi_exhibition' && (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="block text-xs font-medium text-gray-700 mb-2">Status Badge</span>
                <div className="flex flex-wrap gap-3">
                  {[
                    { value: 'ongoing' as const, label: '🔴 On-going' },
                    { value: 'upcoming' as const, label: '🟡 Upcoming' },
                    { value: 'closed' as const, label: '⚫ Closed' },
                  ].map(({ value, label }) => (
                    <label key={value} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="exhibition_status"
                        value={value}
                        checked={exhibitionStatus === value}
                        onChange={() => setExhibitionStatus(value)}
                        className="text-[#2F5D50] focus:ring-[#2F5D50]"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location (EN) *</label>
                <input
                  type="text"
                  value={exhibitionLocation}
                  onChange={(e) => setExhibitionLocation(e.target.value)}
                  placeholder="Location (e.g. Paris)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location (KO)</label>
                <input
                  type="text"
                  value={exhibitionLocationKo}
                  onChange={(e) => setExhibitionLocationKo(e.target.value)}
                  placeholder="장소 (한국어, 선택)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Country (EN) *</label>
                <input
                  type="text"
                  value={exhibitionCountry}
                  onChange={(e) => setExhibitionCountry(e.target.value)}
                  placeholder="Country (e.g. France)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Country (KO)</label>
                <input
                  type="text"
                  value={exhibitionCountryKo}
                  onChange={(e) => setExhibitionCountryKo(e.target.value)}
                  placeholder="국가 (한국어, 선택)"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={exhibitionStartDate}
                    onChange={(e) => setExhibitionStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={exhibitionEndDate}
                    onChange={(e) => setExhibitionEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
                  />
                </div>
              </div>
              <input
                type="url"
                value={exhibitionExternalLink}
                onChange={(e) => setExhibitionExternalLink(e.target.value)}
                placeholder="External link (optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
              />
            </div>
          )}

          {/* Collect (for_sale) only: Edition, then Price + Tier + Payout preview */}
          {postType === 'work' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 shrink-0">Edition</span>
                <input
                  type="number"
                  min={1}
                  value={editionCurrent}
                  onChange={(e) => setEditionCurrent(e.target.value)}
                  placeholder="1"
                  className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 text-center focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-gray-400">/</span>
                <input
                  type="number"
                  min={1}
                  value={editionTotal}
                  onChange={(e) => setEditionTotal(e.target.value)}
                  placeholder="5"
                  className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 text-center focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-gray-500">(Edition Total &gt; 0)</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (KRW)</label>
                <input
                  type="number"
                  min={100}
                  value={workPrice}
                  onChange={(e) => setWorkPrice(e.target.value)}
                  placeholder="예: 1000000"
                  className="w-full max-w-[200px] px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-2">PUMWI Partnership Tier</span>
                <div className="flex flex-col sm:flex-row gap-2">
                  {[
                    { value: 'standard' as const, label: 'Standard (20%)', desc: '기본 노출 및 결제' },
                    { value: 'care' as const, label: 'PUMWI Care (30%)', desc: '특수 포장 및 국내 보안 배송' },
                    { value: 'global' as const, label: 'PUMWI Global (40%)', desc: '해외 VVIP 마케팅 및 통관/국제 배송', recommended: true },
                  ].map(({ value, label, desc, recommended }) => (
                    <label
                      key={value}
                      className={cn(
                        'flex flex-col p-3 rounded-lg border cursor-pointer transition-colors',
                        serviceTier === value
                          ? 'border-[#8E86F5] bg-[#8E86F5]/5 ring-1 ring-[#8E86F5]'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <input
                        type="radio"
                        name="service_tier"
                        value={value}
                        checked={serviceTier === value}
                        onChange={() => setServiceTier(value)}
                        className="sr-only"
                      />
                      <span className="font-medium text-slate-900 text-sm">{label}</span>
                      <span className="text-xs text-gray-600 mt-0.5">{desc}</span>
                      {recommended && (
                        <span className="mt-1.5 inline-block text-[10px] font-medium text-[#8E86F5]">추천</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
              {(() => {
                const priceNum = workPrice.trim() ? parseInt(workPrice.trim(), 10) : NaN
                const valid = Number.isFinite(priceNum) && priceNum >= 100
                const rate = COLLECT_TIER_RATES[serviceTier]
                const payoutKrwt = valid ? Math.round(priceNum * (1 - rate)) : 0
                return valid ? (
                  <div className="p-3 bg-[#F3F2EF] rounded-lg border border-[#8E86F5]/20">
                    <p className="text-sm text-slate-700">
                      최종 정산 예정액 (Estimated Payout):{' '}
                      <span className="font-semibold text-[#2F5D50]">{payoutKrwt.toLocaleString()}원</span>
                    </p>
                  </div>
                ) : null
              })()}
            </>
          )}

          {/* Common: Image upload */}
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="post-input-images"
            onChange={handleFileChange}
          />
          <label
            htmlFor="post-input-images"
            className="inline-block px-3 py-1.5 text-sm text-[#8E86F5] hover:bg-[#8E86F5]/10 rounded-md cursor-pointer border border-[#8E86F5]/30"
          >
            {tCreate('btn_add_image')}
          </label>
          {previewUrls.length > 0 && (
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 pb-1 min-w-0" style={{ scrollbarWidth: 'thin' }}>
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePreview(i)}
                      className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                resetForm()
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              {tCreate('btn_cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={posting || !canSubmit}
              className="px-4 py-2 text-sm text-white rounded-md hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#8E86F5' }}
            >
              {posting ? tCreate('publishing') : tCreate('btn_post')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
