'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Camera, User, Pencil, MapPin, Send, MessageCircle, Check, X, QrCode } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/profile'
import RequestArtworkModal from '@/components/request/RequestArtworkModal'
import AddressMainAutocomplete from '@/components/profile/AddressMainAutocomplete'

const BUCKET_AVATARS = 'avatars'
const BUCKET_BACKGROUNDS = 'backgrounds'

const COUNTRY_OPTIONS = [
  { value: 'kr', labelKey: 'country_kr' as const },
  { value: 'jp', labelKey: 'country_jp' as const },
  { value: 'usa', labelKey: 'country_usa' as const },
  { value: 'france', labelKey: 'country_france' as const },
  { value: 'uk', labelKey: 'country_uk' as const },
  { value: 'germany', labelKey: 'country_germany' as const },
  { value: 'other', labelKey: 'country_other' as const },
]

interface ProfileHeaderProps {
  profile: Profile
  userEmail: string
  isOwn: boolean
  onUpdate: (profile: Profile) => void
  /** 현재 로그인한 사용자 ID (이웃 추가 토글용) */
  currentUserId?: string
}

export default function ProfileHeader({
  profile,
  userEmail,
  isOwn,
  onUpdate,
  currentUserId,
}: ProfileHeaderProps) {
  const t = useTranslations('profile.actions')
  const tProfile = useTranslations('profile')
  const tApply = useTranslations('apply')
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [valuePhilosophy, setValuePhilosophy] = useState(
    profile?.value_philosophy ?? ''
  )
  const [addressMain, setAddressMain] = useState(profile?.address_main ?? '')
  const [addressDetail, setAddressDetail] = useState(profile?.address_detail ?? '')
  const [zipCode, setZipCode] = useState(profile?.zip_code ?? '')
  const [isAddressDetailPublic, setIsAddressDetailPublic] = useState(
    profile?.is_address_detail_public ?? false
  )
  const [editCity, setEditCity] = useState(profile?.city ?? '')
  const [editCountry, setEditCountry] = useState(profile?.country ?? '')
  const [editCustomCountry, setEditCustomCountry] = useState('')
  const [editLat, setEditLat] = useState<number | null>(profile?.lat ?? null)
  const [editLng, setEditLng] = useState<number | null>(profile?.lng ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [chatLoading, setChatLoading] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)
  const qrCodeContainerRef = useRef<HTMLDivElement>(null)
  const locale = useLocale()

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setBio(profile?.bio ?? '')
    setValuePhilosophy(profile?.value_philosophy ?? '')
    setAddressMain(profile?.address_main ?? '')
    setAddressDetail(profile?.address_detail ?? '')
    setZipCode(profile?.zip_code ?? '')
    setIsAddressDetailPublic(profile?.is_address_detail_public ?? false)
    setEditCity(profile?.city ?? '')
    setEditCountry(profile?.country ?? '')
    setEditLat(profile?.lat ?? null)
    setEditLng(profile?.lng ?? null)
    if (profile?.country && !COUNTRY_OPTIONS.some((o) => o.value === profile?.country)) {
      setEditCustomCountry(profile.country)
      setEditCountry('other')
    } else {
      setEditCustomCountry('')
    }
  }, [profile?.full_name, profile?.bio, profile?.value_philosophy, profile?.address_main, profile?.address_detail, profile?.zip_code, profile?.is_address_detail_public, profile?.city, profile?.country, profile?.lat, profile?.lng])

  // 이웃(팔로우) 상태 조회
  useEffect(() => {
    if (isOwn || !currentUserId || !profile?.id) return
    const checkFollow = async () => {
      const client = createClient()
      const { data } = await client
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profile.id)
        .maybeSingle()
      setIsFollowing(!!data)
    }
    checkFollow()
  }, [isOwn, currentUserId, profile?.id])

  const supabase = createClient()

  const uploadImage = async (
    file: File,
    bucket: string,
    path: string
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })
      if (error) {
        console.error('[Storage upload]', error)
        const msg =
          error.message?.includes('Bucket') || error.message?.includes('bucket')
            ? 'Storage bucket not found. Create a bucket in the Supabase dashboard.'
            : error.message
        toast.error(msg)
        return null
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      return urlData.publicUrl
    } catch (err) {
      console.error('[Storage upload]', err)
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
      return null
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${profile.id}/avatar-${Date.now()}.${ext}`
      const url = await uploadImage(file, BUCKET_AVATARS, path)
      if (!url) {
        setUploading(false)
        e.target.value = ''
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profile.id)
      if (error) {
        console.error('[profiles update avatar]', error)
        toast.error(error.message)
        setUploading(false)
        e.target.value = ''
        return
      }
      onUpdate({ ...profile, avatar_url: url })
      toast.success('Saved!')
    } catch (err) {
      console.error('[handleAvatarChange]', err)
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleBackgroundChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${profile.id}/background-${Date.now()}.${ext}`
      const url = await uploadImage(file, BUCKET_BACKGROUNDS, path)
      if (!url) {
        setUploading(false)
        e.target.value = ''
        return
      }
      const { error } = await supabase
        .from('profiles')
        .update({ background_url: url })
        .eq('id', profile.id)
      if (error) {
        console.error('[profiles update background]', error)
        toast.error(error.message)
        setUploading(false)
        e.target.value = ''
        return
      }
      onUpdate({ ...profile, background_url: url })
      toast.success('Background saved!')
      router.refresh()
    } catch (err) {
      console.error('[handleBackgroundChange]', err)
      toast.error(err instanceof Error ? err.message : 'Background upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const getCountryDisplayLabel = (countryCode: string | null | undefined): string => {
    if (!countryCode) return ''
    const opt = COUNTRY_OPTIONS.find((o) => o.value === countryCode)
    return opt ? tApply(opt.labelKey) : countryCode
  }

  const handleSaveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const payload = {
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        value_philosophy: valuePhilosophy.trim() || null,
        address_main: addressMain.trim() || null,
        address_detail: addressDetail.trim() || null,
        zip_code: zipCode.trim() || null,
        is_address_detail_public: isAddressDetailPublic,
        city: editCity.trim() || null,
        country: editCountry === 'other' ? editCustomCountry.trim() || null : editCountry.trim() || null,
        lat: editLat,
        lng: editLng,
      }
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profile.id)
      if (error) {
        console.error('[profiles update]', error)
        toast.error(error.message)
        setSaving(false)
        return
      }
      const updated = { ...profile, ...payload }
      setFullName(updated.full_name ?? '')
      setBio(updated.bio ?? '')
      setValuePhilosophy(updated.value_philosophy ?? '')
      setAddressMain((updated as Profile).address_main ?? '')
      setAddressDetail((updated as Profile).address_detail ?? '')
      setZipCode((updated as Profile).zip_code ?? '')
      setIsAddressDetailPublic((updated as Profile).is_address_detail_public ?? false)
      setEditCity(updated.city ?? '')
      setEditCountry(updated.country ?? '')
      setEditLat(updated.lat ?? null)
      setEditLng(updated.lng ?? null)
      onUpdate(updated as Profile)
      toast.success('Saved!')
      setEditing(false)
      router.refresh()
    } catch (err) {
      console.error('[handleSaveProfile]', err)
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.full_name || userEmail?.split('@')[0] || 'User'
  const backgroundImageUrl = profile?.background_url ?? null

  const handleFollowToggle = async () => {
    if (!currentUserId || !profile?.id || isOwn || followLoading) return
    setFollowLoading(true)
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id)
        if (error) throw error
        setIsFollowing(false)
        toast.success(t('toast_removed_from_list'))
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: profile.id })
        if (error) throw error
        setIsFollowing(true)
        toast.success(t('toast_added_to_list'))
      }
    } catch (err) {
      console.error('[follow toggle]', err)
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setFollowLoading(false)
    }
  }

  const handleChat = async () => {
    if (!currentUserId || !profile?.id || isOwn || chatLoading) return
    setChatLoading(true)
    try {
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, participant_ids')
        .contains('participant_ids', [currentUserId])

      const match = (existing ?? []).find(
        (row: { id: string; participant_ids: string[] }) =>
          row.participant_ids?.includes(profile.id) && row.participant_ids?.length === 2
      )
      let conversationId: string
      if (match) {
        conversationId = match.id
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from('conversations')
          .insert({ participant_ids: [currentUserId, profile.id] })
          .select('id')
          .single()
        if (insertErr) throw insertErr
        conversationId = (inserted as { id: string }).id
      }
      router.push(`/messages?conversation=${conversationId}`)
    } catch (err) {
      console.error('[handleChat]', err)
      toast.error(err instanceof Error ? err.message : 'Could not start chat.')
    } finally {
      setChatLoading(false)
    }
  }

  const roleLabel = profile?.role === 'artist' ? tProfile('role_master') : profile?.role === 'admin' ? tProfile('role_admin') : tProfile('role_user')

  return (
    <Card className="overflow-hidden">
      {/* 1. 배너 영역: 이미지만, 텍스트 없음 */}
      <div
        className="relative h-40 sm:h-52 bg-[#8E86F5]/15 bg-cover bg-center"
        style={
          backgroundImageUrl
            ? { backgroundImage: `url(${backgroundImageUrl})` }
            : undefined
        }
      >
        {isOwn && (
          <>
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBackgroundChange}
              aria-hidden
            />
            <div className="absolute bottom-3 right-3 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  backgroundInputRef.current?.click()
                }}
                disabled={uploading}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white"
                title="Change background"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 2. Main content: Avatar (left) + Profile text (right) — avatar in content area, not overlapping banner */}
      <CardContent className="bg-white py-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-6">
          {/* Avatar: relative container, NO overflow-hidden; img and button are siblings */}
          <div className="relative inline-block shrink-0 mr-0 sm:mr-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg">
                <User className="h-14 w-14 text-gray-400" />
              </div>
            )}
            {isOwn && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-0 right-0 z-10 p-1.5 rounded-full bg-[#8E86F5] text-white hover:opacity-90 shadow-md border-2 border-white disabled:opacity-50"
                  title="Change profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Name"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Short bio"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-slate-900 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                />
                <textarea
                  value={valuePhilosophy}
                  onChange={(e) => setValuePhilosophy(e.target.value)}
                  placeholder="Values & philosophy"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-slate-900 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                />
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">기본 주소</label>
                  <AddressMainAutocomplete
                    value={addressMain}
                    onChange={(res) => {
                      setAddressMain(res.address_main)
                      setZipCode(res.zip)
                      setEditCity(res.city)
                      setEditCountry(res.country === 'KR' ? 'kr' : res.country === 'JP' ? 'jp' : res.country === 'US' ? 'usa' : res.country ? 'other' : '')
                      if (res.country && !['kr', 'jp', 'usa', 'gb', 'fr', 'de'].includes(res.country.toLowerCase())) setEditCustomCountry(res.country)
                      setEditLat(res.lat)
                      setEditLng(res.lng)
                    }}
                    placeholder="주소 검색 (Google)"
                    label=""
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">상세 주소 (Apartment, Suite 등)</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <input
                      type="text"
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="동, 호수, 건물명 등"
                      className="flex-1 min-w-[160px] px-3 py-2.5 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">공개</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isAddressDetailPublic}
                        title="비공개 시 상세 주소는 해외 배송비 계산에만 사용됩니다"
                        onClick={() => setIsAddressDetailPublic(!isAddressDetailPublic)}
                        className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E86F5] focus:ring-offset-1 ${isAddressDetailPublic ? 'bg-[#8E86F5]' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${isAddressDetailPublic ? 'translate-x-4' : 'translate-x-1'}`}
                        />
                      </button>
                      <span className="text-xs text-gray-500" title="비공개 시 상세 주소는 해외 배송비 계산에만 사용됩니다">비공개</span>
                    </div>
                  </div>
                  {!isAddressDetailPublic && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      상세 주소는 공개되지 않으며, 정확한 해외 배송비 계산과 DHL 픽업을 위해서만 안전하게 사용됩니다.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">우편번호</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="배송비 계산용"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-0.5">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      setFullName(profile?.full_name ?? '')
                      setBio(profile?.bio ?? '')
                      setValuePhilosophy(profile?.value_philosophy ?? '')
                      setAddressMain(profile?.address_main ?? '')
                      setAddressDetail(profile?.address_detail ?? '')
                      setZipCode(profile?.zip_code ?? '')
                      setIsAddressDetailPublic(profile?.is_address_detail_public ?? false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* 이름만 표시. 주소는 아래 Location 아이콘 옆 한 곳에서만 표시 */}
                <div className="flex justify-between items-baseline gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate min-w-0">
                    {displayName}
                  </h1>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">
                  {roleLabel}
                </p>

                {/* 주소 단일 블록: address_main + (공개 시에만) address_detail, 편집은 프로필 Edit 폼에서만 */}
                {(profile?.address_main?.trim() || profile?.city || profile?.country || isOwn) && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <a
                          href={
                            profile?.lat != null && profile?.lng != null
                              ? `https://www.google.com/maps?q=${profile.lat},${profile.lng}`
                              : (profile?.address_main?.trim() || profile?.city || profile?.country)
                                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    profile?.address_main?.trim() || [profile?.city ?? '', profile?.country ?? ''].filter(Boolean).join(', ')
                                  )}`
                                : '#'
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1.5 text-sm ${profile?.address_main?.trim() || profile?.city || profile?.country ? 'text-slate-600 hover:text-blue-600 cursor-pointer' : 'text-gray-400 cursor-default'}`}
                          onClick={(e) => {
                            if (!profile?.address_main?.trim() && !profile?.city && !profile?.country) e.preventDefault()
                          }}
                        >
                          <MapPin className="h-4 w-4 shrink-0" />
                          <span>
                            {profile?.address_main?.trim()
                              ? [profile.address_main.trim(), profile?.is_address_detail_public && profile?.address_detail?.trim() ? profile.address_detail.trim() : ''].filter(Boolean).join(' ')
                              : profile?.city || profile?.country
                                ? [profile.city?.trim(), getCountryDisplayLabel(profile.country)].filter(Boolean).join(', ')
                                : tProfile('location_empty')}
                          </span>
                        </a>
                  </div>
                )}

                {profile?.bio && (
                  <p className="text-slate-700 mt-1.5 whitespace-pre-wrap leading-relaxed text-sm">
                    {profile.bio}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {isOwn && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(true)}
                      className="text-slate-700 border-slate-300 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4 mr-1.5" />
                      Edit
                    </Button>
                  )}
                  {!isOwn && currentUserId && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setRequestModalOpen(true)}
                        variant="outline"
                        className="border-[#8E86F5] text-[#8E86F5] hover:bg-[#8E86F5]/10"
                      >
                        <Send className="h-4 w-4 mr-1.5" />
                        {t('commission')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleChat}
                        disabled={chatLoading}
                        variant="outline"
                        className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <MessageCircle className="h-4 w-4 mr-1.5" />
                        {chatLoading ? t('chat_opening') : t('chat')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleFollowToggle}
                        disabled={followLoading}
                        variant={isFollowing ? 'outline' : 'primary'}
                        className={
                          isFollowing
                            ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                            : undefined
                        }
                      >
                        {followLoading
                          ? t('follow_processing')
                          : isFollowing
                            ? t('unfollow')
                            : t('follow')}
                      </Button>
                    </>
                  )}
                </div>
                {/* QR Code: visible on all profiles, bottom-right */}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#8E86F5] focus:ring-offset-1"
                    title={t('myQrCode')}
                    aria-label={t('qrCodeLabel')}
                  >
                    <QrCode className="h-4 w-4 shrink-0" />
                    <span className="sm:hidden">{t('qrCodeShort')}</span>
                    <span className="hidden sm:inline">{t('qrCodeLabel')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
      {!isOwn && currentUserId && (
        <RequestArtworkModal
          open={requestModalOpen}
          onClose={() => setRequestModalOpen(false)}
          artistId={profile.id}
          requesterId={currentUserId}
        />
      )}

      {/* Share Profile QR modal (available on all profiles) */}
      {qrModalOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden
            onClick={() => setQrModalOpen(false)}
          />
          <div
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="qr-modal-title" className="text-lg font-semibold text-slate-900">
                {tProfile('shareProfile')}
              </h2>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8E86F5]"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-4">
              {typeof window !== 'undefined' && profile?.id && (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <Image
                      src="/logo.png"
                      alt="PUMWI"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                    <div ref={qrCodeContainerRef} className="rounded-lg bg-white p-3 shadow-inner">
                      <QRCodeCanvas
                        value={`${window.location.origin}/${locale}/profile/${profile.id}`}
                        size={220}
                        level="M"
                        includeMargin
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      const canvas = qrCodeContainerRef.current?.querySelector('canvas')
                      if (!canvas) return
                      const dataUrl = canvas.toDataURL('image/png')
                      const name = (displayName || 'profile').replace(/[^a-zA-Z0-9가-힣_\-\s]/g, '').replace(/\s+/g, '-').slice(0, 40) || 'profile'
                      const a = document.createElement('a')
                      a.href = dataUrl
                      a.download = `pumwi-profile-${name}.png`
                      a.click()
                    }}
                    className="w-full sm:w-auto"
                  >
                    {t('downloadImage')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
