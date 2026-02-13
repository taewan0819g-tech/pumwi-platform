import { Lora } from 'next/font/google'

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
})

const brand = '#2F5D50'

export const metadata = {
  title: 'About — PUMWI',
  description:
    'Where Art Meets Value. PUMWI is a sanctuary for genuine craftsmanship—bridging artisans and collectors.',
}

export default function AboutPage() {
  return (
    <article>
      {/* Section 1: Hero */}
      <header className="mb-12 pt-4">
        <h1
          className={`${lora.className} text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-[#1a1a1a] leading-tight`}
        >
          Where Art Meets Value
        </h1>
        <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
          PUMWI is not just a marketplace. It is a sanctuary for genuine craftsmanship.
        </p>
      </header>

      {/* Mission */}
      <section className="mb-16">
        <p className="text-base text-gray-700 leading-relaxed">
          We bridge the gap between artisans who pour their soul into creation and
          collectors who recognize true value. By automating the business
          side—inventory, marketing, and CS—we let artists focus on what they do
          best: Creating.
        </p>
      </section>

      {/* Section 2: Philosophy — 3 columns */}
      <section>
        <h2
          className={`${lora.className} text-2xl sm:text-3xl font-medium tracking-tight mb-10`}
          style={{ color: brand }}
        >
          Core Values
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
          <div className="space-y-3">
            <h3
              className={`${lora.className} text-lg font-semibold`}
              style={{ color: brand }}
            >
              Verified Artists
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Quality over quantity. We strictly vet every artist to ensure only
              genuine craftsmanship enters our ecosystem.
            </p>
          </div>
          <div className="space-y-3">
            <h3
              className={`${lora.className} text-lg font-semibold`}
              style={{ color: brand }}
            >
              The Artisan OS
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              A complete operating system for artists, managing everything from
              stock to sales.
            </p>
          </div>
          <div className="space-y-3">
            <h3
              className={`${lora.className} text-lg font-semibold`}
              style={{ color: brand }}
            >
              Studio Log
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              We believe the story is part of the art. Through Studio Logs, value
              is archived and shared.
            </p>
          </div>
        </div>
      </section>
    </article>
  )
}
