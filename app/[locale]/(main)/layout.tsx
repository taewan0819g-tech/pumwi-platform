import type { ReactNode } from 'react'

export default async function MainLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-[#F9F9F8] overflow-x-hidden">
      <main className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        {children}
      </main>
    </div>
  )
}
