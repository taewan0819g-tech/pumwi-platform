'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import AddressMainAutocomplete from '@/components/profile/AddressMainAutocomplete'

interface ProfileEditProps {
  profileId: string
  initialAddressMain?: string | null
  initialAddressDetail?: string | null
  initialZipCode?: string | null
  initialIsAddressDetailPublic?: boolean | null
  onSuccess?: (data: {
    address_main: string | null
    address_detail: string | null
    zip_code: string | null
    is_address_detail_public: boolean
  }) => void
  onCancel?: () => void
}

export default function ProfileEdit({
  profileId,
  initialAddressMain = '',
  initialAddressDetail = '',
  initialZipCode = '',
  initialIsAddressDetailPublic = false,
  onSuccess,
  onCancel,
}: ProfileEditProps) {
  const t = useTranslations('apply')
  const [addressMain, setAddressMain] = useState(initialAddressMain ?? '')
  const [addressDetail, setAddressDetail] = useState(initialAddressDetail ?? '')
  const [zipCode, setZipCode] = useState(initialZipCode ?? '')
  const [isAddressDetailPublic, setIsAddressDetailPublic] = useState(Boolean(initialIsAddressDetailPublic))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const mainTrim = addressMain.trim() || null
    if (!mainTrim) {
      toast.error('Please enter or select a main address.')
      return
    }
    setSaving(true)
    const supabase = createClient()
    try {
      const payload = {
        address_main: mainTrim,
        address_detail: addressDetail.trim() || null,
        zip_code: zipCode.trim() || null,
        is_address_detail_public: isAddressDetailPublic,
      }
      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', profileId)
      if (error) throw error
      toast.success('Saved!')
      onSuccess?.({
        address_main: mainTrim,
        address_detail: addressDetail.trim() || null,
        zip_code: zipCode.trim() || null,
        is_address_detail_public: isAddressDetailPublic,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 rounded-xl border border-gray-200 bg-gray-50/50 w-full max-w-sm">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">기본 주소 (Google)</label>
        <AddressMainAutocomplete
          value={addressMain}
          onChange={(res) => {
            setAddressMain(res.address_main)
            setZipCode(res.zip)
          }}
          placeholder={t('city_placeholder')}
          label=""
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">상세 주소 (Apartment, Suite 등)</label>
        <input
          type="text"
          value={addressDetail}
          onChange={(e) => setAddressDetail(e.target.value)}
          placeholder="동, 호수, 건물명 등"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] outline-none bg-white"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">우편번호</label>
        <input
          type="text"
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          placeholder="배송비·픽업용"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-slate-900 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#8E86F5] outline-none bg-white"
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">상세 주소 프로필 공개</span>
        <button
          type="button"
          role="switch"
          aria-checked={isAddressDetailPublic}
          onClick={() => setIsAddressDetailPublic((v) => !v)}
          className={`relative inline-flex h-6 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#8E86F5] focus:ring-offset-1 ${isAddressDetailPublic ? 'bg-[#8E86F5]' : 'bg-gray-200'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${isAddressDetailPublic ? 'translate-x-4' : 'translate-x-1'}`}
          />
        </button>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="p-1.5 rounded-lg bg-[#8E86F5] text-white hover:opacity-90 disabled:opacity-50"
          aria-label="Save"
        >
          <Check className="h-4 w-4" />
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
