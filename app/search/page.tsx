import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { User } from 'lucide-react'

interface SearchPageProps {
  searchParams: { q?: string }
}

interface ProfileSearchRow {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
  bio: string | null
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const q = (searchParams.q ?? '').trim()

  let results: ProfileSearchRow[] = []
  if (q) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role, bio')
      .ilike('full_name', `%${q}%`)
      .limit(20)
    if (!error && data) {
      results = data as ProfileSearchRow[]
    }
  }

  return (
    <div className="min-h-screen bg-[#F3F2EF] pb-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-xl font-bold text-slate-900 mb-2">검색 결과</h1>
        {!q ? (
          <p className="text-gray-500 text-sm">검색어를 입력해 주세요.</p>
        ) : results.length === 0 ? (
          <p className="text-gray-500 font-medium py-8">검색 결과가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {results.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/profile/${user.id}`}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:bg-slate-50 hover:border-[#8E86F5]/30 transition-colors cursor-pointer"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {user.full_name ?? '이름 없음'}
                    </p>
                    {user.role && (
                      <p className="text-xs text-[#8E86F5] mt-0.5">{user.role}</p>
                    )}
                    {user.bio && (
                      <p className="text-sm text-gray-500 truncate mt-1">{user.bio}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
