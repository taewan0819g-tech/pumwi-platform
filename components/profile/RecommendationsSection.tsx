'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/Dialog'
import { Plus, Trash2, BadgeCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { Playfair_Display } from 'next/font/google'
import type { Recommendation } from '@/types/profile'

const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' })

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
      if (!user) throw new Error('Sign in required.')

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

      toast.success('Saved!')
      setModalOpen(false)
      setWriterName('')
      setWriterRole('')
      setContent('')
      await fetchRecommendations()
      router.refresh()

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed to add.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this recommendation?')) return
    const { error } = await supabase.from('recommendations').delete().eq('id', id)
    if (!error) {
      toast.success('Deleted.')
      fetchRecommendations()
    }
  }

  return (
    <>
      <section
        className="rounded-lg overflow-hidden bg-[#FAF9F7] border border-[#2F5D50]/10"
        style={{ boxShadow: '0 1px 3px rgba(47, 93, 80, 0.06)' }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h3
            className={`${playfair.className} text-lg font-semibold tracking-tight`}
            style={{ color: '#2F5D50' }}
          >
            Recommendations
          </h3>
          {!isOwn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModalOpen(true)}
              className="text-gray-500 hover:text-[#2F5D50]"
            >
              <Plus className="w-4 h-4 mr-1" /> Write a Recommendation
            </Button>
          )}
        </div>
        <div className="px-6 pb-8 pt-2">
          <div className="border-t border-[#2F5D50]/20 pt-6" />
          {!items.length ? (
            <div className="py-12 text-center text-gray-500 text-sm">No recommendations yet.</div>
          ) : (
            <ul className="space-y-0">
              {items.map((r, i) => (
                <li
                  key={r.id}
                  className={`flex justify-between items-start gap-6 py-8 ${i > 0 ? 'border-t border-[#2F5D50]/10' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5">
                        <BadgeCheck className="w-4 h-4 flex-shrink-0" style={{ color: '#2F5D50' }} aria-hidden />
                        <span className={`${playfair.className} font-semibold text-slate-900`}>{r.writer_name}</span>
                      </span>
                      {r.writer_role && (
                        <span className="text-xs text-gray-500 font-medium">{r.writer_role}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed mt-3 pl-6">
                      {r.content}
                    </p>
                  </div>
                  {(isOwn || r.author_id === currentUserId) && (
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50/50 rounded flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title="Add recommendation">
        <div className="p-4 space-y-3">
          <input value={writerName} onChange={e=>setWriterName(e.target.value)} placeholder="Recommender name" className="w-full border p-2 rounded"/>
          <input value={writerRole} onChange={e=>setWriterRole(e.target.value)} placeholder="Title / relationship" className="w-full border p-2 rounded"/>
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="Content" className="w-full border p-2 rounded h-24 resize-none"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Add'}</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}