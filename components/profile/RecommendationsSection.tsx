'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Recommendation } from '@/types/profile'

interface RecommendationWithAuthor extends Recommendation {
  author_name?: string | null
}

interface RecommendationsSectionProps {
  userId: string
  currentUserId: string
  isOwn: boolean
}

export default function RecommendationsSection({
  userId,
  currentUserId,
  isOwn,
}: RecommendationsSectionProps) {
  const router = useRouter()
  const [items, setItems] = useState<RecommendationWithAuthor[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [writerName, setWriterName] = useState('')
  const [writerRole, setWriterRole] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  /** 받은 추천서: user_id(받는 사람)가 내 ID인 것만 조회 */
  const fetchRecommendations = async () => {
    if (!userId) {
      setItems([])
      setLoading(false)
      return
    }
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) {
        console.error('[recommendations fetch]', error)
        setItems([])
        setLoading(false)
        return
      }
      const list = Array.isArray(data) ? (data as Recommendation[]) : []
      const withAuthors = await Promise.all(
        list.map(async (r) => {
          if (r.writer_name?.trim()) {
            return { ...r, author_name: r.writer_name }
          }
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', r.author_id)
            .single()
          return { ...r, author_name: profile?.full_name ?? null }
        })
      )
      setItems(withAuthors)
    } catch (err) {
      console.error('[fetchRecommendations]', err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecommendations()
  }, [userId])

  const handleAdd = async () => {
    if (!writerName.trim() || !content.trim() || !userId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('recommendations').insert({
        user_id: userId,
        author_id: currentUserId,
        writer_name: writerName.trim(),
        writer_role: writerRole.trim() || null,
        content: content.trim(),
      })
      if (error) {
        console.error('[recommendations insert]', error)
        toast.error(error.message)
        setSaving(false)
        return
      }
      toast.success('저장되었습니다!')
      setWriterName('')
      setWriterRole('')
      setContent('')
      setModalOpen(false)
      await fetchRecommendations()
      router.refresh()
    } catch (err: unknown) {
      console.error('[handleAdd]', err)
      toast.error(err instanceof Error ? err.message : '등록 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 추천서를 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('recommendations').delete().eq('id', id)
      if (error) {
        console.error('[recommendations delete]', error)
        toast.error(error.message)
        return
      }
      toast.success('삭제되었습니다.')
      await fetchRecommendations()
      router.refresh()
    } catch (err) {
      console.error('[handleDelete]', err)
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  const canDelete = (r: RecommendationWithAuthor) =>
    isOwn && (r.user_id === currentUserId || r.author_id === currentUserId)

  return (
    <>
      <Card>
        <CardHeader
          action={
            isOwn && (
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            )
          }
        >
          <h3 className="font-semibold text-slate-900">받은 추천서</h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-20 bg-gray-100 rounded-lg" />
              <div className="h-20 bg-gray-100 rounded-lg" />
              <div className="h-20 bg-gray-100 rounded-lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 text-sm font-medium">
                받은 추천서가 없습니다.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {isOwn ? '추천서를 추가해 보세요. (테스트용 본인 추가 가능)' : ''}
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-2 py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {r.writer_name ?? r.author_name ?? '알 수 없음'}
                    </p>
                    {r.writer_role && (
                      <p className="text-xs text-gray-500">{r.writer_role}</p>
                    )}
                    <p className="text-gray-600 text-sm whitespace-pre-wrap mt-1">
                      {r.content}
                    </p>
                  </div>
                  {canDelete(r) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 rounded hover:bg-red-50 text-red-500 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="추천서 추가">
        <div className="p-4 space-y-3">
          <input
            type="text"
            value={writerName}
            onChange={(e) => setWriterName(e.target.value)}
            placeholder="추천인 이름"
            className="w-full px-3 py-2 border border-gray-200 rounded-md"
            required
          />
          <input
            type="text"
            value={writerRole}
            onChange={(e) => setWriterRole(e.target.value)}
            placeholder="추천인 직함 / 관계"
            className="w-full px-3 py-2 border border-gray-200 rounded-md"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="추천서 내용"
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-md resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !writerName.trim() || !content.trim()}
            >
              {saving ? '등록 중...' : '등록'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
