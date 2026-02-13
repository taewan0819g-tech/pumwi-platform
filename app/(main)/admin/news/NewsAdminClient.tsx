'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Pencil, Trash2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import type { NewsRow } from './page'

type Props = { initialList: NewsRow[] }

export default function NewsAdminClient({ initialList }: Props) {
  const router = useRouter()
  const [list, setList] = useState<NewsRow[]>(initialList)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<NewsRow | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const openAdd = () => {
    setEditing(null)
    setTitle('')
    setContent('')
    setModalOpen(true)
  }

  const openEdit = (row: NewsRow) => {
    setEditing(row)
    setTitle(row.title)
    setContent(row.content ?? '')
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setTitle('')
    setContent('')
  }

  const handleSave = async () => {
    const t = title.trim()
    if (!t) {
      toast.error('Title is required.')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      if (editing) {
        const { error } = await supabase
          .from('news')
          .update({ title: t, content: content.trim() || null })
          .eq('id', editing.id)
        if (error) throw error
        setList((prev) =>
          prev.map((r) =>
            r.id === editing.id ? { ...r, title: t, content: content.trim() || null } : r
          )
        )
        toast.success('Updated.')
      } else {
        const { data, error } = await supabase
          .from('news')
          .insert({ title: t, content: content.trim() || null })
          .select('id, title, content, created_at')
          .single()
        if (error) throw error
        setList((prev) => [{ ...(data as NewsRow) }, ...prev])
        toast.success('Created.')
      }
      closeModal()
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this news item?')) return
    setDeletingId(id)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('news').delete().eq('id', id)
      if (error) throw error
      setList((prev) => prev.filter((r) => r.id !== id))
      toast.success('Deleted.')
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <>
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[#2F5D50]">News Management</h1>
        <button
          type="button"
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2F5D50] text-white text-sm font-medium hover:bg-[#2F5D50]/90"
        >
          <Plus className="h-4 w-4" />
          Add New News
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-28">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                  No news yet. Click &quot;Add New News&quot; to create one.
                </td>
              </tr>
            ) : (
              list.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-sm text-gray-900">{row.title}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-[#2F5D50]"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                        className="p-2 rounded-md text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={modalOpen}
        onClose={closeModal}
        title={editing ? 'Edit News' : 'Add New News'}
        className="max-w-lg"
      >
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#2F5D50] focus:border-transparent outline-none"
              placeholder="News title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-[#2F5D50] focus:border-transparent outline-none resize-y"
              placeholder="News content (optional)"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#2F5D50] text-white hover:bg-[#2F5D50]/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
