'use client'

import { Shield, Settings, Heart } from 'lucide-react'

const PILLARS = [
  {
    icon: Shield,
    title: 'Verified Artists Only',
    description:
      "Only artists who pass PUMWI's rigorous internal screening can showcase their work. We maintain a high standard of quality and trust.",
    accent: '#8E86F5',
  },
  {
    icon: Settings,
    title: 'Artisan OS for Growth',
    description:
      "Automate inventory, marketing, CS, and operations. Our 'Artisan OS' handles the business side so you can focus entirely on your craft.",
    accent: '#2F5D50',
  },
  {
    icon: Heart,
    title: 'Value-Based Connection',
    description:
      "Through PUMWI's structured systems—such as Studio Logs—your artistic philosophy naturally permeates your work. This connects you with genuine consumers who recognize and cherish that true value.",
    accent: '#8E86F5',
  },
] as const

export default function ValuePropositionSection() {
  return (
    <section className="space-y-8 lg:space-y-10">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight lg:text-2xl">
          Why PUMWI
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          A platform built for serious artisans and conscious buyers.
        </p>
      </div>
      <ul className="space-y-6 lg:space-y-8">
        {PILLARS.map(({ icon: Icon, title, description, accent }) => (
          <li key={title} className="flex gap-4">
            <div
              className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent}18`, color: accent }}
              aria-hidden
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <h3
                className="text-sm font-semibold"
                style={{ color: accent }}
              >
                {title}
              </h3>
              <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                {description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
