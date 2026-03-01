import type { Metadata } from 'next'
import { Inter, Playfair_Display, Noto_Serif_KR } from 'next/font/google'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import { AuthProvider } from '@/components/providers/AuthProvider'

const inter = Inter({ subsets: ['latin'] })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const notoSerifKR = Noto_Serif_KR({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-noto-serif-kr', display: 'swap' })

export const metadata: Metadata = {
  title: 'PUMWI — Where Art Meets Value',
  description: 'Where Art Meets Value. PUMWI — A global art platform for artists and collectors.',
  openGraph: {
    title: 'PUMWI — Where Art Meets Value',
    description: 'Where Art Meets Value. PUMWI — A global art platform for artists and collectors.',
    // app/opengraph-image.png is automatically used by Next.js file convention for og:image
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${playfair.variable} ${notoSerifKR.variable} bg-[#F3F2EF] text-slate-900 min-h-screen flex flex-col`}>
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
