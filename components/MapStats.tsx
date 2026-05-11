'use client'
import type { Itinerary } from '@/lib/types'

interface MapStatsProps {
  itineraries: Itinerary[]
}

export default function MapStats({ itineraries }: MapStatsProps) {
  const countries = new Set(
    itineraries
      .map(i => i.destination_country)
      .filter((c): c is string => Boolean(c))
  ).size
  const cities = itineraries.length
  const visited = itineraries.filter(i => i.visited).length
  const planned = cities - visited

  const stats = [
    { icon: '🌍', value: countries, label: '个国家' },
    { icon: '🏙', value: cities, label: '个城市' },
    { icon: '✅', value: visited, label: '已去过' },
    { icon: '⏳', value: planned, label: '计划中' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map(s => (
        <div key={s.label} className="bg-white border-2 border-slate-100 rounded-xl p-4 text-center">
          <div className="text-2xl mb-1">{s.icon}</div>
          <div className="text-2xl font-extrabold text-indigo-600" role="definition">{s.value}</div>
          <div className="text-xs text-slate-500 mt-1">{s.label}</div>
        </div>
      ))}
    </div>
  )
}
