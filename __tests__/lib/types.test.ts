import type { Itinerary, ItineraryReview, GenerateRequest, DayPlan, BudgetBreakdown } from '@/lib/types'

describe('types', () => {
  it('Itinerary has required fields', () => {
    const itinerary: Itinerary = {
      id: 'uuid',
      user_id: 'uuid',
      departure_city: '上海',
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
      departure_city: '上海',
      destination: '京都',
      start_date: '2025-06-15',
      days: 5,
      budget: 8000,
    }
    expect(req.days).toBe(5)
  })

  it('GenerateRequest includes departure_city', () => {
    const req: GenerateRequest = {
      departure_city: '上海',
      destination: '京都',
      start_date: '2025-06-15',
      days: 5,
      budget: 8000,
    }
    expect(req.departure_city).toBe('上海')
  })

  it('Itinerary includes departure_city', () => {
    const it: Itinerary = {
      id: 'uuid',
      user_id: 'uuid',
      departure_city: '上海',
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
    expect(it.departure_city).toBe('上海')
  })

  it('DayPlan has timeline, lunch, dinner, attractions, daily_budget', () => {
    const day: DayPlan = {
      title: 'Day 1 · 抵达',
      attractions: ['卢浮宫', '塞纳河'],
      timeline: [{ time: '09:00', name: '卢浮宫', description: '世界最大博物馆' }],
      lunch: {
        name: 'Café Marly',
        location: '卢浮宫旁',
        reason: '位置便利',
        dishes: 'Croque Madame',
        price_range: '人均¥120',
      },
      dinner: {
        name: 'Au Pied de Cochon',
        location: 'Les Halles',
        reason: '法式经典',
        dishes: '洋葱汤',
        price_range: '人均¥200',
      },
      daily_budget: 1800,
    }
    expect(day.attractions).toHaveLength(2)
    expect(day.timeline[0].time).toBe('09:00')
    expect(day.lunch.name).toBe('Café Marly')
    expect(day.daily_budget).toBe(1800)
  })
})
