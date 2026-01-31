'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

const newsItems = [
  { id: 1, title: 'PUMWI 아티스트 지원 프로그램 오픈' },
  { id: 2, title: '2026 상반기 콘서트 일정 안내' },
  { id: 3, title: '신규 기능: 작업 일지 공개' },
  { id: 4, title: '팬과 아티스트 매칭 이벤트' },
  { id: 5, title: '개인정보 처리방침 개정 안내' },
]

export default function NewsWidget() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-slate-900">PUMWI 뉴스</h3>
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
