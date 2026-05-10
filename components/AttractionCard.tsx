'use client'
import type { Attraction } from '@/lib/types'

interface AttractionCardProps {
  attraction: Attraction
  selected: boolean
  onToggle: () => void
}

export default function AttractionCard({ attraction, selected, onToggle }: AttractionCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      data-selected={selected}
      className={`relative flex gap-3 text-left rounded-xl p-3 border-2 transition-all ${
        selected
          ? 'border-indigo-500 bg-indigo-50'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div
        className="w-14 h-14 rounded-lg flex-shrink-0 flex items-center justify-center text-2xl"
        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
      >
        {attraction.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800">{attraction.name}</div>
        <div className="text-xs text-slate-400 mb-1">{attraction.name_en}</div>
        <div className="text-xs text-slate-600 leading-relaxed line-clamp-2">{attraction.description}</div>
      </div>
      <div
        className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
          selected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white text-transparent'
        }`}
      >
        ✓
      </div>
    </button>
  )
}
