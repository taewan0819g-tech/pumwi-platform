'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Heart,
  MessageCircle,
  Share2,
  User,
  Send,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export interface CommentRow {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: { full_name: string | null; avatar_url: string | null } | null
}

const POST_ENGAGEMENT_CHANGED = 'post-engagement-changed'

function timeAgo(dateStr: string) {
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

/** Standalone: fetches its own likes/comments, dispatches event on mutation so Feed can refetch */
function usePostEngagement(postId: string, currentUserId: string | null) {
  const supabase = createClient()
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [likeLoading, setLikeLoading] = useState(false)
  const [commentLoading, setCommentLoading] = useState(false)

  const refetch = useCallback(async () => {
    if (!postId) return
    setLoading(true)
    const [likesRes, commentsRes] = await Promise.all([
      supabase.from('likes').select('user_id').eq('post_id', postId),
      supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true }),
    ])
    const likes = likesRes.data ?? []
    setLikeCount(likes.length)
    setLiked(currentUserId ? likes.some((r) => r.user_id === currentUserId) : false)
    setComments((commentsRes.data as CommentRow[]) ?? [])
    setLoading(false)
  }, [postId, currentUserId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const dispatchChanged = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(POST_ENGAGEMENT_CHANGED, { detail: { postId } }))
    }
  }, [postId])

  const toggleLike = useCallback(async () => {
    if (!currentUserId || likeLoading) return
    setLikeLoading(true)
    const nextLiked = !liked
    setLiked(nextLiked)
    setLikeCount((c) => c + (nextLiked ? 1 : -1))
    try {
      if (nextLiked) {
        const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId })
        if (error) throw error
      } else {
        const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUserId)
        if (error) throw error
      }
      dispatchChanged()
    } catch (err) {
      setLiked(!nextLiked)
      setLikeCount((c) => c + (nextLiked ? -1 : 1))
      toast.error(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLikeLoading(false)
    }
  }, [postId, currentUserId, liked, likeLoading, dispatchChanged])

  const addComment = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!currentUserId || !trimmed || commentLoading) return
      setCommentLoading(true)
      try {
        const { data, error } = await supabase
          .from('comments')
          .insert({ post_id: postId, user_id: currentUserId, content: trimmed })
          .select('*, profiles(full_name, avatar_url)')
          .single()
        if (error) throw error
        setComments((prev) => [...prev, data as CommentRow])
        dispatchChanged()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to add comment.')
      } finally {
        setCommentLoading(false)
      }
    },
    [postId, currentUserId, commentLoading, dispatchChanged]
  )

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!currentUserId || commentLoading) return
      setCommentLoading(true)
      try {
        const { error } = await supabase.from('comments').delete().eq('id', commentId)
        if (error) throw error
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        dispatchChanged()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Delete failed.')
      } finally {
        setCommentLoading(false)
      }
    },
    [currentUserId, commentLoading, dispatchChanged]
  )

  return {
    liked,
    likeCount,
    comments,
    loading,
    likeLoading,
    commentLoading,
    toggleLike,
    addComment,
    deleteComment,
    refetch,
  }
}

export { POST_ENGAGEMENT_CHANGED }

/** Controlled props when variant is 'inline' (used by Feed) */
interface PostLikeCommentInlineProps {
  variant: 'inline'
  postId: string
  currentUserId: string | null
  openComments: boolean
  onToggleOpen: () => void
  liked: boolean
  likeCount: number
  comments: CommentRow[]
  likeLoading: boolean
  commentLoading: string | null
  commentText: string
  setCommentText: (s: string) => void
  onLike: () => void
  onAddComment: () => void
  onDeleteComment: (commentId: string) => void
}

/** Standalone when variant is 'modal' (used by profile post detail modal) */
interface PostLikeCommentModalProps {
  variant: 'modal'
  postId: string
  currentUserId: string | null
  /** When true, comment list has overflow-y-auto and takes remaining space */
  scrollable?: boolean
}

type PostLikeCommentProps = PostLikeCommentInlineProps | PostLikeCommentModalProps

