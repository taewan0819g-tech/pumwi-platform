import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/components/providers/AuthProvider'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PUMWI - 아티스트와 팬을 위한 플랫폼',
  description: 'PUMWI에서 아티스트와 팬을 연결하세요',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="ko">
      <body className={`${inter.className} bg-[#F3F2EF] text-slate-900`}>
        <AuthProvider initialSession={session}>
          <Navbar user={user} />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
