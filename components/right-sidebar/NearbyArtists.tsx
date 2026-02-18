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

/** Format distance for display (소수점 첫째 자리까지). Safe when km is NaN or invalid. */
function formatDistanceKm(km: number): string {
  if (typeof km !== 'number' || isNaN(km) || km < 0) return '—'
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
  /** 'sidebar' = desktop right sidebar, 'drawer' = mobile More menu drawer (touch-optimized) */
  variant?: 'sidebar' | 'drawer'
  /** Override origin for distance (e.g. from address search); when set, used instead of profile position */
  searchOrigin?: { lat: number; lng: number } | null
}

interface DisplayArtist extends ArtistProfile {
  locationLabel: string
  distanceKm: number | null
  isNear: boolean
}

const NEARBY_ARTISTS_FALLBACKS: Record<string, string> = {
  title: 'Nearby Artists',
  titleEn: 'Nearby',
  nearYou: 'Near you',
  noLocation: 'No location',
  seeMore: 'See More',
  loading: 'Finding artists...',
  setAddressPrompt: 'Please set your location to see nearby artists.',
  setAddressCta: 'Go to Profile',
  error: 'Failed to load artists.',
  noArtists: 'No artists found nearby.',
  allArtistsFallback: 'Showing all artists (Location not set)',
  modalTitle: 'All Nearby Artists',
  searchPlaceholder: 'Enter address or city name',
  searchClear: 'Clear search',
  showLess: 'Show Less',
  permissionDenied: 'Allow location to see artists near you.',
  settings: 'Settings',
  useGps: 'Current location (GPS)',
  setManually: 'Set location manually',
  cityPlaceholder: 'City (e.g. New York, Paris)',
  apply: 'Apply',
  noArtistsInRegion: 'No artists in this region.',
  sameRegion: 'Same Region',
  locationLabel: 'Location',
}