export function PostLikeComment(props: PostLikeCommentProps) {
  const { variant, postId, currentUserId } = props

  const [modalCommentText, setModalCommentText] = useState('')

  const standalone = variant === 'modal' ? usePostEngagement(postId, currentUserId) : null

  const liked = variant === 'inline' ? props.liked : standalone!.liked
  const likeCount = variant === 'inline' ? props.likeCount : standalone!.likeCount
  const comments = variant === 'inline' ? props.comments : standalone!.comments
  const likeLoading = variant === 'inline' ? props.likeLoading : standalone!.likeLoading
  const commentLoading = variant === 'inline' ? !!props.commentLoading : standalone!.commentLoading
  const openComments = variant === 'inline' ? props.openComments : true
  const commentText = variant === 'inline' ? props.commentText : modalCommentText
  const setCommentText = variant === 'inline' ? props.setCommentText! : setModalCommentText

  const onLike =
    variant === 'inline'
      ? props.onLike
      : () => standalone!.toggleLike()
  const onAddComment =
    variant === 'inline'
      ? props.onAddComment
      : () => {
          standalone!.addComment(modalCommentText)
          setModalCommentText('')
        }
  const onDeleteComment =
    variant === 'inline' ? props.onDeleteComment : (id: string) => standalone!.deleteComment(id)
  const onToggleOpen = variant === 'inline' ? props.onToggleOpen : undefined

  const isModal = variant === 'modal'
  const scrollable = isModal && (props.scrollable !== false)

  return (
    <div className={isModal ? (scrollable ? 'flex flex-col flex-1 min-h-0 overflow-hidden' : 'flex flex-col min-h-0') : undefined}>
      <div className={`flex items-center gap-6 text-gray-600 flex-shrink-0 ${isModal ? 'py-2 border-b border-gray-100' : 'px-4 py-2 border-t border-gray-100'}`}>
        <button
          type="button"
          onClick={onLike}
          disabled={!currentUserId || likeLoading}
          className={`flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${
            liked ? 'text-red-500 hover:text-red-600' : 'hover:text-[#8E86F5]'
          }`}
        >
          <Heart className="h-4 w-4" fill={liked ? 'currentColor' : 'none'} />
          <span>{likeCount}</span>
        </button>
        {onToggleOpen ? (
          <button
            type="button"
            onClick={onToggleOpen}
            className="flex items-center gap-1.5 text-sm hover:text-[#8E86F5] transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Comments</span>
            {comments.length > 0 && (
              <span className="text-gray-400">({comments.length})</span>
            )}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <MessageCircle className="h-4 w-4" />
            <span>Comments</span>
            {comments.length > 0 && (
              <span className="text-gray-400">({comments.length})</span>
            )}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-sm text-gray-400 cursor-default">
          <Share2 className="h-4 w-4" />
          <span>Share</span>
        </span>
      </div>

      {openComments && (
        <div className={scrollable ? 'flex flex-col flex-1 min-h-0 overflow-hidden' : undefined}>
          <ul
            className={
              scrollable
                ? 'space-y-3 mb-3 overflow-y-auto flex-1 min-h-0 py-2'
                : 'space-y-3 mb-3 max-h-48 overflow-y-auto'
            }
          >
            {comments.length === 0 ? (
              <li className="text-sm text-gray-500 py-2">No comments yet.</li>
            ) : (
              comments.map((c) => (
                <li key={c.id} className="flex gap-3">
                  <Link
                    href={`/profile/${c.user_id}`}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center"
                  >
                    {c.profiles?.avatar_url ? (
                      <img
                        src={c.profiles.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-gray-500" />
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/profile/${c.user_id}`}
                        className="text-sm font-medium text-slate-900 hover:text-[#8E86F5]"
                      >
                        {c.profiles?.full_name ?? 'User'}
                      </Link>
                      <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
                      {c.user_id === currentUserId && (
                        <button
                          type="button"
                          onClick={() => onDeleteComment(c.id)}
                          disabled={commentLoading}
                          className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap mt-0.5">
                      {c.content}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ul>
          {currentUserId && (
            <div className="flex gap-2 flex-shrink-0">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    onAddComment()
                  }
                }}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
              />
              <button
                type="button"
                onClick={() => onAddComment()}
                disabled={!commentText.trim() || commentLoading}
                className="flex-shrink-0 p-2 rounded-lg bg-[#8E86F5] text-white hover:opacity-90 disabled:opacity-50"
                title="Post"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
