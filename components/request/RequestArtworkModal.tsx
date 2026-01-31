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
  const supabase = createClient()

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    previewUrls.forEach((url) => URL.revokeObjectURL(url))
    setImageFiles(list)
    setPreviewUrls(list.map((f) => URL.createObjectURL(f)))
  }

  const handleSubmit = async () => {
    const trimmed = details.trim()
    if (!trimmed) {
      toast.error('내용을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      let image_urls: string[] = []
      if (imageFiles.length > 0) {
        const uploads = imageFiles.map(async (file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${requesterId}/request-${Date.now()}-${i}.${ext}`
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
      toast.success('작품 요청이 전송되었습니다.')
      setDetails('')
      setImageFiles([])
      previewUrls.forEach((url) => URL.revokeObjectURL(url))
      setPreviewUrls([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      onClose()
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '전송에 실패했습니다.')
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
    <Dialog open={open} onClose={handleClose} title="작품 요청">
      <div className="p-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">내용</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="원하는 작품이나 스타일을 설명해 주세요."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-slate-900 resize-none focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">참고 이미지 (선택, 여러 장 가능)</label>
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
            이미지 선택 (다중)
          </Button>
          {previewUrls.length > 0 && (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
              {previewUrls.map((url, i) => (
                <div key={url} className="relative flex-shrink-0 snap-center">
                  <img
                    src={url}
                    alt={`미리보기 ${i + 1}`}
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
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !details.trim()}
            className="flex-1 bg-[#8E86F5] hover:opacity-90"
          >
            {submitting ? '전송 중...' : '요청 보내기'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
