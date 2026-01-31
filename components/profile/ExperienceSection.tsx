'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Career } from '@/types/profile'

interface ExperienceSectionProps {
  /** 현재 로그인된 유저의 ID (RLS 및 insert 시 user_id에 사용) */
  userId: string
  isOwn: boolean
}

export default function ExperienceSection({ userId, isOwn }: ExperienceSectionProps) {
  const router = useRouter()
  const [careers, setCareers] = useState<Career[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCareer, setEditingCareer] = useState<Career | null>(null)
  const [companyName, setCompanyName] = useState('')
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  /** YYYY-MM 입력을 DB용 유효 날짜(YYYY-MM-01)로 변환 */
  const toStorageDate = (val: string): string | null => {
    const t = val.trim()
    if (!t) return null
    if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
    return t
  }

  const resetForm = () => {
    setCompanyName('')
    setTitle('')
    setStartDate('')
    setEndDate('')
    setDescription('')
    setEditingCareer(null)
  }

  const fetchCareers = async () => {
    try {
      const { data, error } = await supabase
        .from('careers')
        .select('*')
        .eq('user_id', userId)
        .order('start_date', { ascending: false })
      if (error) {
        console.error('[careers fetch]', error)
        toast.error(error.message)
        setCareers([])
        return
      }
      setCareers(Array.isArray(data) ? (data as Career[]) : [])
    } catch (err) {
      console.error('[fetchCareers]', err)
      setCareers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) {
      setCareers([])
      setLoading(false)
      return
    }
    setLoading(true)
    fetchCareers()
  }, [userId])

  const openAdd = () => {
    setEditingCareer(null)
    setCompanyName('')
    setTitle('')
    setStartDate('')
    setEndDate('')
    setDescription('')
    setModalOpen(true)
  }

  const openEdit = (c: Career) => {
    setEditingCareer(c)
    setCompanyName(c.company_name)
    setTitle(c.title)
    setStartDate(c.start_date ? c.start_date.slice(0, 7) : '')
    setEndDate(c.end_date ? c.end_date.slice(0, 7) : '')
    setDescription(c.description ?? '')
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (editingCareer) {
        const startStorage = toStorageDate(startDate)
        const endStorage = endDate.trim() ? toStorageDate(endDate) : null
        if (!startStorage) {
          toast.error('시작일을 YYYY-MM 또는 YYYY-MM-DD 형식으로 입력하세요.')
          setSaving(false)
          return
        }
        const { error } = await supabase
          .from('careers')
          .update({
            company_name: companyName.trim(),
            title: title.trim(),
            start_date: startStorage,
            end_date: endStorage,
            description: description.trim() || null,
          })
          .eq('id', editingCareer.id)
        if (error) {
          console.error('[careers update]', error)
          toast.error(error.message)
          setSaving(false)
          return
        }
        toast.success('저장되었습니다!')
      } else {
        const startStorage = toStorageDate(startDate)
        const endStorage = endDate.trim() ? toStorageDate(endDate) : null
        if (!startStorage) {
          toast.error('시작일을 YYYY-MM 또는 YYYY-MM-DD 형식으로 입력하세요.')
          setSaving(false)
          return
        }
        const { error } = await supabase.from('careers').insert({
          user_id: userId,
          company_name: companyName.trim(),
          title: title.trim(),
          start_date: startStorage,
          end_date: endStorage,
          description: description.trim() || null,
        })
        if (error) {
          console.error('[careers insert]', error)
          toast.error(error.message)
          setSaving(false)
          return
        }
        toast.success('저장되었습니다!')
      }
      setModalOpen(false)
      resetForm()
      await fetchCareers()
      router.refresh()
    } catch (err: unknown) {
      console.error('[ExperienceSection handleSubmit]', err)
      toast.error(err instanceof Error ? err.message : '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 경력을 삭제하시겠습니까?')) return
    try {
      const { error } = await supabase.from('careers').delete().eq('id', id)
      if (error) {
        console.error('[careers delete]', error)
        toast.error(error.message)
        return
      }
      toast.success('삭제되었습니다.')
      await fetchCareers()
    } catch (err) {
      console.error('[handleDelete]', err)
      toast.error(err instanceof Error ? err.message : '삭제 실패')
    }
  }

  return (
    <>
      <Card>
        <CardHeader
          action={
            isOwn && (
              <Button variant="ghost" size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            )
          }
        >
          <h3 className="font-semibold text-slate-900">경력</h3>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 bg-gray-100 rounded-lg" />
              <div className="h-16 bg-gray-100 rounded-lg" />
              <div className="h-16 bg-gray-100 rounded-lg" />
            </div>
          ) : !careers?.length ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 text-sm font-medium">
                아직 등록된 경력이 없습니다.
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {isOwn ? '경력을 추가해보세요!' : ''}
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {careers.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-2 py-3 border-b border-gray-100 last:border-0"
                >
                  <div>
                    <p className="font-medium text-slate-900">{c.company_name}</p>
                    <p className="text-sm text-gray-600">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.start_date ? c.start_date.slice(0, 7) : '-'} ~ {c.end_date ? c.end_date.slice(0, 7) : '현재'}
                    </p>
                    {c.description && (
                      <p className="text-sm text-gray-600 mt-1">{c.description}</p>
                    )}
                  </div>
                  {isOwn && (
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCareer ? '경력 수정' : '경력 추가'}
      >
        <div className="p-4 space-y-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="회사명"
            className="w-full px-3 py-2 border border-gray-200 rounded-md"
            required
          />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="직함"
            className="w-full px-3 py-2 border border-gray-200 rounded-md"
            required
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="시작일 (예: 2020-01)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md"
            />
            <input
              type="text"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="종료일 (비우면 현재)"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-md resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving || !companyName.trim() || !title.trim() || !startDate.trim()}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
