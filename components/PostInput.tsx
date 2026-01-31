'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PenLine, X } from 'lucide-react'
import toast from 'react-hot-toast'

const BUCKET_POSTS = 'posts'

interface PostInputProps {
  userId: string
  onPostCreated?: () => void
}

export default function PostInput({ userId, onPostCreated }: PostInputProps) {
  const [expanded, setExpanded] = useState(false)
  const [value, setValue] = useState('')
  const [posting, setPosting] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])

  useEffect(() => {
    if (imageFiles.length === 0) {
      setPreviewUrls([])
      return
    }
    const urls = imageFiles.map((f) => URL.createObjectURL(f))
    setPreviewUrls(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [imageFiles])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'))
    setImageFiles((prev) => [...prev, ...list].slice(0, 10))
    e.target.value = ''
  }

  const removePreview = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!value.trim()) return
    setPosting(true)
    try {
      const supabase = createClient()
      let imageUrls: string[] = []
      if (imageFiles.length > 0) {
        const ts = Date.now()
        const uploads = imageFiles.map((file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `${userId}/post-${ts}-${i}.${ext}`
          return supabase.storage
            .from(BUCKET_POSTS)
            .upload(path, file, { upsert: true })
            .then(({ data, error }) => {
              if (error) throw error
              const { data: urlData } = supabase.storage
                .from(BUCKET_POSTS)
                .getPublicUrl(data!.path)
              return urlData.publicUrl
            })
        })
        imageUrls = await Promise.all(uploads)
      }
      const payload: Record<string, unknown> = {
        user_id: userId,
        type: 'work_log',
        title: value.slice(0, 50) || '무제',
        content: value.trim(),
        price: null,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
      }
      const { error } = await supabase.from('posts').insert(payload)
      if (error) throw error
      toast.success('게시물이 등록되었습니다.')
      setValue('')
      setImageFiles([])
      setExpanded(false)
      onPostCreated?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '등록 실패')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
          <PenLine className="h-5 w-5 text-gray-500" />
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex-1 text-left px-4 py-2.5 rounded-full border border-gray-200 bg-[#F3F2EF] hover:bg-gray-100 text-gray-500 text-sm transition-colors"
        >
          작업 일지나 판매 글을 올려보세요.
        </button>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="무슨 생각을 하고 계신가요?"
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none"
          />
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="post-input-images"
            onChange={handleFileChange}
          />
          <label
            htmlFor="post-input-images"
            className="mt-2 inline-block px-3 py-1.5 text-sm text-[#8E86F5] hover:bg-[#8E86F5]/10 rounded-md cursor-pointer border border-[#8E86F5]/30"
          >
            이미지 추가 (여러 장 선택 가능)
          </label>
          {previewUrls.length > 0 && (
            <div className="mt-3 overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 pb-1 min-w-0" style={{ scrollbarWidth: 'thin' }}>
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={url}
                      alt={`미리보기 ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePreview(i)}
                      className="absolute top-0.5 right-0.5 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                setValue('')
                setImageFiles([])
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={posting || !value.trim()}
              className="px-4 py-2 text-sm text-white rounded-md hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#8E86F5' }}
            >
              {posting ? '등록 중...' : '게시'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
