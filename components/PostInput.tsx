'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PenLine, X, Pencil, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const BUCKET_POSTS = 'posts'

type PostTypeTab = 'log' | 'work'

interface PostInputProps {
  userId: string
  onPostCreated?: () => void
}

export default function PostInput({ userId, onPostCreated }: PostInputProps) {
  const [expanded, setExpanded] = useState(false)
  const [postType, setPostType] = useState<PostTypeTab>('log')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [editionCurrent, setEditionCurrent] = useState('')
  const [editionTotal, setEditionTotal] = useState('')
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

  const resetForm = () => {
    setTitle('')
    setContent('')
    setEditionCurrent('')
    setEditionTotal('')
    setImageFiles([])
  }

  const handleSubmit = async () => {
    const titleTrim = title.trim()
    const contentTrim = content.trim()
    if (!titleTrim && !contentTrim) return

    if (postType === 'work') {
      const et = editionTotal.trim()
      const editionTotalNum = et ? parseInt(et, 10) : NaN
      if (!et || Number.isNaN(editionTotalNum) || editionTotalNum < 1) {
        toast.error('Edition Total must be a number greater than 0.')
        return
      }
    }

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

      const isWork = postType === 'work'
      const ec = editionCurrent.trim()
      const et = editionTotal.trim()
      const edition_number =
        isWork && ec ? (parseInt(ec, 10) || null) : null
      const edition_total =
        isWork && et ? (parseInt(et, 10) || null) : null

      const payload: Record<string, unknown> = {
        user_id: userId,
        type: isWork ? 'sales' : 'work_log',
        title: titleTrim || 'Untitled',
        content: contentTrim || null,
        price: null,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls.length > 0 ? imageUrls : null,
        edition_number: isWork ? edition_number : null,
        edition_total: isWork ? edition_total : null,
      }

      const { error } = await supabase.from('posts').insert(payload)
      if (error) throw error
      toast.success('Post published.')
      resetForm()
      setExpanded(false)
      onPostCreated?.()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setPosting(false)
    }
  }

  const canSubmit =
    (title.trim() || content.trim()) &&
    (postType !== 'work' ||
      (editionTotal.trim() &&
        !Number.isNaN(parseInt(editionTotal.trim(), 10)) &&
        parseInt(editionTotal.trim(), 10) > 0))

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
          Share a studio log or work for sale.
        </button>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Tab Switcher: Studio Log | Work For Sale */}
          <div className="flex p-1 bg-gray-100/80 rounded-lg">
            <button
              type="button"
              onClick={() => setPostType('log')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                postType === 'log'
                  ? 'bg-white text-[#2F5D50] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Pencil className="h-4 w-4" />
              Studio Log
            </button>
            <button
              type="button"
              onClick={() => setPostType('work')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors',
                postType === 'work'
                  ? 'bg-white text-[#2F5D50] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <Tag className="h-4 w-4" />
              Work For Sale
            </button>
          </div>

          {/* Common: Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none text-slate-900"
          />
          {/* Common: Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none resize-none text-slate-900"
          />

          {/* Work For Sale only: Edition */}
          {postType === 'work' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 shrink-0">Edition</span>
              <input
                type="number"
                min={1}
                value={editionCurrent}
                onChange={(e) => setEditionCurrent(e.target.value)}
                placeholder="1"
                className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 text-center focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-gray-400">/</span>
              <input
                type="number"
                min={1}
                value={editionTotal}
                onChange={(e) => setEditionTotal(e.target.value)}
                placeholder="5"
                className="w-16 px-2 py-2 border border-gray-200 rounded-lg text-sm text-slate-900 text-center focus:ring-2 focus:ring-[#8E86F5] focus:border-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-xs text-gray-500">(Edition Total &gt; 0)</span>
            </div>
          )}

          {/* Common: Image upload */}
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
            className="inline-block px-3 py-1.5 text-sm text-[#8E86F5] hover:bg-[#8E86F5]/10 rounded-md cursor-pointer border border-[#8E86F5]/30"
          >
            Add images (multiple)
          </label>
          {previewUrls.length > 0 && (
            <div className="overflow-x-auto overflow-y-hidden">
              <div className="flex gap-2 pb-1 min-w-0" style={{ scrollbarWidth: 'thin' }}>
                {previewUrls.map((url, i) => (
                  <div
                    key={url}
                    className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={url}
                      alt={`Preview ${i + 1}`}
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

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setExpanded(false)
                resetForm()
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={posting || !canSubmit}
              className="px-4 py-2 text-sm text-white rounded-md hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#8E86F5' }}
            >
              {posting ? 'Publishing...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
