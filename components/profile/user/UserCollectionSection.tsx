'use client'

import { Bookmark } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'

/**
 * 유저가 스크랩하거나 구매한 항목(컬렉션)을 보여주는 섹션.
 * 현재는 UI 틀만 구성합니다.
 */
export default function UserCollectionSection() {
  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-900">컬렉션</h3>
      </CardHeader>
      <CardContent>
        <div className="py-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#8E86F5]/10 text-[#8E86F5] mb-4">
            <Bookmark className="w-7 h-7" />
          </div>
          <p className="text-gray-500 font-medium">스크랩·구매한 항목이 없습니다</p>
          <p className="text-sm text-gray-400 mt-1">
            마음에 드는 작품을 저장해 보세요.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
