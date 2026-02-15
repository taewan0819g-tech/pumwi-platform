'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'
import { PostLikeComment, POST_ENGAGEMENT_CHANGED } from '@/components/post/PostLikeComment'
import type { CommentRow as EngagementCommentRow } from '@/components/post/PostLikeComment'
import { useContentLanguage } from '@/hooks/useContentLanguage'
import { useTranslations } from 'next-intl'

const BUCKET_POSTS = 'posts'

function PostImagesCarousel({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const n = urls.length

  const scrollToIndex = (i: number) => {
    setIndex(i)
    const el = scrollRef.current
    if (el) {
      const width = el.clientWidth
      el.scrollTo({ left: width * i, behavior: 'smooth' })
    }
  }

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || n <= 1) return
    const width = el.clientWidth
    const i = Math.round(el.scrollLeft / width)
    if (i >= 0 && i < n) setIndex(i)
  }

  return (
    <div className="w-full bg-gray-100 relative group min-h-[200px]">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="w-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory flex scrollbar-hide"
      >
        {urls.map((url, i) => (
          <div
            key={url}
            className="flex-shrink-0 w-full snap-center flex items-center justify-center max-h-[600px] bg-gray-100"
          >
            <img
              src={url}
              alt=""
              className="w-full h-auto max-h-[600px] object-contain"
            />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => scrollToIndex((index - 1 + n) % n)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex((index + 1) % n)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 px-2 py-1.5 rounded-full bg-black/40">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => scrollToIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === index ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/80'
                }`}
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

type FeedTab = 'all' | 'exhibitions' | 'work' | 'sale'

const TAB_IDS: { id: FeedTab; labelKey: 'all' | 'exhibitions' | 'craft_diary' | 'for_sale' }[] = [
  { id: 'all', labelKey: 'all' },
  { id: 'exhibitions', labelKey: 'exhibitions' },
  { id: 'work', labelKey: 'craft_diary' },
  { id: 'sale', labelKey: 'for_sale' },
]

interface ProfileRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  role?: string
}

interface PostRow {
  id: string
  user_id: string
  type: 'work_log' | 'studio_log' | 'sales' | 'exhibition'
  title: string
  title_ko?: string | null
  content: string | null
  content_ko?: string | null
  location_ko?: string | null
  country_ko?: string | null
  image_url: string | null
  image_urls?: string[] | null
  price: number | null
  edition_number?: number | null
  edition_total?: number | null
  created_at: string
  profiles?: ProfileRow | null
}

interface CommentProfile {
  full_name: string | null
  avatar_url: string | null
}

interface CommentRow {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: CommentProfile | null
}

export default function Feed({ refreshTrigger }: { refreshTrigger?: number }) {
  const tTabs = useTranslations('feed.tabs')
  const getContent = useContentLanguage()
  const [activeTab, setActiveTab] = useState<FeedTab>('all')
  const tabs = TAB_IDS.map(({ id, labelKey }) => ({ id, label: tTabs(labelKey) }))
  const [posts, setPosts] = useState<PostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<PostRow | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editEditionCurrent, setEditEditionCurrent] = useState('')
  const [editEditionTotal, setEditEditionTotal] = useState('')
  const [editImageFile, setEditImageFile] = useState<File | null>(null)
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set())
  const [likeCountByPostId, setLikeCountByPostId] = useState<Record<string, number>>({})
  const [commentCountByPostId, setCommentCountByPostId] = useState<Record<string, number>>({})
  const [openCommentsPostId, setOpenCommentsPostId] = useState<string | null>(null)
  const [commentsByPostId, setCommentsByPostId] = useState<Record<string, CommentRow[]>>({})
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState<string | null>(null)
  const [likeLoading, setLikeLoading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null)
    })
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuPostId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!editImageFile) {
      setEditImagePreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(editImageFile)
    setEditImagePreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [editImageFile])

  const fetchPosts = useCallback(async () => {
    // Exclude pumwi_exhibition: sidebar-only, never in main feed
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(id, full_name, avatar_url, role)')
      .in('type', ['work_log', 'studio_log', 'sales', 'exhibition'])
      .order('created_at', { ascending: false })
    if (error) {
      setPosts([])
      setLoading(false)
      return
    }
    setPosts((data as PostRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchPosts()
  }, [fetchPosts, refreshTrigger])

  useEffect(() => {
    if (posts.length === 0) return
    const postIds = posts.map((p) => p.id)
    // Fetch likes (requires currentUserId for "liked" state)
    if (currentUserId) {
      supabase
        .from('likes')
        .select('post_id, user_id')
        .in('post_id', postIds)
        .then(({ data }) => {
          const countByPost: Record<string, number> = {}
          const liked = new Set<string>()
          postIds.forEach((id) => { countByPost[id] = 0 })
          ;(data ?? []).forEach((r: { post_id: string; user_id: string }) => {
            countByPost[r.post_id] = (countByPost[r.post_id] ?? 0) + 1
            if (r.user_id === currentUserId) liked.add(r.post_id)
          })
          setLikeCountByPostId((prev) => ({ ...prev, ...countByPost }))
          setLikedPostIds((prev) => {
            const next = new Set(prev)
            postIds.forEach((id) => {
              if (liked.has(id)) next.add(id)
              else next.delete(id)
            })
            return next
          })
        })
    }
    // Fetch comment counts for all posts so the count displays on load
    supabase
      .from('comments')
      .select('post_id')
      .in('post_id', postIds)
      .then(({ data }) => {
        const countByPost: Record<string, number> = {}
        postIds.forEach((id) => { countByPost[id] = 0 })
        ;(data ?? []).forEach((r: { post_id: string }) => {
          countByPost[r.post_id] = (countByPost[r.post_id] ?? 0) + 1
        })
        setCommentCountByPostId((prev) => ({ ...prev, ...countByPost }))
      })
  }, [currentUserId, posts])

  const tabFilter = (p: PostRow) => {
    if (activeTab === 'all') return true
    if (activeTab === 'exhibitions') return p.type === 'exhibition'
    if (activeTab === 'work') return p.type === 'work_log'
    return p.type === 'sales'
  }

  const filteredPosts = posts.filter(tabFilter)
  const getAuthor = (p: PostRow): ProfileRow | null =>
    (p.profiles as ProfileRow) ??
    (p as PostRow & { profile?: ProfileRow }).profile ??
    null
  const authorName = (p: PostRow) => getAuthor(p)?.full_name ?? 'User'
  const authorAvatar = (p: PostRow) => getAuthor(p)?.avatar_url ?? null
  const authorRole = (p: PostRow) => getAuthor(p)?.role ?? 'User'

  const timeAgo = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffM = Math.floor(diffMs / 60000)
    const diffH = Math.floor(diffM / 60)
    const diffD = Math.floor(diffH / 24)
    if (diffM < 1) return 'Just now'
    if (diffM < 60) return `${diffM}m ago`
    if (diffH < 24) return `${diffH}h ago`
    if (diffD < 7) return `${diffD}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const fetchComments = useCallback(async (postId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (error) {
      setCommentsByPostId((prev) => ({ ...prev, [postId]: [] }))
      return
    }
    setCommentsByPostId((prev) => ({ ...prev, [postId]: (data as CommentRow[]) ?? [] }))
  }, [])

  useEffect(() => {
    if (openCommentsPostId) fetchComments(openCommentsPostId)
  }, [openCommentsPostId, fetchComments])

  useEffect(() => {
    const handler = () => {
      if (posts.length === 0) return
      const postIds = posts.map((p) => p.id)
      if (currentUserId) {
        supabase
          .from('likes')
          .select('post_id, user_id')
          .in('post_id', postIds)
          .then(({ data }) => {
            const countByPost: Record<string, number> = {}
            const liked = new Set<string>()
            postIds.forEach((id) => { countByPost[id] = 0 })
            ;(data ?? []).forEach((r: { post_id: string; user_id: string }) => {
              countByPost[r.post_id] = (countByPost[r.post_id] ?? 0) + 1
              if (r.user_id === currentUserId) liked.add(r.post_id)
            })
            setLikeCountByPostId((prev) => ({ ...prev, ...countByPost }))
            setLikedPostIds((prev) => {
              const next = new Set(prev)
              postIds.forEach((id) => {
                if (liked.has(id)) next.add(id)
                else next.delete(id)
              })
              return next
            })
          })
      }
      supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)
        .then(({ data }) => {
          const countByPost: Record<string, number> = {}
          postIds.forEach((id) => { countByPost[id] = 0 })
          ;(data ?? []).forEach((r: { post_id: string }) => {
            countByPost[r.post_id] = (countByPost[r.post_id] ?? 0) + 1
          })
          setCommentCountByPostId((prev) => ({ ...prev, ...countByPost }))
        })
      if (openCommentsPostId) fetchComments(openCommentsPostId)
    }
    window.addEventListener(POST_ENGAGEMENT_CHANGED, handler)
    return () => window.removeEventListener(POST_ENGAGEMENT_CHANGED, handler)
  }, [currentUserId, posts, openCommentsPostId, fetchComments])

  const handleLikeToggle = async (postId: string) => {
    if (!currentUserId || likeLoading) return
    const isLiked = likedPostIds.has(postId)
    const count = likeCountByPostId[postId] ?? 0
    setLikeLoading(postId)
    setLikedPostIds((prev) => {
      const next = new Set(prev)
      if (isLiked) next.delete(postId)
      else next.add(postId)
      return next
    })
    setLikeCountByPostId((prev) => ({ ...prev, [postId]: count + (isLiked ? -1 : 1) }))
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: currentUserId })
        if (error) throw error
      }
    } catch (err) {
      setLikedPostIds((prev) => {
        const next = new Set(prev)
        if (isLiked) next.add(postId)
        else next.delete(postId)
        return next
      })
      setLikeCountByPostId((prev) => ({ ...prev, [postId]: count }))
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLikeLoading(null)
    }
  }

  const handleAddComment = async (postId: string) => {
    const text = commentText.trim()
    if (!currentUserId || !text || commentLoading) return
    setCommentLoading(postId)
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: currentUserId, content: text })
        .select('*, profiles(full_name, avatar_url)')
        .single()
      if (error) throw error
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] ?? []), data as CommentRow],
      }))
      setCommentText('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add comment.')
    } finally {
      setCommentLoading(null)
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!currentUserId || commentLoading) return
    setCommentLoading(commentId)
    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId)
      if (error) throw error
      setCommentsByPostId((prev) => ({
        ...prev,
        [postId]: (prev[postId] ?? []).filter((c) => c.id !== commentId),
      }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setCommentLoading(null)
    }
  }

  const handleDeletePost = async (post: PostRow) => {
    if (!currentUserId || post.user_id !== currentUserId) return
    if (!confirm('Delete this post?')) return
    setOpenMenuPostId(null)
    try {
      const { error } = await supabase.from('posts').delete().eq('id', post.id)
      if (error) throw error
      toast.success('Deleted.')
      fetchPosts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  const openEditModal = (post: PostRow) => {
    setEditingPost(post)
    setEditTitle(post.title)
    setEditContent(post.content ?? '')
    setEditEditionCurrent(post.edition_number != null ? String(post.edition_number) : '')
    setEditEditionTotal(post.edition_total != null ? String(post.edition_total) : '')
    setEditImageFile(null)
    setEditImagePreviewUrl(null)
    setOpenMenuPostId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingPost || !currentUserId || editingPost.user_id !== currentUserId) return
    if (!editTitle.trim()) {
      toast.error('Please enter a title.')
      return
    }
    setSaving(true)
    try {
      let imageUrl: string | null = editingPost.image_url
      if (editImageFile) {
        const ext = editImageFile.name.split('.').pop() || 'jpg'
        const path = `${currentUserId}/post-${Date.now()}.${ext}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_POSTS)
          .upload(path, editImageFile, { upsert: true })
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from(BUCKET_POSTS).getPublicUrl(uploadData.path)
        imageUrl = urlData.publicUrl
      }
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        content: editContent.trim() || null,
        image_url: imageUrl,
        price: null,
      }
      if (editingPost.type === 'sales') {
        const ec = editEditionCurrent.trim() ? Number(editEditionCurrent) : null
        const et = editEditionTotal.trim() ? Number(editEditionTotal) : null
        if (ec != null) payload.edition_number = ec
        if (et != null) payload.edition_total = et
      }
      const { error } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', editingPost.id)
      if (error) throw error
      toast.success('Updated.')
      setEditingPost(null)
      fetchPosts()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-[#8E86F5] border-b-2 border-[#8E86F5]'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-lg" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-500 font-medium">
            No posts yet.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Share your first post from your profile.
          </p>
          <Link
            href="/profile"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90"
            style={{ backgroundColor: '#8E86F5' }}
          >
            Write from profile
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="flex gap-3 min-w-0">
                  <Link
                    href={`/profile/${post.user_id}`}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-[#8E86F5]/50 transition-all"
                  >
                    {authorAvatar(post) ? (
                      <img
                        src={authorAvatar(post)!}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-500">
                        {authorName(post).slice(0, 1)}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <Link
                        href={`/profile/${post.user_id}`}
                        className="font-semibold text-slate-900 truncate hover:text-[#8E86F5] transition-colors"
                      >
                        {authorName(post)}
                      </Link>
                      {post.type === 'sales' ? (
                        <span className="bg-[#6B8E6B] text-white text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 align-middle">
                          🏷️ For Sale
                        </span>
                      ) : post.type === 'exhibition' ? (
                        <span className="bg-[#2F5D50]/15 text-[#2F5D50] text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 align-middle">
                          🖼️ Exhibition
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full font-medium ml-2 align-middle">
                          ✍️ Craft Diary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {authorRole(post)} · {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>
                <div
                  className="relative"
                  ref={openMenuPostId === post.id ? menuRef : undefined}
                >
                  <button
                    type="button"
                    onClick={() =>
                      post.user_id === currentUserId
                        ? setOpenMenuPostId((id) => (id === post.id ? null : post.id))
                        : undefined
                    }
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </button>
                  {post.user_id === currentUserId && openMenuPostId === post.id && (
                    <div className="absolute right-0 top-full mt-1 w-36 py-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => openEditModal(post)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {post.type === 'sales' && (
                <div className="px-4 pb-2 flex items-center gap-2">
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
                const urls =
                  post.image_urls?.length
                    ? post.image_urls
                    : post.image_url
                      ? [post.image_url]
                      : []
                if (urls.length === 0) return null
                if (urls.length === 1) {
                  return (
                    <div className="w-full bg-gray-100">
                      <img
                        src={urls[0]}
                        alt=""
                        className="w-full h-auto object-contain max-h-[600px]"
                      />
                    </div>
                  )
                }
                return <PostImagesCarousel urls={urls} />
              })()}
              <div className="px-4 py-3">
                {(() => {
                  const resolved = getContent(post as any)
                  return (
                    <>
                      <p className="text-sm font-medium text-slate-900">{resolved.title}</p>
                      {resolved.content && (
                        <p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                          {resolved.content}
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
              <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-100">
                <PostLikeComment
                  variant="inline"
                  postId={post.id}
                  currentUserId={currentUserId}
                  openComments={openCommentsPostId === post.id}
                  onToggleOpen={() => {
                    setOpenCommentsPostId((id) => {
                      const next = id === post.id ? null : post.id
                      if (next !== post.id) setCommentText('')
                      return next
                    })
                  }}
                  liked={likedPostIds.has(post.id)}
                  likeCount={likeCountByPostId[post.id] ?? 0}
                  comments={(commentsByPostId[post.id] ?? []) as EngagementCommentRow[]}
                  commentCount={
                    commentsByPostId[post.id] != null
                      ? commentsByPostId[post.id].length
                      : (commentCountByPostId[post.id] ?? 0)
                  }
                  likeLoading={likeLoading === post.id}
                  commentLoading={commentLoading}
                  commentText={openCommentsPostId === post.id ? commentText : ''}
                  setCommentText={setCommentText}
                  onLike={() => handleLikeToggle(post.id)}
                  onAddComment={() => handleAddComment(post.id)}
                  onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Dialog
        open={!!editingPost}
        onClose={() => {
          setEditingPost(null)
          setEditImageFile(null)
        }}
        title="Edit post"
      >
        {editingPost && (
          <div className="p-4 space-y-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Content"
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-slate-900 resize-none"
            />
            {editingPost.type === 'sales' && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 shrink-0">Edition</label>
                <input
                  type="number"
                  min={1}
                  value={editEditionCurrent}
                  onChange={(e) => setEditEditionCurrent(e.target.value)}
                  placeholder="1"
                  className="w-16 px-2 py-2 border border-gray-200 rounded-md text-slate-900 text-center text-sm"
                />
                <span className="text-gray-400">/</span>
                <input
                  type="number"
                  min={1}
                  value={editEditionTotal}
                  onChange={(e) => setEditEditionTotal(e.target.value)}
                  placeholder="5"
                  className="w-16 px-2 py-2 border border-gray-200 rounded-md text-slate-900 text-center text-sm"
                />
              </div>
            )}
            <label className="block text-sm text-gray-600 cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4" /> Change image (optional)
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {editImagePreviewUrl && (
              <div className="h-40 bg-gray-50 rounded border flex items-center justify-center overflow-hidden">
                <img src={editImagePreviewUrl} alt="Preview" className="h-full object-contain" />
              </div>
            )}
            {!editImagePreviewUrl &&
              (editingPost.image_url || (editingPost.image_urls?.length ?? 0) > 0) && (
              <p className="text-xs text-gray-500">Keep current image</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingPost(null)
                  setEditImageFile(null)
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
