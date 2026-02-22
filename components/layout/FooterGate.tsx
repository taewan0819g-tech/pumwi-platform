'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

/** Renders Footer only when not on the luxury login/landing page (which has its own deep-black footer). */
export default function FooterGate() {
  const pathname = usePathname()
  const isLoginPage = pathname?.endsWith('/login') ?? false
  if (isLoginPage) return null
  return <Footer />
}
