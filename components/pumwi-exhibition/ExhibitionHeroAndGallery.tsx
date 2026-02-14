'use client'

import { useState } from 'react'

interface ExhibitionHeroAndGalleryProps {
  galleryUrls: string[]
}

export default function ExhibitionHeroAndGallery({
  galleryUrls,
}: ExhibitionHeroAndGalleryProps) {
  const initialMain = galleryUrls[0] ?? null
  const [mainImage, setMainImage] = useState(initialMain)

  return (
    <div className="space-y-3">
      {/* Hero image (state-driven) */}
      {mainImage && (
        <div className="aspect-video w-full max-h-[480px] bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
          <img
            src={mainImage}
            alt=""
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Thumbnail strip: click to update mainImage */}
      {galleryUrls.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Gallery thumbnails">
          {galleryUrls.map((url, i) => {
            const isSelected = url === mainImage
            return (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => setMainImage(url)}
                className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-900 ${
                  isSelected
                    ? 'border-gray-900 opacity-100 ring-2 ring-gray-900 ring-offset-1'
                    : 'border-gray-200 opacity-50 hover:opacity-80'
                }`}
                aria-pressed={isSelected}
                aria-label={`View image ${i + 1}`}
              >
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
