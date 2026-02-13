'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChevronRight } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'

type NewsItem = {
  id: string
  title: string
  content: string | null
  created_at: string
}

export default function NewsWidget() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalItem, setModalItem] = useState<NewsItem | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('news')
      .select('id, title, content, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data, error }) => {
        if (error) {
          console.error('[NewsWidget]', error)
          setItems([])
        } else {
          setItems((data ?? []) as NewsItem[])
        }
        setLoading(false)
      })
  }, [])

  const openModal = (item: NewsItem) => setModalItem(item)
  const closeModal = () => setModalItem(null)

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-slate-900">PUMWI News</h3>
        </div>
        {loading ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-500">No recent news.</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => openModal(item)}
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="line-clamp-1">{item.title}</span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!modalItem} onClose={closeModal} title={modalItem?.title ?? 'News'} className="max-w-lg">
        <div className="p-4">
          {modalItem?.content ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{modalItem.content}</p>
          ) : (
            <p className="text-sm text-gray-500">No content.</p>
          )}
        </div>
      </Dialog>
    </>
  )
}
