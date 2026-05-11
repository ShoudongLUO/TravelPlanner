'use client'
import { useState } from 'react'
import ItineraryDetail from '@/components/ItineraryDetail'
import ReviewModal from '@/components/ReviewModal'
import type { Itinerary, ItineraryReview } from '@/lib/types'

interface Props {
  itinerary: Itinerary & { itinerary_reviews: ItineraryReview[] }
}

export default function DetailClient({ itinerary }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [review, setReview] = useState(itinerary.itinerary_reviews?.[0])

  const tripEndDate = new Date(itinerary.start_date)
  tripEndDate.setDate(tripEndDate.getDate() + itinerary.days)
  const tripEnded = new Date() > tripEndDate

  return (
    <>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-extrabold">🗺️ {itinerary.destination} · {itinerary.days}天</h1>
          <p className="text-sm opacity-85 mt-1">{itinerary.start_date} 出发 · 👥 {itinerary.travelers ?? 2}人 · 预算 ¥{itinerary.budget.toLocaleString()}</p>
        </div>
        {tripEnded && (
          <button onClick={() => setShowModal(true)}
            className="bg-white/20 text-white border border-white/40 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/30">
            {review ? '修改反馈' : '✍️ 写反馈'}
          </button>
        )}
      </div>
      <div className="bg-white rounded-b-xl shadow">
        <ItineraryDetail itinerary={{ ...itinerary, itinerary_reviews: review ? [review] : [] }} />
      </div>
      {showModal && (
        <ReviewModal
          itineraryId={itinerary.id}
          existingReview={review}
          onClose={() => setShowModal(false)}
          onSaved={() => window.location.reload()}
        />
      )}
    </>
  )
}
