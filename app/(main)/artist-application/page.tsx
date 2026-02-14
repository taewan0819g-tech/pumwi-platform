import Link from 'next/link'

export default function ArtistApplicationPage() {
  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center">
      <h1 className="text-xl font-semibold text-slate-900 mb-2">전시할 artist로 신청하기</h1>
      <p className="text-sm text-gray-600 mb-6">
        PUMWI 전시에 참여를 원하시는 아티스트 분들은 프로필에서 아티스트 신청을 진행해 주세요.
      </p>
      <Link
        href="/profile"
        className="inline-flex items-center justify-center py-3 px-6 rounded-md border-2 border-gray-900 text-gray-900 text-sm font-medium hover:bg-gray-50 transition-colors"
      >
        프로필로 이동
      </Link>
    </div>
  )
}
