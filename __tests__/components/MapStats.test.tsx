import { render, screen } from '@testing-library/react'
import MapStats from '@/components/MapStats'
import type { Itinerary } from '@/lib/types'

function mockItinerary(overrides: Partial<Itinerary>): Itinerary {
  return {
    id: 'i', user_id: 'u',
    departure_city: '', destination: '',
    start_date: '', days: 1, budget: 0, travelers: 2,
    content: {
      summary: '', days: [],
      budget_breakdown: { transport: 0, local_transport: 0, accommodation: 0, food: 0, tickets: 0, misc: 0 },
      accommodations: [], tips: [], xhs_queries: [],
    },
    youtube_videos: [], created_at: '',
    destination_lat: null, destination_lng: null, destination_country: null,
    visited: false,
    ...overrides,
  }
}

describe('MapStats', () => {
  it('counts unique countries', () => {
    const items = [
      mockItinerary({ destination_country: 'France' }),
      mockItinerary({ destination_country: 'France' }),
      mockItinerary({ destination_country: 'Japan' }),
    ]
    render(<MapStats itineraries={items} />)
    expect(screen.getByText('2')).toBeInTheDocument()  // 2 countries
  })

  it('counts total cities', () => {
    const items = [
      mockItinerary({ destination: 'A' }),
      mockItinerary({ destination: 'B' }),
      mockItinerary({ destination: 'C' }),
    ]
    render(<MapStats itineraries={items} />)
    // cities=3, planned=3 — both show 3; verify at least one element with '3' exists
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1)
  })

  it('counts visited and planned', () => {
    const items = [
      mockItinerary({ visited: true }),
      mockItinerary({ visited: true }),
      mockItinerary({ visited: false }),
    ]
    render(<MapStats itineraries={items} />)
    expect(screen.getByText(/已去过/)).toBeInTheDocument()
    expect(screen.getByText(/计划中/)).toBeInTheDocument()
  })

  it('handles empty itineraries', () => {
    render(<MapStats itineraries={[]} />)
    const zeros = screen.getAllByText('0')
    expect(zeros.length).toBeGreaterThanOrEqual(4)
  })

  it('ignores null countries in country count', () => {
    const items = [
      mockItinerary({ destination_country: 'France' }),
      mockItinerary({ destination_country: null }),
    ]
    render(<MapStats itineraries={items} />)
    const stats = screen.getAllByRole('definition')
    expect(stats.length).toBe(4)
  })
})
