'use client'
import ItineraryDetail from '@/components/ItineraryDetail'
import ItineraryPrintView from '@/components/ItineraryPrintView'
import PrintControls from '@/components/PrintControls'
import VisitedToggle from '@/components/VisitedToggle'
import type { Itinerary, ItineraryReview } from '@/lib/types'

interface Props {
  itinerary: Itinerary & { itinerary_reviews: ItineraryReview[] }
}

export default function DetailClient({ itinerary }: Props) {
  return (
    <>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 flex justify-between items-center gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-extrabold">🗺️ {itinerary.destination} · {itinerary.days}天</h1>
          <p className="text-sm opacity-85 mt-1">
            {itinerary.start_date} 出发 · 👥 {itinerary.travelers ?? 2}人 · 预算 ¥{itinerary.budget.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <PrintControls />
          <VisitedToggle itineraryId={itinerary.id} initialVisited={itinerary.visited ?? false} />
        </div>
      </div>
      <div className="bg-white rounded-b-xl shadow print:hidden">
        <ItineraryDetail itinerary={itinerary} />
      </div>
      <ItineraryPrintView itinerary={itinerary} />
    </>
  )
}
