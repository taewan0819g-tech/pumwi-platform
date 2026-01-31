import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/components/providers/AuthProvider'
import Navbar from '@/components/Navbar'
import Footer from '@/components/layout/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'PUMWI - 당신의 예술이 가치를 만나는 공간',
  description: '당신의 예술이 가치를 만나는 공간, PUMWI',
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
      <body className={`${inter.className} bg-[#F3F2EF] text-slate-900 min-h-screen flex flex-col`}>
        <AuthProvider initialSession={session}>
          <Navbar user={user} />
          <div className="flex-1">{children}</div>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  )
}
