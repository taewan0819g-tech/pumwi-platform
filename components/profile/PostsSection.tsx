'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/button'
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
  tab: 'studio_log' | 'sales' | 'exhibition'
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
  const [editEditionCurrent, setEditEditionCurrent] = useState('')
  const [editEditionTotal, setEditEditionTotal] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // 입력 폼 상태
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editionCurrent, setEditionCurrent] = useState('')
  const [editionTotal, setEditionTotal] = useState('')
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

  // 게시물 목록 불러오기 (Craft Diary = work_log in DB; tab 'studio_log' is UI only)
  const fetchPosts = async () => {
    if (!userId) {
      setPosts([])
      setLoading(false)
      return
    }
    try {
      let q = supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (tab === 'studio_log') {
        q = q.eq('type', 'work_log')
      } else {
        q = q.eq('type', tab)
      }
      const { data, error } = await q
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
    setEditionCurrent('')
    setEditionTotal('')
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
    if (tab === 'exhibition' && !content.trim()) {
      toast.error('Description is required for exhibitions.')
      return
    }
    if (tab === 'exhibition' && imageFiles.length === 0) {
      toast.error('Image is required for exhibitions.')
      return
    }
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Sign in required.')
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
              if (error) throw new Error('Image upload failed: ' + error.message)
              const { data: urlData } = supabase.storage
                .from(BUCKET_POSTS)
                .getPublicUrl(data!.path)
              return urlData.publicUrl
            })
        })
        imageUrls = await Promise.all(uploads)
      }

      if (tab === 'exhibition' && imageUrls.length === 0) {
        toast.error('Exhibition requires at least one image.')
        setSaving(false)
        return
      }

      // Strict payload: only columns that exist in posts (user_id, type, title, content, price, image_url, image_urls, edition_number, edition_total)
      const dbType = tab === 'studio_log' ? 'work_log' : tab
      const mainImage = imageUrls.length > 0 ? imageUrls[0] : null
      const allImages = imageUrls.length > 0 ? imageUrls : null

      const payload: Record<string, unknown> = {
        user_id: user.id,
        type: dbType,
        title: title.trim(),
        content: content.trim() || null,
        price: null,
        image_url: mainImage,
        image_urls: allImages,
      }
      if (tab === 'sales') {
        const ec = editionCurrent.trim() ? Number(editionCurrent) : null
        const et = editionTotal.trim() ? Number(editionTotal) : null
        if (ec != null) payload.edition_number = ec
        if (et != null) payload.edition_total = et
      }

      const { error } = await supabase.from('posts').insert(payload)

      if (error) throw error

      toast.success('Saved!')
      setModalOpen(false)
      await fetchPosts()
      router.refresh()
    } catch (err: unknown) {
      console.error('[handleSubmit error]', err)
      toast.error(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this post?')) return
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id)
      if (error) throw error
      toast.success('Deleted.')
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
    setEditEditionCurrent(viewPost.edition_number != null ? String(viewPost.edition_number) : '')
    setEditEditionTotal(viewPost.edition_total != null ? String(viewPost.edition_total) : '')
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!viewPost || !editTitle.trim()) {
      toast.error('Please enter a title.')
      return
    }
    setSavingEdit(true)
    try {
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        content: editContent.trim() || null,
        price: null,
      }
      if (tab === 'sales') {
        const ec = editEditionCurrent.trim() ? Number(editEditionCurrent) : null
        const et = editEditionTotal.trim() ? Number(editEditionTotal) : null
        if (ec != null) payload.edition_number = ec
        if (et != null) payload.edition_total = et
      }
      const { error } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', viewPost.id)
      if (error) throw error
      setViewPost((prev) =>
        prev
          ? {
              ...prev,
              title: payload.title as string,
              content: payload.content as string | null,
              price: null,
              edition_number: payload.edition_number as number | null | undefined,
              edition_total: payload.edition_total as number | null | undefined,
            }
          : null
      )
      setIsEditing(false)
      await fetchPosts()
      router.refresh()
      toast.success('Updated.')
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setSavingEdit(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader action={isOwn && (
          <Button variant="ghost" size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-1" />New post
          </Button>
        )}>
          <h3 className="font-semibold text-slate-900">
            {tab === 'studio_log' ? 'Craft Diary' : tab === 'exhibition' ? 'Exhibitions' : 'Works for Sale'}
          </h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : !posts.length ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {isOwn ? 'Share your first post!' : 'No posts yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {posts.map((post) => (
                <div key={post.id} onClick={() => setViewPost(post)} 
                     className="border rounded-lg p-4 hover:border-[#8E86F5] cursor-pointer transition-colors">
                  {post.type === 'sales' && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <span className="bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg">
                        For Sale
                      </span>
                      {post.edition_number != null && post.edition_total != null && (
                        <span className="bg-slate-800 text-white text-[11px] font-medium px-2.5 py-1 rounded-lg">
                          Edition {post.edition_number}/{post.edition_total}
                        </span>
                      )}
                    </div>
                  )}
                  {(() => {
                    const urls = getPostImageUrls(post)
                    if (urls.length === 0 && tab !== 'exhibition') return null
                    if (urls.length === 0) return <div className="aspect-video rounded bg-gray-100 mb-3 flex items-center justify-center text-gray-400 text-sm">No image</div>
                    return (
                      <div className="aspect-video rounded bg-gray-100 mb-3 overflow-hidden">
                        <img src={urls[0]} alt="" className="w-full h-full object-contain" />
                      </div>
                    )
                  })()}
                  <h4 className="font-medium line-clamp-1">{post.title}</h4>
                  {tab === 'exhibition' && post.content && (
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">{post.content}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 글쓰기 모달 */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={tab === 'exhibition' ? 'New exhibition' : 'New post'}>
        <div className="p-4 space-y-3">
          <input 
            value={title} onChange={e => setTitle(e.target.value)} 
            placeholder={tab === 'exhibition' ? 'Title (required)' : 'Title'} 
            className="w-full border p-2 rounded" 
          />
          <textarea 
            value={content} onChange={e => setContent(e.target.value)} 
            placeholder={tab === 'exhibition' ? 'Description (required)' : 'Content'} 
            className="w-full border p-2 rounded h-32 resize-none" 
          />
          {tab === 'sales' && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 shrink-0">Edition</label>
              <input
                type="number"
                min={1}
                value={editionCurrent}
                onChange={(e) => setEditionCurrent(e.target.value)}
                placeholder="1"
                className="w-16 px-2 py-2 border border-gray-200 rounded text-slate-900 text-sm text-center"
              />
              <span className="text-gray-400">/</span>
              <input
                type="number"
                min={1}
                value={editionTotal}
                onChange={(e) => setEditionTotal(e.target.value)}
                placeholder="5"
                className="w-16 px-2 py-2 border border-gray-200 rounded text-slate-900 text-sm text-center"
              />
            </div>
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
              {tab === 'exhibition' ? 'Images (required, multiple allowed)' : 'Select images (multiple)'}
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
                    <img src={url} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
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
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={
                saving ||
                !title.trim() ||
                (tab === 'exhibition' && (!content.trim() || imageFiles.length === 0))
              }
            >
              {saving ? 'Saving...' : 'Post'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* 상세보기 모달: 좌측 이미지 / 우측 내용+좋아요·댓글, 반응형 */}
      <Dialog
        open={!!viewPost}
        onClose={() => { setViewPost(null); setIsEditing(false) }}
        title={isEditing ? 'Edit post' : viewPost?.title}
        className="max-w-4xl w-full max-h-[90vh] h-[85vh] md:h-[90vh] flex flex-col overflow-hidden"
      >
        {viewPost && (
          <div className="flex flex-col md:flex-row md:min-h-0 flex-1 overflow-hidden min-h-0">
            {/* 좌측: 이미지 슬라이더 */}
            <div className="flex-shrink-0 md:w-1/2 md:max-h-[70vh] overflow-hidden bg-gray-50 rounded-lg">
              {(() => {
                const urls = getPostImageUrls(viewPost)
                if (urls.length === 0) return <div className="min-h-[200px] flex items-center justify-center text-gray-400">No image</div>
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
                      <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Title"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Content</label>
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        placeholder="Content"
                        rows={4}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                      />
                    </div>
                    {tab === 'sales' && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-500 shrink-0">Edition</label>
                        <input
                          type="number"
                          min={1}
                          value={editEditionCurrent}
                          onChange={(e) => setEditEditionCurrent(e.target.value)}
                          placeholder="1"
                          className="w-16 px-2 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 text-center focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                        />
                        <span className="text-gray-400">/</span>
                        <input
                          type="number"
                          min={1}
                          value={editEditionTotal}
                          onChange={(e) => setEditEditionTotal(e.target.value)}
                          placeholder="5"
                          className="w-16 px-2 py-2 text-sm border border-gray-200 rounded-lg text-slate-900 text-center focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
                        />
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={cancelEditing} className="flex-1">
                        Cancel
                      </Button>
                      <Button onClick={handleSaveEdit} disabled={savingEdit || !editTitle.trim()} className="flex-1 bg-[#8E86F5] hover:opacity-90">
                        {savingEdit ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap text-gray-700 text-sm">{viewPost.content || '—'}</p>
                    {viewPost.edition_number != null &&
                      viewPost.edition_total != null && (
                        <p className="text-sm text-slate-500 mt-1">
                          Edition {viewPost.edition_number}/{viewPost.edition_total}
                        </p>
                      )}
                    {isOwn && (
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={startEditing}>
                          <Pencil className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button variant="outline" className="flex-1 text-red-500 hover:bg-red-50" onClick={() => handleDelete(viewPost.id)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
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