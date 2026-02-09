'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog } from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

const BUCKET_POSTS = 'posts'

interface RequestArtworkModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 요청을 받을 아티스트 ID (artist_id) */
  artistId: string
  /** 요청을 보내는 사용자 ID (requester_id) */
  requesterId: string
}

export default function RequestArtworkModal({
  open,
  onClose,
  onSuccess,
  artistId,
  requesterId,
}: RequestArtworkModalProps) {
  const [details, setDetails] = useState('')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewUrlsRef = useRef<string[]>([])
  previewUrlsRef.current = previewUrls
  const supabase = createClient()

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setImageFiles((prev) => [...prev, ...list])
    setPreviewUrls((prev) => [...prev, ...list.map((f) => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const handleSubmit = async () => {
    const trimmed = details.trim()
    if (!trimmed) {
      toast.error('Please enter your message.')
      return
    }
    setSubmitting(true)
    try {
      let image_urls: string[] = []
      if (imageFiles.length > 0) {
        const timestamp = Date.now()
        const uploads = imageFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${requesterId}/request-${timestamp}-${i}.${ext}`
          const { data, error } = await supabase.storage
            .from(BUCKET_POSTS)
            .upload(path, file, { upsert: true })
          if (error) throw error
          const { data: urlData } = supabase.storage
            .from(BUCKET_POSTS)
            .getPublicUrl(data.path)
          return urlData.publicUrl
        })
        image_urls = await Promise.all(uploads)
      }
      const { error: insertError } = await supabase.from('artwork_requests').insert({
        requester_id: requesterId,
        artist_id: artistId,
        details: trimmed,
        image_urls,
      })
      if (insertError) {
        toast.error(insertError.message)
        setSubmitting(false)
        return
      }
      toast.success('Commission request sent.')
      setDetails('')
      setImageFiles([])
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setDetails('')
    setImageFiles([])
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setPreviewUrls([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    onClose()
  }

  const removePreview = (idx: number) => {
    URL.revokeObjectURL(previewUrls[idx])
    setImageFiles((prev) => prev.filter((_, i) => i !== idx))
    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog open={open} onClose={handleClose} title="Commission">
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Describe the work or style you have in mind."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Reference images (optional, multiple)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-600"
          >
            Select images (multiple)
          </Button>
          {previewUrls.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {previewUrls.map((url, i) => (
                <div key={i} className="relative flex-shrink-0 snap-center">
                  <img
                    src={url}
                    alt={`Preview ${i + 1}`}
                    className="h-24 w-auto rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePreview(i)}
                    className="absolute -top-1 -right-1 p-1 rounded-full bg-gray-800 text-white text-xs hover:bg-gray-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !details.trim()}
            className="flex-1 bg-[#8E86F5] hover:opacity-90"
          >
            {submitting ? 'Sending...' : 'Send request'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
