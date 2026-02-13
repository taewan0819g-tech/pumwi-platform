'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/Dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { Playfair_Display } from 'next/font/google'
import type { Career } from '@/types/profile'

const playfair = Playfair_Display({ subsets: ['latin'], display: 'swap' })

interface ExperienceSectionProps {
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

  // 날짜 변환 헬퍼
  const toStorageDate = (val: string): string | null => {
    const t = val.trim()
    if (!t) return null
    if (/^\d{4}-\d{2}$/.test(t)) return `${t}-01`
    return t
  }

  const fetchCareers = async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('careers')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false })
    
    if (error) console.error(error)
    else setCareers(data as Career[])
    setLoading(false)
  }

  useEffect(() => {
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
    setDescription(c.description || '')
    setModalOpen(true)
  }

  // ★ 핵심 수정: user_id 확실하게 넣기
  const handleSubmit = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sign in required.')

      const startStorage = toStorageDate(startDate)
      const endStorage = toStorageDate(endDate)

      if (!startStorage) {
        toast.error('Please use start date format YYYY-MM')
        setSaving(false)
        return
      }

      if (editingCareer) {
        // 수정
        const { error } = await supabase
          .from('careers')
          .update({
            company_name: companyName,
            title: title,
            start_date: startStorage,
            end_date: endStorage,
            description: description || null,
          })
          .eq('id', editingCareer.id)
        if (error) throw error
      } else {
        // 추가 (user_id: user.id 사용)
        const { error } = await supabase.from('careers').insert({
          user_id: user.id, // ★ Prop 말고 진짜 Session ID 사용
          company_name: companyName,
          title: title,
          start_date: startStorage,
          end_date: endStorage,
          description: description || null,
        })
        if (error) throw error
      }

      toast.success('Saved!')
      setModalOpen(false)
      await fetchCareers()
      router.refresh()

    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return
    const { error } = await supabase.from('careers').delete().eq('id', id)
    if (!error) {
      toast.success('Deleted.')
      fetchCareers()
    }
  }

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start) return ''
    const s = start.slice(0, 7)
    const e = end ? end.slice(0, 7) : 'Present'
    return `${s} — ${e}`
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
            Exhibitions & activity
          </h3>
          {isOwn && (
            <Button variant="ghost" size="sm" onClick={openAdd} className="text-gray-500 hover:text-[#2F5D50]">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          )}
        </div>
        <div className="px-6 pb-8 pt-2">
          <div className="border-t border-[#2F5D50]/20 pt-6" />
          {!careers.length ? (
            <div className="py-12 text-center text-gray-500 text-sm">No entries yet.</div>
          ) : (
            <ul className="relative">
              {/* Vertical timeline line */}
              <div
                className="absolute left-[11px] top-2 bottom-2 w-px"
                style={{ backgroundColor: 'rgba(47, 93, 80, 0.2)' }}
              />
              {careers.map((c, i) => (
                <li key={c.id} className="relative flex gap-6 pb-8 last:pb-0">
                  <div
                    className="flex-shrink-0 w-6 h-6 rounded-full border-2 mt-0.5"
                    style={{ backgroundColor: '#FAF9F7', borderColor: '#2F5D50' }}
                  />
                  <div className="flex-1 min-w-0 flex justify-between items-start gap-4">
                    <div>
                      <p className={`${playfair.className} font-semibold text-slate-900`}>{c.company_name}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
                        {formatDateRange(c.start_date, c.end_date)}
                      </p>
                      {c.description && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{c.description}</p>
                      )}
                    </div>
                    {isOwn && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-[#2F5D50] hover:bg-[#2F5D50]/5 rounded"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} title={editingCareer ? 'Edit entry' : 'Add entry'}>
        <div className="p-4 space-y-3">
          <input value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Organization" className="w-full border p-2 rounded"/>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Role / title" className="w-full border p-2 rounded"/>
          <div className="flex gap-2">
            <input value={startDate} onChange={e=>setStartDate(e.target.value)} placeholder="Start (YYYY-MM)" className="w-1/2 border p-2 rounded"/>
            <input value={endDate} onChange={e=>setEndDate(e.target.value)} placeholder="End (optional)" className="w-1/2 border p-2 rounded"/>
          </div>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description" className="w-full border p-2 rounded h-20 resize-none"/>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}