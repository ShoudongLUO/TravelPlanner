import Link from 'next/link'

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-500',
  'from-pink-500 to-rose-500',
  'from-amber-500 to-orange-500',
]

interface Props {
  itinerary: {
    id: string
    destination: string
    start_date: string
    days: number
    budget: number
    created_at: string
    itinerary_reviews: { id: string }[]
  }
  index: number
}

export default function ItineraryCard({ itinerary, index }: Props) {
  const gradient = GRADIENTS[index % GRADIENTS.length]
  const hasReview = itinerary.itinerary_reviews?.length > 0
  const tripEndDate = new Date(itinerary.start_date)
  tripEndDate.setDate(tripEndDate.getDate() + itinerary.days)
  const tripEnded = new Date() > tripEndDate

  return (
    <Link href={`/itineraries/${itinerary.id}`}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer">
      <div className={`bg-gradient-to-br ${gradient} p-4 text-white`}>
        <p className="font-bold text-base">🗺️ {itinerary.destination}</p>
        <p className="text-xs opacity-85 mt-1">{itinerary.days}天 · {itinerary.start_date} 出发</p>
      </div>
      <div className="p-3 flex justify-between items-center">
        <span className="text-xs text-slate-400">{new Date(itinerary.created_at).toLocaleDateString('zh-CN')}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-indigo-500">¥{itinerary.budget.toLocaleString()}</span>
          {hasReview && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">已反馈</span>}
          {!hasReview && tripEnded && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">待反馈</span>}
        </div>
      </div>
    </Link>
  )
}
