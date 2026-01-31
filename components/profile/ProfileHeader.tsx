'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Camera, User, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import toast from 'react-hot-toast'
import type { Profile } from '@/types/profile'

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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFullName(profile?.full_name ?? '')
    setBio(profile?.bio ?? '')
    setValuePhilosophy(profile?.value_philosophy ?? '')
  }, [profile?.full_name, profile?.bio, profile?.value_philosophy])

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
            ? 'Storage 버킷이 없습니다. Supabase 대시보드에서 버킷을 생성해 주세요.'
            : error.message
        toast.error(msg)
        return null
      }
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
      return urlData.publicUrl
    } catch (err) {
      console.error('[Storage upload]', err)
      toast.error(err instanceof Error ? err.message : '이미지 업로드 실패')
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
      toast.success('저장되었습니다!')
    } catch (err) {
      console.error('[handleAvatarChange]', err)
      toast.error(err instanceof Error ? err.message : '업로드 실패')
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
      toast.success('배경이 저장되었습니다!')
      router.refresh()
    } catch (err) {
      console.error('[handleBackgroundChange]', err)
      toast.error(err instanceof Error ? err.message : '배경 업로드 실패')
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
      }
      setFullName(updated.full_name ?? '')
      setBio(updated.bio ?? '')
      setValuePhilosophy(updated.value_philosophy ?? '')
      onUpdate(updated)
      toast.success('저장되었습니다!')
      setEditing(false)
      router.refresh()
    } catch (err) {
      console.error('[handleSaveProfile]', err)
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile?.full_name || userEmail?.split('@')[0] || '사용자'
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
        toast.success('이웃 해제되었습니다.')
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: currentUserId, following_id: profile.id })
        if (error) throw error
        setIsFollowing(true)
        toast.success('이웃으로 추가되었습니다.')
      }
    } catch (err) {
      console.error('[follow toggle]', err)
      toast.error(err instanceof Error ? err.message : '처리 실패')
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div
        className="relative h-32 sm:h-48 bg-[#8E86F5]/20 bg-cover bg-center"
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
            <div className="absolute bottom-2 right-2 z-10">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  backgroundInputRef.current?.click()
                }}
                disabled={uploading}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white"
                title="배경화면 변경"
              >
                <Camera className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>
      <CardContent className="relative pt-0 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16">
          <div className="relative">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow-md flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400" />
              )}
            </div>
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
                  className="absolute bottom-0 right-0 p-2 rounded-full bg-[#8E86F5] text-white hover:opacity-90 shadow-md disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="이름"
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900"
                />
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="한줄 소개"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900 resize-none"
                />
                <textarea
                  value={valuePhilosophy}
                  onChange={(e) => setValuePhilosophy(e.target.value)}
                  placeholder="가치철학"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900 resize-none"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      setFullName(profile?.full_name ?? '')
                      setBio(profile?.bio ?? '')
                      setValuePhilosophy(profile?.value_philosophy ?? '')
                    }}
                  >
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-slate-900 truncate">
                  {displayName}
                </h1>
                {profile?.bio && (
                  <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  {isOwn && (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-sm text-[#8E86F5] hover:underline"
                    >
                      <Pencil className="h-4 w-4" />
                      수정
                    </button>
                  )}
                  {!isOwn && currentUserId && (
                    <Button
                      size="sm"
                      onClick={handleFollowToggle}
                      disabled={followLoading}
                      variant={isFollowing ? 'outline' : 'primary'}
                      className={
                        isFollowing
                          ? 'border-gray-300 text-gray-600 bg-gray-50 hover:bg-gray-100'
                          : undefined
                      }
                    >
                      {followLoading
                        ? '처리 중...'
                        : isFollowing
                          ? '이웃 취소'
                          : '이웃추가'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
