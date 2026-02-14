'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2 } from 'lucide-react'
import { deleteExhibition } from '@/app/(main)/pumwi-exhibition/[id]/actions'

interface ExhibitionAdminControlsProps {
  postId: string
}

export default function ExhibitionAdminControls({ postId }: ExhibitionAdminControlsProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this exhibition? This cannot be undone.')) return
    const result = await deleteExhibition(postId)
    if (result.error) {
      alert(result.error)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
      <Link
        href={`/pumwi-exhibition/${postId}/edit`}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <Pencil className="h-4 w-4" />
        Edit
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </button>
    </div>
  )
}
