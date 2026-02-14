'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

const BUCKET_POSTS = 'posts'

type ExhibitionStatus = 'ongoing' | 'upcoming' | 'closed'

interface ExhibitionEditFormProps {
  postId: string
  initial: {
    title: string
    description: string
    location: string
    country: string
    start_date: string
    end_date: string
    exhibition_status: ExhibitionStatus
    external_link: string
    image_urls: string[]
  }
}

export default function ExhibitionEditForm({ postId, initial }: ExhibitionEditFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [description, setDescription] = useState(initial.description)
  const [location, setLocation] = useState(initial.location)
  const [country, setCountry] = useState(initial.country)
  const [startDate, setStartDate] = useState(initial.start_date)
  const [endDate, setEndDate] = useState(initial.end_date)
  const [exhibitionStatus, setExhibitionStatus] = useState<ExhibitionStatus>(initial.exhibition_status)
  const [externalLink, setExternalLink] = useState(initial.external_link)
  const [existingUrls, setExistingUrls] = useState<string[]>(initial.image_urls)
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)

  const removeExisting = (index: number) => {
    setExistingUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const handleNewFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setNewFiles((prev) => [...prev, ...Array.from(files).filter((f) => f.type.startsWith('image/'))].slice(0, 20))
    e.target.value = ''
  }

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !location.trim() || !country.trim()) {
      toast.error('Title, Location, and Country are required.')
      return
    }
    if (existingUrls.length === 0 && newFiles.length === 0) {
      toast.error('At least one image is required.')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      let allUrls = [...existingUrls]

      if (newFiles.length > 0) {
        const ts = Date.now()
        const uploads = newFiles.map((file, i) => {
          const ext = file.name.split('.').pop() || 'jpg'
          const path = `exhibition-${postId}-${ts}-${i}.${ext}`
          return supabase.storage
            .from(BUCKET_POSTS)
            .upload(path, file, { upsert: true })
            .then(({ data, error }) => {
              if (error) throw error
              const { data: urlData } = supabase.storage.from(BUCKET_POSTS).getPublicUrl(data!.path)
              return urlData.publicUrl
            })
        })
        const newUrls = await Promise.all(uploads)
        allUrls = [...existingUrls, ...newUrls]
      }

      const content = JSON.stringify({
        description: description.trim() || '',
        location: location.trim(),
        country: country.trim(),
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        exhibition_status: exhibitionStatus,
        external_link: externalLink.trim() || undefined,
      })

      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          content,
          image_url: allUrls[0] ?? null,
          image_urls: allUrls.length > 0 ? allUrls : null,
        })
        .eq('id', postId)
        .eq('type', 'pumwi_exhibition')

      if (error) throw error
      toast.success('Exhibition updated.')
      router.push(`/pumwi-exhibition/${postId}`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Exhibition Details (Description)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Write the detailed exhibition introduction, curator's note, etc. here..."
          rows={10}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] outline-none resize-y min-h-[200px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Paris"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. France"
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] outline-none"
            required
          />
        </div>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-2">Status Badge</span>
        <div className="flex flex-wrap gap-3">
          {[
            { value: 'ongoing' as const, label: '🔴 On-going' },
            { value: 'upcoming' as const, label: '🟡 Upcoming' },
            { value: 'closed' as const, label: '⚫ Closed' },
          ].map(({ value, label }) => (
            <label key={value} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="exhibition_status_edit"
                value={value}
                checked={exhibitionStatus === value}
                onChange={() => setExhibitionStatus(value)}
                className="text-[#2F5D50] focus:ring-[#2F5D50]"
              />
              <span className="text-sm text-slate-700">{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">External link (optional)</label>
        <input
          type="url"
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
          placeholder="https://..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#8E86F5] outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
        <p className="text-xs text-gray-500 mb-2">Existing images (click X to remove from list)</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {existingUrls.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeExisting(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <input type="file" accept="image/*" multiple onChange={handleNewFiles} className="text-sm" />
        {newFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {newFiles.map((f, i) => (
              <span key={i} className="text-xs text-gray-600">
                {f.name}
                <button type="button" onClick={() => removeNewFile(i)} className="ml-1 text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm text-white rounded-lg hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#8E86F5' }}
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/pumwi-exhibition/${postId}`)}
          className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
