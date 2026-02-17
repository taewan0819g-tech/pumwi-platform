'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Loader2, AlertCircle, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'

interface ArtistProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  city: string | null
  country: string | null
  lat: number | null
  lng: number | null
}

const INITIAL_DISPLAY = 5

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/** Format distance for display (소수점 첫째 자리까지) */
function formatDistanceKm(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${Number(km.toFixed(1))} km`
}

type LocationStatus = 'idle' | 'loading' | 'success' | 'no_address' | 'error'

interface UserPosition {
  lat: number
  lng: number
}

interface NearbyArtistsProps {
  /** Logged-in user id; used as origin and excluded from the list */
  currentUserId?: string | null
}

interface DisplayArtist extends ArtistProfile {
  locationLabel: string
  distanceKm: number | null
  isNear: boolean
}

export default function NearbyArtists({ currentUserId = null }: NearbyArtistsProps) {
  const t = useTranslations('nearbyArtists')
  const [status, setStatus] = useState<LocationStatus>('loading')
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [artistsAll, setArtistsAll] = useState<ArtistProfile[]>([])
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const NEAR_KM = 30

  const artistsFiltered = useMemo(() => {
    if (!currentUserId) return artistsAll
    return artistsAll.filter((a) => a.id !== currentUserId)
  }, [artistsAll, currentUserId])

  const sortedDisplayArtists = useMemo((): DisplayArtist[] => {
    if (artistsFiltered.length === 0) return []
    const pos = userPosition
    const withMeta: DisplayArtist[] = artistsFiltered.map((a) => {
      const locationLabel = [a.city, a.country].filter(Boolean).join(', ') || '—'
      let distanceKm: number | null = null
      if (pos && a.lat != null && a.lng != null) {
        distanceKm = haversineKm(pos.lat, pos.lng, a.lat, a.lng)
      }
      return {
        ...a,
        locationLabel,
        distanceKm,
        isNear: distanceKm !== null && distanceKm <= NEAR_KM,
      }
    })
    return withMeta.sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0
      if (a.distanceKm == null) return 1
      if (b.distanceKm == null) return -1
      return a.distanceKm - b.distanceKm
    })
  }, [artistsFiltered, userPosition])

  const isFallbackList = userPosition === null && sortedDisplayArtists.length > 0
  const displayList = sortedDisplayArtists.slice(0, INITIAL_DISPLAY)
  const hasMore = sortedDisplayArtists.length > INITIAL_DISPLAY

  useEffect(() => {
    const fetchArtists = async () => {
      setArtistsLoading(true)
      const client = createClient()
      const { data, error } = await client
        .from('profiles')
        .select('id, full_name, avatar_url, city, country, lat, lng')
        .eq('role', 'artist')
      if (error) {
        console.error('[NearbyArtists]', error)
        setArtistsAll([])
      } else {
        setArtistsAll((data as ArtistProfile[]) ?? [])
      }
      setArtistsLoading(false)
    }
    fetchArtists()
  }, [])

  useEffect(() => {
    if (!currentUserId) {
      setUserPosition(null)
      setStatus('idle')
      return
    }
    setStatus('loading')
    setUserPosition(null)
    const client = createClient()
    client
      .from('profiles')
      .select('lat, lng')
      .eq('id', currentUserId)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('[NearbyArtists] profile', error)
          setStatus('error')
          return
        }
        const row = data as { lat: number | null; lng: number | null } | null
        if (row?.lat != null && row?.lng != null) {
          setUserPosition({ lat: row.lat, lng: row.lng })
          setStatus('success')
        } else {
          setStatus('no_address')
        }
      })
  }, [currentUserId])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false)
    }
    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isModalOpen])

  const renderArtistRow = (artist: DisplayArtist, spacious = false) => {
    const name = artist.full_name?.trim() || 'Artist'
    const distanceText =
      artist.distanceKm != null
        ? `📍 ${formatDistanceKm(artist.distanceKm)}`
        : `📍 ${t('noLocation')}`
    return (
      <li
        key={artist.id}
        className={`flex items-center gap-3 rounded-lg transition-colors hover:bg-gray-50 ${spacious ? 'gap-4 p-3' : 'p-2'} ${artist.isNear ? 'border-l-2 border-[#8E86F5] bg-[#F4F3FF]/30' : ''}`}
      >
        <Link href={`/profile/${artist.id}`} className="flex min-w-0 flex-1 items-center gap-3 no-underline">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[#F4F3FF]">
            {artist.avatar_url ? (
              <Image
                src={artist.avatar_url}
                alt=""
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#8E86F5]"
                aria-hidden
              >
                {name.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{name}</p>
            <p className="truncate text-xs text-gray-500">{artist.locationLabel}</p>
          </div>
        </Link>
        <span className="flex flex-shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap">
          {artist.isNear ? (
            <>
              <span className="rounded bg-[#8E86F5]/15 px-1.5 py-0.5 text-[#8E86F5]">{t('nearYou')}</span>
              <span className="text-[#8E86F5]">{distanceText}</span>
            </>
          ) : (
            <span className="text-[#8E86F5]">{distanceText}</span>
          )}
        </span>
      </li>
    )
  }

  const SkeletonRow = () => (
    <div className="flex items-center gap-3 rounded-lg p-2">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-200 animate-pulse" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-3.5 w-20 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="h-3 w-14 rounded bg-gray-100 animate-pulse" />
    </div>
  )

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <MapPin className="h-4 w-4 shrink-0 text-[#8E86F5]" aria-hidden />
            <span>{t('title')}</span>
            <span className="hidden text-gray-400 font-normal sm:inline">({t('titleEn')})</span>
          </h3>
        </div>

        {status === 'loading' && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#8E86F5]" />
            <span className="ml-2 text-sm">{t('loading')}</span>
          </div>
        )}

        {status === 'no_address' && (
          <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-gray-600">{t('setAddressPrompt')}</p>
            <Link
              href="/profile"
              className="mt-3 text-xs font-medium text-[#8E86F5] hover:underline"
            >
              {t('setAddressCta')}
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{t('error')}</p>
          </div>
        )}

        {(status === 'success' || status === 'idle' || status === 'no_address') && artistsLoading && (
          <ul className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </ul>
        )}

        {(status === 'success' || status === 'idle' || status === 'no_address') && !artistsLoading && artistsFiltered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">{t('noArtists')}</p>
        )}

        {(status === 'success' || status === 'idle' || status === 'no_address') && !artistsLoading && sortedDisplayArtists.length > 0 && (
          <>
            {isFallbackList && (
              <p className="mb-2 text-xs text-gray-500">{t('allArtistsFallback')}</p>
            )}
            <ul className="space-y-3">
              {displayList.map((artist) => renderArtistRow(artist))}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="mt-3 w-full rounded-md py-2 text-center text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              >
                {t('seeMore')}
              </button>
            )}
          </>
        )}

      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nearby-artists-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50 cursor-default"
            onClick={() => setIsModalOpen(false)}
            aria-label="Close modal"
          />
          <div className="relative max-w-lg w-full bg-white rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between shrink-0 border-b border-gray-100 px-5 py-4">
              <h2 id="nearby-artists-modal-title" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <MapPin className="h-5 w-5 text-[#8E86F5]" aria-hidden />
                {t('modalTitle')}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
              {sortedDisplayArtists.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500">{t('noArtists')}</p>
              ) : (
                <ul className="space-y-1">
                  {sortedDisplayArtists.map((artist) => renderArtistRow(artist, true))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
