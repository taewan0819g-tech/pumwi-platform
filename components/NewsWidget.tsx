'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const newsItems = [
  { id: 1, title: 'PUMWI Artist Support Program now open' },
  { id: 2, title: '2026 first-half events calendar' },
  { id: 3, title: 'New: Studio Log now public' },
  { id: 4, title: 'Collector–Artist matching event' },
  { id: 5, title: 'Privacy policy update' },
]

export default function NewsWidget() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-slate-900">PUMWI News</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {newsItems.map((item) => (
          <li key={item.id}>
            <Link
              href={`/news/${item.id}`}
              className="flex items-center justify-between gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="line-clamp-1">{item.title}</span>
              <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
