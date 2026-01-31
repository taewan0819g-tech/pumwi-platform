'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Plus, Trash2, Pencil, Image as ImageIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Post } from '@/types/profile'
import { PostLikeComment } from '@/components/post/PostLikeComment'

function getPostImageUrls(post: Post): string[] {
  if (post.image_urls?.length) return post.image_urls
  if (post.image_url) return [post.image_url]
  return []
}

function PostDetailCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const n = urls.length

  const scrollToIndex = (i: number) => {
    setIndex(i)
    const el = scrollRef.current
    if (el) {
      const w = el.clientWidth
      el.scrollTo({ left: w * i, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || n <= 1) return
    const w = el.clientWidth
    const i = Math.round(el.scrollLeft / w)
    if (i >= 0 && i < n) setIndex(i)
  }

  return (
    <div className="relative group">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex rounded-lg scrollbar-hide"
      >
        {urls.map((url, i) => (
          <div
            key={url}
            className="flex-shrink-0 w-full snap-center flex items-center justify-center max-h-[400px] bg-gray-50 rounded-lg"
          >
            <img
              src={url}
              alt=""
              className="w-full h-auto max-h-[400px] object-contain rounded-lg"
            />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); scrollToIndex((index - 1 + n) % n) }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); scrollToIndex((index + 1) % n) }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1 rounded-full bg-black/40">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); scrollToIndex(i) }}
                className={`w-2 h-2 rounded-full ${i === index ? 'bg-white scale-110' : 'bg-white/50'}`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/50 text-white text-xs font-medium">
            {index + 1} / {n}
          </div>
        </>
      )}
    </div>
  )
}

const BUCKET_POSTS = 'posts'

interface PostsSectionProps {
  userId: string
  isOwn: boolean
  tab: 'work_log' | 'sales'
}

