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
  const [items, setItems] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  const [writerName, setWriterName] = useState('')
  const [writerRole, setWriterRole] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchRecommendations = async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('recommendations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) console.error(error)
    else setItems(data as Recommendation[])
    setLoading(false)
  }

  useEffect(() => {
    fetchRecommendations()
  }, [userId])

  // ★ 핵심 수정: ID 처리 강화
  const handleAdd = async () => {
    if (!writerName.trim() || !content.trim()) return
    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인이 필요합니다.')

      // 내 프로필에 내가 쓰는 경우 (테스트용)
      const targetUserId = userId
      const myId = user.id

      const { error } = await supabase.from('recommendations').insert({
        user_id: targetUserId,      // 받는 사람 (현재 프로필 주인)
        author_id: myId,            // 쓰는 사람 (나)
        writer_name: writerName.trim(),
        writer_role: writerRole.trim() || null,
        content: content.trim(),
      })

      if (error) throw error

      toast.success('저장되었습니다!')
      setModalOpen(false)
      setWriterName('')
      setWriterRole('')
      setContent('')
      await fetchRecommendations()
      router.refresh()

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || '등록 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('recommendations').delete().eq('id', id)
    if (!error) {
      toast.success('삭제되었습니다.')
      fetchRecommendations()
    }
  }

  return (
    <>
      <Card>
        <CardHeader action={isOwn && (
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1"/> 추가
          </Button>
        )}>
          <h3 className="font-semibold text-slate-900">받은 추천서</h3>
        </CardHeader>
        <CardContent>
          {!items.length ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              받은 추천서가 없습니다.
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map(r => (
                <li key={r.id} className="border-b last:border-0 pb-3 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-slate-700">{r.writer_name}</p>
                    {r.writer_role && <p className="text-xs text-gray-500">{r.writer_role}</p>}
                    <p className="text-sm mt-1 text-gray-600 whitespace-pre-wrap">{r.content}</p>
                  </div>
                  {/* 삭제 권한: 내가 쓴 거거나, 내 프로필에 달린 거면 삭제 가능 */}
                  {(isOwn || r.author_id === currentUserId) && (
                    <button onClick={() => handleDelete(r.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4"/>
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
          <input value={writerName} onChange={e=>setWriterName(e.target.value)} placeholder="추천인 이름" className="w-full border p-2 rounded"/>
          <input value={writerRole} onChange={e=>setWriterRole(e.target.value)} placeholder="직함 / 관계" className="w-full border p-2 rounded"/>
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="내용" className="w-full border p-2 rounded h-24 resize-none"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>취소</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? '저장...' : '등록'}</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}