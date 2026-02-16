'use client'

import { useState, useEffect } from 'react'
import FoundersLetterModal, { getFounderLetterHidden } from '@/components/modals/FoundersLetterModal'

export default function HomePageWithFounderModal({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (!getFounderLetterHidden()) {
      setShowModal(true)
    }
  }, [mounted])

  return (
    <>
      {children}
      <FoundersLetterModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onNeverShowAgain={() => setShowModal(false)}
      />
    </>
  )
}
