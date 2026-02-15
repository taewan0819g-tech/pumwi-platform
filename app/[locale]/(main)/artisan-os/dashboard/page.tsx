import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const SAGE_GREEN = '#6B8E6B'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#F3F2EF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold" style={{ color: SAGE_GREEN }}>
          Dashboard
        </h1>
        <p className="mt-2 text-slate-600">Artisan OS — Dashboard. Content coming soon.</p>
      </div>
    </div>
  )
}
