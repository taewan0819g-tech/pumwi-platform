'use client'

import { Fragment, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

const STORAGE_KEY = 'pumwi_hide_founder_letter'

function renderLetterContent(content: string) {
  return content.split('\n').map((line, i) => (
    <Fragment key={i}>
      {line.split(/\*\*([^*]+)\*\*/g).map((part, j) =>
        j % 2 === 1 ? <strong key={j} className="font-semibold text-slate-800">{part}</strong> : part
      )}
      {i < content.split('\n').length - 1 ? <br /> : null}
    </Fragment>
  ))
}

export function getFounderLetterHidden(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'true'
}

export function setFounderLetterHidden(): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, 'true')
}

interface FoundersLetterModalProps {
  open: boolean
  onClose: () => void
  onNeverShowAgain: () => void
}

export default function FoundersLetterModal({
  open,
  onClose,
  onNeverShowAgain,
}: FoundersLetterModalProps) {
  const t = useTranslations('founders_letter')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  const handleNeverShow = () => {
    setFounderLetterHidden()
    onNeverShowAgain()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        ref={ref}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col font-serif"
      >
        {/* Top right close */}
        <div className="flex justify-end p-3 border-b border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Header */}
        <h2 className="text-xl font-bold text-slate-900 px-6 pt-4 pb-2">
          {t('title')}
        </h2>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 text-slate-700 text-[15px] leading-relaxed">
          {renderLetterContent(t('content'))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleNeverShow}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 underline"
          >
            {t('never_show')}
          </button>
        </div>
      </div>
    </div>
  )
}
