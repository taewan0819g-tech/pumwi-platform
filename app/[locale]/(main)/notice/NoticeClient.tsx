'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

type NoticeItem = {
  id: string
  title: string
  content: string | null
  created_at: string
  category?: string | null
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

function CategoryBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
      {value}
    </span>
  )
}

export default function NoticeClient() {
  const [items, setItems] = useState<NoticeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState<NoticeItem | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('news')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[Notice]', error)
          setItems([])
        } else {
          setItems((data ?? []) as NoticeItem[])
        }
        setLoading(false)
      })
  }, [])

  const openModal = (item: NoticeItem) => setModalItem(item)
  const closeModal = () => setModalItem(null)

  const categoryLabel = (item: NoticeItem) =>
    item.category?.trim() || 'Notice'

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Announcements</h1>
        <p className="mt-1 text-sm text-gray-500">
          Updates from the PUMWI team.
        </p>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-500">
          Loading...
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          No notices yet.
        </div>
      ) : (
        <ul className="border border-gray-200 rounded-lg overflow-hidden bg-white divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => openModal(item)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900 line-clamp-1">
                    {item.title}
                  </span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {formatDate(item.created_at)}
                  </span>
                </span>
                <CategoryBadge value={categoryLabel(item)} />
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!modalItem}
        onClose={closeModal}
        title={modalItem?.title ?? 'Notice'}
        className="max-w-lg"
      >
        <div className="p-4">
          {modalItem && (
            <p className="text-xs text-gray-500 mb-3">
              {formatDate(modalItem.created_at)}
              {categoryLabel(modalItem) && (
                <>
                  {' · '}
                  <CategoryBadge value={categoryLabel(modalItem)} />
                </>
              )}
            </p>
          )}
          {modalItem?.content ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {modalItem.content}
            </p>
          ) : (
            <p className="text-sm text-gray-500">No content.</p>
          )}
        </div>
      </Dialog>
    </>
  )
}
