import type { Itinerary, ItineraryReview, GenerateRequest, DayPlan, BudgetBreakdown } from '@/lib/types'

describe('types', () => {
  it('Itinerary has required fields', () => {
    const itinerary: Itinerary = {
      id: 'uuid',
      user_id: 'uuid',
      destination: '京都',
      start_date: '2025-06-15',
      days: 5,
      budget: 8000,
      content: {
        summary: '',
        days: [],
        budget_breakdown: { transport: 0, accommodation: 0, food: 0, tickets: 0, misc: 0 },
        tips: [],
        xhs_queries: [],
      },
      youtube_videos: [],
      created_at: '2025-05-08T00:00:00Z',
    }
    expect(itinerary.destination).toBe('京都')
  })

  it('GenerateRequest has required fields', () => {
    const req: GenerateRequest = {
      destination: '京都',
      start_date: '2025-06-15',
      days: 5,
      budget: 8000,
    }
    expect(req.days).toBe(5)
  })
})
