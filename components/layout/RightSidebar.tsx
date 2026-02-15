'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { Link } from '@/i18n/navigation'
import ExhibitionWidget from '@/components/ExhibitionWidget'
import ArtistList from '@/components/ArtistList'
import { Plus } from 'lucide-react'
import { isExhibitionAdminEmail } from '@/lib/exhibition-admin'

export default function RightSidebar() {
  const { user } = useAuth()
  const isAdmin = isExhibitionAdminEmail(user?.email)

  return (
    <div className="hidden xl:block sticky top-24 h-fit space-y-10">
      {isAdmin && (
        <div className="mb-2">
          <Link
            href="/?create=pumwi_exhibition"
            className="inline-flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: '#2F5D50' }}
          >
            <Plus className="h-4 w-4" />
            New Exhibition
          </Link>
        </div>
      )}
      <ExhibitionWidget />
      <ArtistList />
    </div>
  )
}
