'use client'

import { usePathname } from 'next/navigation'
import Footer from './Footer'

/** Renders Footer only when not on auth pages (login/signup have their own layout). */
export default function FooterGate() {
  const pathname = usePathname()
  const isAuthPage = pathname != null && (pathname.endsWith('/login') || pathname.endsWith('/signup'))
  if (isAuthPage) return null
  return <Footer />
}
