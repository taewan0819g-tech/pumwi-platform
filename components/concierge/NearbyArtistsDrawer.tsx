'use client'

import { useState, useCallback, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistKm(km: number): string {
  if (km < 1) return `${(km * 1000).toFixed(0)} m`
  return `${km.toFixed(1)} km`
}

export interface ArtistWithLocation {
  id: string
  name: string
  title: string
  studio: string
  img?: string | null
  lat: number
  lng: number
}

const MOCK_ARTISTS_WITH_LOCATION: ArtistWithLocation[] = [
  {
    id: '1',
    name: '이백연',
    title: '도예가',
    studio: '고요 아틀리에',
    img: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?q=80&w=200&auto=format&fit=crop',
    lat: 37.8813,
    lng: 127.7298,
  },
  {
    id: '2',
    name: '김정후',
    title: '조향사',
    studio: '센트 스튜디오',
    img: 'https://images.unsplash.com/photo-1610701596087-0b1aeb0bc43d?q=80&w=200&auto=format&fit=crop',
    lat: 37.875,
    lng: 127.735,
  },
  {
    id: '3',
    name: '박서아',
    title: '금속공예가',
    studio: '아르떼 메탈',
    img: 'https://images.unsplash.com/photo-1603512392746-6017f8588bd6?q=80&w=200&auto=format&fit=crop',
    lat: 37.89,
    lng: 127.71,
  },
  {
    id: '4',
    name: '최은우',
    title: '가죽장인',
    studio: '레더 랩',
    img: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?q=80&w=200&auto=format&fit=crop',
    lat: 37.86,
    lng: 127.74,
  },
]

type SortedArtist = ArtistWithLocation & { distanceKm: number }

interface NearbyArtistsDrawerProps {
  open: boolean
  onClose: () => void
}

export function NearbyArtistsDrawer({ open, onClose }: NearbyArtistsDrawerProps) {
  const t = useTranslations('concierge')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationStatus, setLocationStatus] = useState<'idle' | 'getting' | 'ok' | 'denied'>('idle')
  const [sortedArtists, setSortedArtists] = useState<SortedArtist[]>([])

  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('denied')
      setUserLocation(null)
      return
    }
    setLocationStatus('getting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(coords)
        setLocationStatus('ok')
      },
      () => {
        setLocationStatus('denied')
        setUserLocation(null)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  useEffect(() => {
    if (open && locationStatus === 'idle') fetchLocation()
  }, [open, locationStatus, fetchLocation])

  useEffect(() => {
    if (!userLocation || !open) {
      setSortedArtists([])
      return
    }
    const withDist = MOCK_ARTISTS_WITH_LOCATION.map((a) => ({
      ...a,
      distanceKm: haversineKm(userLocation.lat, userLocation.lng, a.lat, a.lng),
    }))
    withDist.sort((a, b) => a.distanceKm - b.distanceKm)
    setSortedArtists(withDist)
  }, [userLocation, open])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nearby-drawer-title"
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-100">
          <h2 id="nearby-drawer-title" className="text-lg font-semibold text-gray-900">
            {t('nearby_drawer_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <span aria-hidden>×</span>
          </button>
        </div>

        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <button
            type="button"
            onClick={fetchLocation}
            disabled={locationStatus === 'getting'}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 disabled:opacity-60"
          >
            <span aria-hidden>{locationStatus === 'getting' ? '…' : '🔄'}</span>
            {t('nearby_refresh_btn')}
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {locationStatus === 'getting' && (
            <p className="text-sm text-gray-500 py-8 text-center">{t('nearby_getting_location')}</p>
          )}
          {locationStatus === 'denied' && (
            <p className="text-sm text-gray-500 py-8 text-center">{t('nearby_denied')}</p>
          )}
          {locationStatus === 'ok' && sortedArtists.length > 0 && (
            <ul className="space-y-2">
              {sortedArtists.map((artist) => (
                <li key={artist.id}>
                  <Link
                    href={`/artist/${artist.id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-white hover:border-[#8E86F5]/30 hover:bg-gray-50/80 transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-100">
                      {artist.img ? (
                        <img
                          src={artist.img}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
                          ✦
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{artist.name}</p>
                      <p className="text-xs text-gray-500 truncate">{artist.title} · {artist.studio}</p>
                    </div>
                    <span className="flex-shrink-0 text-sm font-medium text-[#8E86F5]">
                      {formatDistKm(artist.distanceKm)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {locationStatus === 'ok' && sortedArtists.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">{t('nearby_no_artists')}</p>
          )}
        </div>
      </aside>
    </>
  )
}
