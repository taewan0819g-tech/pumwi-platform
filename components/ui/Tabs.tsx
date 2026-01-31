'use client'

import { cn } from '@/lib/utils'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: { value: string; label: string }[]
  className?: string
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div
      className={cn(
        'flex border-b border-gray-200 bg-white rounded-t-lg overflow-x-auto',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onValueChange(tab.value)}
          className={cn(
            'px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
            value === tab.value
              ? 'border-[#8E86F5] text-[#8E86F5]'
              : 'border-transparent text-gray-600 hover:text-slate-900 hover:border-gray-300'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
