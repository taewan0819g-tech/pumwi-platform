'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, User, Pencil, MapPin, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/profile'
import RequestArtworkModal from '@/components/request/RequestArtworkModal'

const BUCKET_AVATARS = 'avatars'
const BUCKET_BACKGROUNDS = 'backgrounds'

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
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [valuePhilosophy, setValuePhilosophy] = useState(
    profile?.value_philosophy ?? ''
  )
  const [studioLocation, setStudioLocation] = useState(
    profile?.studio_location ?? ''
  )
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setBio(profile?.bio ?? '')
    setValuePhilosophy(profile?.value_philosophy ?? '')
    setStudioLocation(profile?.studio_location ?? '')
  }, [profile?.full_name, profile?.bio, profile?.value_philosophy, profile?.studio_location])

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

  const handleSaveProfile = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          value_philosophy: valuePhilosophy.trim() || null,
          studio_location: studioLocation.trim() || null,
        })
        .eq('id', profile.id)
      if (error) {
        console.error('[profiles update]', error)
        toast.error(error.message)
        setSaving(false)
        return
      }
      const updated = {
        ...profile,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        value_philosophy: valuePhilosophy.trim() || null,
        studio_location: studioLocation.trim() || null,
      }
      setFullName(updated.full_name ?? '')
      setBio(updated.bio ?? '')
      setValuePhilosophy(updated.value_philosophy ?? '')
      setStudioLocation(updated.studio_location ?? '')
      onUpdate(updated)
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
        toast.success('Unfollowed.')
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: profile.id })
        if (error) throw error
        setIsFollowing(true)
        toast.success('Added to following.')
      }
    } catch (err) {
      console.error('[follow toggle]', err)
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setFollowLoading(false)
    }
  }

  const roleLabel = profile?.role === 'artist' ? 'Artist' : profile?.role === 'admin' ? 'Admin' : 'User'

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
        {/* 2. 프로필 사진: 배너와 흰 영역 사이에 걸치도록 absolute */}
        <div className="absolute left-4 sm:left-8 bottom-0 translate-y-1/2 z-10">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-lg flex items-center justify-center ring-1 ring-gray-200">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 sm:h-14 sm:w-14 text-gray-400" />
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
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#8E86F5] text-white hover:opacity-90 shadow disabled:opacity-50"
                  title="Change profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. 흰색 프로필 정보 섹션: flex로 좌 [이름/소개] · 우 [작업실] 같은 높이, 여백 최소화 */}
      <CardContent className="bg-white pt-12 sm:pt-14 py-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          {/* 데스크톱: 아바타 공간 확보용 spacer */}
          <div className="hidden sm:block w-28 shrink-0" />
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
                  <label className="block text-xs font-medium text-gray-500 mb-1">Studio location</label>
                  <input
                    type="text"
                    value={studioLocation}
                    onChange={(e) => setStudioLocation(e.target.value)}
                    placeholder="e.g. Brooklyn, NY"
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
                      setStudioLocation(profile?.studio_location ?? '')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* 이름(좌) · 작업실(우) 같은 라인에 배치 */}
                <div className="flex justify-between items-baseline gap-3">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate min-w-0">
                    {displayName}
                  </h1>
                  {profile?.studio_location?.trim() && (
                    <div className="flex items-center gap-1.5 text-slate-500 text-sm shrink-0 text-right">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span>Studio | {profile.studio_location.trim()}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-0.5">
                  {roleLabel}
                </p>
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
                        Commission
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
                          ? 'Processing...'
                          : isFollowing
                            ? 'Unfollow'
                            : 'Follow'}
                      </Button>
                    </>
                  )}
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
    </Card>
  )
}
