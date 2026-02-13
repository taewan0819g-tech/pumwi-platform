import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#F9F9F8]">
      <div className="max-w-4xl mx-auto w-full py-12 px-4">
        <h1
          className="text-2xl sm:text-3xl font-bold text-center mb-6"
          style={{ color: '#6B8E6B' }}
        >
          Insights
        </h1>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-slate-600">Coming Soon</p>
        </div>
      </div>
    </div>
  )
}
