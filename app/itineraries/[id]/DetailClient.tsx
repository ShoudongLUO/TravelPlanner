'use client'
import ItineraryDetail from '@/components/ItineraryDetail'
import VisitedToggle from '@/components/VisitedToggle'
import type { Itinerary, ItineraryReview } from '@/lib/types'

interface Props {
  itinerary: Itinerary & { itinerary_reviews: ItineraryReview[] }
}

export default function DetailClient({ itinerary }: Props) {
  return (
    <>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 flex justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-extrabold">🗺️ {itinerary.destination} · {itinerary.days}天</h1>
          <p className="text-sm opacity-85 mt-1">
            {itinerary.start_date} 出发 · 👥 {itinerary.travelers ?? 2}人 · 预算 ¥{itinerary.budget.toLocaleString()}
          </p>
        </div>
        <VisitedToggle itineraryId={itinerary.id} initialVisited={itinerary.visited ?? false} />
      </div>
      <div className="bg-white rounded-b-xl shadow">
        <ItineraryDetail itinerary={itinerary} />
      </div>
    </>
  )
}
