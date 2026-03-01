import { createClient } from '@/lib/supabase/server'
import SearchPageClient, { type SearchResultRow } from './SearchPageClient'

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q: qParam } = await searchParams
  const q = (qParam ?? '').trim()

  let results: SearchResultRow[] = []
  if (q) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, cover_url, role, bio, city, country')
      .ilike('full_name', `%${q}%`)
      .limit(24)
    if (!error && data) {
      results = data as SearchResultRow[]
    }
  }

  return (
    <SearchPageClient initialQ={q} results={results} />
  )
}