export default function NearbyArtists({
  currentUserId = null,
  variant = 'sidebar',
  searchOrigin = null,
}: NearbyArtistsProps) {
  const t = useTranslations('nearbyArtists')
  const isDrawer = variant === 'drawer'

  const getSafeText = (key: string, fallbackText: string): string => {
    try {
      const text = t(key)
      if (!text || text === key || (typeof text === 'string' && text.includes('.'))) {
        return fallbackText
      }
      return text
    } catch {
      return fallbackText
    }
  }
  const [status, setStatus] = useState<LocationStatus>('loading')
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const [artistsAll, setArtistsAll] = useState<ArtistProfile[]>([])
  const [artistsLoading, setArtistsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const NEAR_KM = 30
  const effectivePosition = searchOrigin ?? userPosition

  const artistsFiltered = useMemo(() => {
    if (!currentUserId) return artistsAll
    return artistsAll.filter((a) => a.id !== currentUserId)
  }, [artistsAll, currentUserId])

  const sortedDisplayArtists = useMemo((): DisplayArtist[] => {
    if (artistsFiltered.length === 0) return []
    const pos = effectivePosition
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
  }, [artistsFiltered, effectivePosition])

  const isFallbackList = effectivePosition === null && sortedDisplayArtists.length > 0
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
        : `📍 ${getSafeText('noLocation', NEARBY_ARTISTS_FALLBACKS.noLocation)}`
    const avatarSize = isDrawer ? 'h-11 w-11' : 'h-10 w-10'
    const rowPadding = isDrawer ? 'min-h-[48px] py-3 px-2 gap-3' : spacious ? 'gap-4 p-3' : 'p-2'
    const nameClass = isDrawer ? 'text-[15px] font-medium' : 'text-sm font-medium'
    const metaClass = isDrawer ? 'text-xs' : 'text-xs'
    return (
      <li
        key={artist.id}
        className={`flex items-center rounded-lg transition-colors hover:bg-gray-50 ${rowPadding} ${artist.isNear ? 'border-l-2 border-[#8E86F5] bg-[#F4F3FF]/30' : ''}`}
      >
        <Link
          href={`/profile/${artist.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 no-underline touch-manipulation"
        >
          <div className={`relative flex-shrink-0 overflow-hidden rounded-full bg-[#F4F3FF] ${avatarSize}`}>
            {artist.avatar_url ? (
              <Image
                src={artist.avatar_url}
                alt=""
                fill
                className="object-cover"
                sizes={isDrawer ? '44px' : '40px'}
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
            <p className={`truncate text-gray-900 ${nameClass}`}>{name}</p>
            <p className={`truncate text-gray-500 ${metaClass}`}>{artist.locationLabel}</p>
          </div>
        </Link>
        <span className="flex flex-shrink-0 items-center gap-1 text-xs font-medium whitespace-nowrap">
          {artist.isNear ? (
            <>
              <span className="rounded bg-[#8E86F5]/15 px-1.5 py-0.5 text-[#8E86F5]">{getSafeText('nearYou', NEARBY_ARTISTS_FALLBACKS.nearYou)}</span>
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
    <div
      className={
        isDrawer
          ? 'flex items-center gap-3 rounded-lg py-3 px-2 min-h-[48px]'
          : 'flex items-center gap-3 rounded-lg p-2'
      }
    >
      <div
        className={`flex-shrink-0 rounded-full bg-gray-200 animate-pulse ${isDrawer ? 'h-11 w-11' : 'h-10 w-10'}`}
      />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-3.5 w-20 rounded bg-gray-200 animate-pulse" />
        <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
      </div>
      <div className="h-3 w-14 rounded bg-gray-100 animate-pulse flex-shrink-0" />
    </div>
  )

  return (
    <>
      <div
        className={
          isDrawer
            ? 'rounded-lg border border-gray-200 bg-white p-3 shadow-sm'
            : 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm'
        }
      >
        <div className={isDrawer ? 'mb-2 flex items-center gap-2' : 'mb-3 flex items-center gap-2'}>
          <h3
            className={
              isDrawer
                ? 'flex items-center gap-2 text-[13px] font-bold text-gray-900'
                : 'flex items-center gap-2 text-sm font-bold text-gray-900'
            }
          >
            <MapPin className="h-4 w-4 shrink-0 text-[#8E86F5]" aria-hidden />
            <span>{getSafeText('title', NEARBY_ARTISTS_FALLBACKS.title)}</span>
            {!isDrawer && (
              <span className="hidden text-gray-400 font-normal sm:inline">({getSafeText('titleEn', NEARBY_ARTISTS_FALLBACKS.titleEn)})</span>
            )}
          </h3>
        </div>

        {status === 'loading' && !searchOrigin && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#8E86F5]" />
            <span className="ml-2 text-sm">{getSafeText('loading', NEARBY_ARTISTS_FALLBACKS.loading)}</span>
          </div>
        )}

        {status === 'no_address' && !searchOrigin && (
          <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
            <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
            <p className="text-sm text-gray-600">{getSafeText('setAddressPrompt', NEARBY_ARTISTS_FALLBACKS.setAddressPrompt)}</p>
            <Link
              href="/profile"
              className="mt-3 text-xs font-medium text-[#8E86F5] hover:underline"
            >
              {getSafeText('setAddressCta', NEARBY_ARTISTS_FALLBACKS.setAddressCta)}
            </Link>
          </div>
        )}

        {status === 'error' && !searchOrigin && (
          <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
            <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">{getSafeText('error', NEARBY_ARTISTS_FALLBACKS.error)}</p>
          </div>
        )}

        {(effectivePosition != null || status === 'success' || status === 'idle' || status === 'no_address') &&
          artistsLoading && (
          <ul className={isDrawer ? 'space-y-2' : 'space-y-3'}>
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonRow key={i} />
            ))}
          </ul>
        )}

        {(effectivePosition != null || status === 'success' || status === 'idle' || status === 'no_address') &&
          !artistsLoading &&
          artistsFiltered.length === 0 && (
          <p className="py-6 text-center text-sm text-gray-500">{getSafeText('noArtists', NEARBY_ARTISTS_FALLBACKS.noArtists)}</p>
        )}

        {(effectivePosition != null || status === 'success' || status === 'idle' || status === 'no_address') &&
          !artistsLoading &&
          sortedDisplayArtists.length > 0 && (
          <>
            {isFallbackList && (
              <p className="mb-2 text-xs text-gray-500">{getSafeText('allArtistsFallback', NEARBY_ARTISTS_FALLBACKS.allArtistsFallback)}</p>
            )}
            <ul className={isDrawer ? 'space-y-2' : 'space-y-3'}>
              {displayList.map((artist) => renderArtistRow(artist))}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className={
                  isDrawer
                    ? 'mt-2 w-full rounded-md py-3 text-center text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 touch-manipulation min-h-[44px]'
                    : 'mt-3 w-full rounded-md py-2 text-center text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }
              >
                {getSafeText('seeMore', NEARBY_ARTISTS_FALLBACKS.seeMore)}
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
                {getSafeText('modalTitle', NEARBY_ARTISTS_FALLBACKS.modalTitle)}
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
                <p className="py-6 text-center text-sm text-gray-500">{getSafeText('noArtists', NEARBY_ARTISTS_FALLBACKS.noArtists)}</p>
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
