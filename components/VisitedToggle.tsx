'use client'
import { useState } from 'react'

interface VisitedToggleProps {
  itineraryId: string
  initialVisited: boolean
}

export default function VisitedToggle({ itineraryId, initialVisited }: VisitedToggleProps) {
  const [visited, setVisited] = useState(initialVisited)
  const [pending, setPending] = useState(false)

  const handleToggle = async () => {
    if (pending) return
    const next = !visited
    setVisited(next)
    setPending(true)
    try {
      const res = await fetch(`/api/itineraries/${itineraryId}/visited`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ visited: next }),
      })
      if (!res.ok) {
        setVisited(!next)
      }
    } catch {
      setVisited(!next)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
        visited
          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
          : 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
      }`}
    >
      {visited ? '✅ 已去过' : '⏳ 想去'}
    </button>
  )
}
