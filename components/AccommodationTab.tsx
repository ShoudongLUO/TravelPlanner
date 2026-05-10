'use client'
import type { AccommodationArea } from '@/lib/types'

interface AccommodationTabProps {
  accommodations: AccommodationArea[]
  destination: string
  start_date: string
  days: number
  accommodation_budget: number
}

function buildAirbnbUrl(area: string, destination: string, start_date: string, days: number): string {
  const checkout = new Date(start_date)
  checkout.setDate(checkout.getDate() + days)
  const checkoutStr = checkout.toISOString().slice(0, 10)
  const location = area ? `${area} ${destination}` : destination
  const params = new URLSearchParams({
    checkin: start_date,
    checkout: checkoutStr,
    adults: '2',
  })
  return `https://www.airbnb.com/s/${encodeURIComponent(location)}/homes?${params}`
}

export default function AccommodationTab({
  accommodations,
  destination,
  start_date,
  days,
  accommodation_budget,
}: AccommodationTabProps) {
  const perNight = days > 0 ? Math.round(accommodation_budget / days) : 0

  if (!accommodations || accommodations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-indigo-50 rounded-xl p-4 text-sm text-slate-700">
          💰 住宿预算 <strong className="text-indigo-600">¥{accommodation_budget.toLocaleString()}</strong>
          <span className="text-slate-400 ml-2">（天均 ¥{perNight.toLocaleString()}）</span>
        </div>
        <div className="text-center py-8 text-slate-500 text-sm">
          住宿区域推荐暂未生成，可直接搜索 Airbnb：
        </div>
        <a
          href={buildAirbnbUrl('', destination, start_date, days)}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold py-3 rounded-xl text-center hover:shadow-lg transition-all"
        >
          🏠 在 Airbnb 上搜索 {destination} 住宿
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 rounded-xl p-4 text-sm text-slate-700">
        住宿预算 <strong className="text-indigo-600">¥{accommodation_budget.toLocaleString()}</strong>
        <span className="text-slate-400 ml-2">（天均 ¥{perNight.toLocaleString()}）</span>
      </div>

      {accommodations.map((a, i) => (
        <div key={i} className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-base font-bold text-slate-800">{a.area}</h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
              {a.price_range}
            </span>
          </div>
          <div className="space-y-1.5 text-sm text-slate-600 mb-4">
            <div><span>📍 </span><span>{a.description}</span></div>
            <div><span>✨ </span><span>{a.vibe}</span></div>
          </div>
          <a
            href={buildAirbnbUrl(a.area, destination, start_date, days)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:shadow-md transition-all"
          >
            🏠 在 Airbnb 上搜索此区域
          </a>
        </div>
      ))}
    </div>
  )
}
