'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Mic, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

export type VoiceWriteTab = 'journal' | 'product' | 'exhibition'

interface VoiceWriteButtonProps {
  /** Context for AI persona (journal / product / exhibition) */
  tab: VoiceWriteTab
  /** Called with generated title and content (content may include \n) */
  onSuccess: (title: string, content: string) => void
  /** Optional class for the button wrapper */
  className?: string
  /** When true, show icon-only for tight UIs (e.g. edit dialog) */
  compact?: boolean
}

export default function VoiceWriteButton({
  tab,
  onSuccess,
  className,
  compact = false,
}: VoiceWriteButtonProps) {
  const t = useTranslations('feed.create_post')
  const [isRecording, setIsRecording] = useState(false)
  const [processing, setProcessing] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data)
      }
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const formData = new FormData()
        formData.append('audio', blob, 'voice.webm')
        formData.append('tab', tab)
        setProcessing(true)
        try {
          const res = await fetch('/api/ai/voice-write', {
            method: 'POST',
            body: formData,
          })
          const data = await res.json()
          if (!res.ok) {
            const msg = data.error || data.details || 'Voice write failed.'
            toast.error(msg)
            return
          }
          const title = typeof data.title === 'string' ? data.title : ''
          const content = typeof data.content === 'string' ? data.content : ''
          if (title || content) {
            onSuccess(title, content)
            toast.success('Title and content filled from voice.')
          } else {
            toast.error('No title or content returned.')
          }
        } catch {
          toast.error('Network error. Please try again.')
        } finally {
          setProcessing(false)
        }
      }
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone permission denied.'
          : 'Microphone unavailable.'
      toast.error(msg)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecording(false)
    }
  }

  const handleClick = () => {
    if (processing) return
    if (isRecording) stopRecording()
    else startRecording()
  }

  const label = t('writeByVoice')
  const statusLabel = isRecording ? t('recording') : processing ? t('refiningText') : label
  const showModal = isRecording || processing

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={processing}
        title={label}
        aria-label={statusLabel}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#8E86F5] bg-white px-4 py-2.5 text-sm font-medium text-[#8E86F5] transition-colors touch-manipulation',
          'hover:bg-[#F4F3FF] focus:outline-none focus:ring-2 focus:ring-[#8E86F5] focus:ring-offset-2',
          isRecording && 'animate-pulse border-red-400 bg-red-50 text-red-600 hover:bg-red-100',
          processing && 'cursor-wait border-gray-300 text-gray-500',
          compact && 'px-2.5 py-1.5 text-xs min-h-[36px]',
          !compact && 'min-h-[44px]',
          className
        )}
      >
        {processing ? (
          <Loader2 className={cn(compact ? 'h-4 w-4' : 'h-5 w-5', 'animate-spin')} aria-hidden />
        ) : (
          <Mic className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden />
        )}
        {!compact && <span>{label}</span>}
      </button>

      {/* Modal: Recording (Listening...) or Processing (Refining text...) */}
      {showModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" aria-hidden />
          <div
            className="fixed left-1/2 top-1/2 z-50 flex min-w-[240px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-4 rounded-xl bg-white p-8 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-live="polite"
            aria-label={isRecording ? t('listening') : t('refiningText')}
          >
            {isRecording ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 animate-pulse">
                  <Mic className="h-7 w-7" aria-hidden />
                </div>
                <p className="text-center text-base font-medium text-slate-700">
                  {t('listening')}
                </p>
                <p className="text-center text-sm text-slate-500">
                  {t('recording')}
                </p>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-[#8E86F5]" aria-hidden />
                <p className="text-center text-base font-medium text-slate-700">
                  {t('refiningText')}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
}