export default function PostsSection({
  userId,
  isOwn,
  tab,
}: PostsSectionProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewPost, setViewPost] = useState<Post | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // 입력 폼 상태
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [price, setPrice] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const fileInputId = 'posts-section-image-input'

  const supabase = createClient()

  // 이미지 미리보기 (다중)
  useEffect(() => {
    if (imageFiles.length === 0) {
      setPreviewUrls([])
      return
    }
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  // 게시물 목록 불러오기
  const fetchPosts = async () => {
    if (!userId) {
      setPosts([])
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .eq('type', tab)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[posts fetch error]', error)
        setPosts([])
      } else {
        setPosts(data as Post[])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    fetchPosts()
  }, [userId, tab])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  const openAdd = () => {
    setTitle('')
    setContent('')
    setPrice('')
    setImageFiles([])
    setModalOpen(true)
  }

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setImageFiles((prev) => [...prev, ...list].slice(0, 10))
    e.target.value = ''
  }

  const removePreviewAt = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // 저장 로직: Promise.all로 다중 이미지 병렬 업로드 → image_urls 저장
  const handleSubmit = async () => {
    if (!title.trim()) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('로그인이 필요합니다.')
        setSaving(false)
        return
      }

      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        const ts = Date.now()
        const uploads = imageFiles.map((file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${user.id}/post-${ts}-${i}.${ext}`
          return supabase.storage
            .from(BUCKET_POSTS)
            .upload(path, file, { upsert: true })
            .then(({ data, error }) => {
              if (error) throw new Error('이미지 업로드 실패: ' + error.message)
              const { data: urlData } = supabase.storage
                .from(BUCKET_POSTS)
                .getPublicUrl(data!.path)
              return urlData.publicUrl
            })
        })
        imageUrls = await Promise.all(uploads)
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        type: tab,
        title: title.trim(),
        content: content.trim() || null,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        price: tab === 'sales' && price ? Number(price) : null,
      })

      if (error) throw error

      toast.success('저장되었습니다!')
      setModalOpen(false)
      await fetchPosts()
      router.refresh()
    } catch (err: unknown) {
      console.error('[handleSubmit error]', err)
      toast.error(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      toast.success('삭제되었습니다.')
      setViewPost(null)
      setIsEditing(false)
      await fetchPosts()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const startEditing = () => {
    if (!viewPost) return
    setEditTitle(viewPost.title)
    setEditContent(viewPost.content ?? '')
    setEditPrice(viewPost.price != null ? String(viewPost.price) : '')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!viewPost || !editTitle.trim()) {
      toast.error('제목을 입력해 주세요.')
      return
    }
    setSavingEdit(true)
    try {
      const payload: { title: string; content: string | null; price: number | null } = {
        title: editTitle.trim(),
        content: editContent.trim() || null,
        price: tab === 'sales' && editPrice.trim() ? Number(editPrice) : null,
      }
      const { error } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', viewPost.id)
      if (error) throw error
      setViewPost((prev) =>
        prev
          ? { ...prev, title: payload.title, content: payload.content, price: payload.price }
          : null
      )
      setIsEditing(false)
      await fetchPosts()
      router.refresh()
      toast.success('수정되었습니다.')
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : '수정에 실패했습니다.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader action={isOwn && (
          <Button variant="ghost" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />글 쓰기
          </Button>
        )}>
          <h3 className="font-semibold text-slate-900">
            {tab === 'work_log' ? '작업일지' : '판매게시물'}
          </h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">로딩 중...</div>
          ) : !posts.length ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {isOwn ? '게시물을 올려보세요!' : '게시물이 없습니다.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <div key={post.id} onClick={() => setViewPost(post)} 
                     className="border rounded-lg p-4 hover:border-[#8E86F5] cursor-pointer transition-colors">
                  {(() => {
                    const urls = getPostImageUrls(post)
                    if (urls.length === 0) return null
                    return (
                      <div className="aspect-video rounded bg-gray-100 mb-3 overflow-hidden">
                        <img src={urls[0]} alt="" className="w-full h-full object-contain" />
                      </div>
                    )
                  })()}
                  <h4 className="font-medium line-clamp-1">{post.title}</h4>
                  {tab === 'sales' && post.price && (
                    <p className="text-[#8E86F5] text-sm font-medium mt-1">
                      {post.price.toLocaleString()}원
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 글쓰기 모달 */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="글 쓰기">
        <div className="p-4 space-y-3">
          <input 
            value={title} onChange={e => setTitle(e.target.value)} 
            placeholder="제목" className="w-full border p-2 rounded" 
          />
          <textarea 
            value={content} onChange={e => setContent(e.target.value)} 
            placeholder="내용" className="w-full border p-2 rounded h-32 resize-none" 
          />
          {tab === 'sales' && (
            <input 
              type="number" value={price} onChange={e => setPrice(e.target.value)} 
              placeholder="가격 (원)" className="w-full border p-2 rounded" 
            />
          )}
          <div>
            <input
              id={fileInputId}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageFileChange}
            />
            <label
              htmlFor={fileInputId}
              className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-[#8E86F5]"
            >
              <ImageIcon className="w-4 h-4" />
              이미지 선택 (여러 장 선택 가능, 클릭 시 추가)
            </label>
          </div>
          {previewUrls.length > 0 && (
            <div className="overflow-x-auto overflow-y-hidden pb-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex gap-2 min-w-0">
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img src={url} alt={`미리보기 ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePreviewAt(i)}
                      className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={saving || !title.trim()}>
              {saving ? '저장 중...' : '게시'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 상세보기 모달: 좌측 이미지 / 우측 내용+좋아요·댓글, 반응형 */}
      <Dialog
        open={!!viewPost}
        onClose={() => { setViewPost(null); setIsEditing(false) }}
        title={isEditing ? '게시물 수정' : viewPost?.title}
        className="max-w-4xl w-full max-h-[90vh] h-[85vh] md:h-[90vh] flex flex-col overflow-hidden"
      >
        {viewPost && (
          <div className="flex flex-col md:flex-row md:min-h-0 flex-1 overflow-hidden min-h-0">
            {/* 좌측: 이미지 슬라이더 */}
            <div className="flex-shrink-0 md:w-1/2 md:max-h-[70vh] overflow-hidden bg-gray-50 rounded-lg">
              {(() => {
                const urls = getPostImageUrls(viewPost)
                if (urls.length === 0) return <div className="min-h-[200px] flex items-center justify-center text-gray-400">이미지 없음</div>
                if (urls.length === 1) {
                  return (
                    <img src={urls[0]} alt="" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
                  )
                }
                return <PostDetailCarousel urls={urls} />
              })()}
            </div>
            {/* 우측: 내용 + 좋아요/댓글 (또는 수정 폼) */}
            <div className="flex flex-col min-h-0 flex-1 p-4 md:pl-4 md:pr-4 md:py-4 overflow-hidden">
              <div className="flex-shrink-0 space-y-2">
                {isEditing ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">제목</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="제목"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">내용</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="내용"
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                      />
                    </div>
                    {tab === 'sales' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">가격 (원)</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          placeholder="가격"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                        />
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={cancelEditing} className="flex-1">
                        취소
                      </Button>
                      <Button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} className="flex-1 bg-[#8E86F5] hover:opacity-90">
                        {savingEdit ? '저장 중...' : '저장'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-gray-700 text-sm">{viewPost.content || '—'}</p>
                    {viewPost.price != null && viewPost.price > 0 && (
                      <p className="text-lg font-bold text-[#8E86F5]">{viewPost.price.toLocaleString()}원</p>
                    )}
                    {isOwn && (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={startEditing}>
                          <Pencil className="w-4 h-4 mr-2" /> 수정
                        </Button>
                        <Button variant="outline" className="flex-1 text-red-500 hover:bg-red-50" onClick={() => handleDelete(viewPost.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
              {!isEditing && (
                <div className="flex-1 min-h-0 overflow-hidden mt-3 pt-3 border-t border-gray-100 flex flex-col">
                  <PostLikeComment
                    variant="modal"
                    postId={viewPost.id}
                    currentUserId={currentUserId}
                    scrollable
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}