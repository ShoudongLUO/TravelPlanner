import type { Itinerary, ItineraryReview, GenerateRequest, DayPlan, BudgetBreakdown, Attraction, AccommodationArea, ItineraryContent, UserProfile } from '@/lib/types'

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
      travelers: 2,
      content: {
        summary: '',
        days: [],
        budget_breakdown: { transport: 0, local_transport: 0, accommodation: 0, food: 0, tickets: 0, misc: 0 },
        accommodations: [],
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
      travelers: 2,
      preferred_attractions: [],
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
      travelers: 2,
      preferred_attractions: [],
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
      travelers: 2,
      content: {
        summary: '',
        days: [],
        budget_breakdown: { transport: 0, local_transport: 0, accommodation: 0, food: 0, tickets: 0, misc: 0 },
        accommodations: [],
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
      timeline: [{ time: '09:00', name: '卢浮宫', name_en: 'Louvre Museum', description: '世界最大博物馆' }],
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
    expect(day.timeline[0].name_en).toBe('Louvre Museum')
    expect(day.lunch.name).toBe('Café Marly')
    expect(day.daily_budget).toBe(1800)
  })

  it('Attraction type has name, name_en, description, icon', () => {
    const a: Attraction = {
      name: '卢浮宫',
      name_en: 'Louvre Museum',
      description: '世界最大博物馆',
      icon: '🏛',
    }
    expect(a.name).toBe('卢浮宫')
    expect(a.icon).toBe('🏛')
  })

  it('GenerateRequest includes preferred_attractions', () => {
    const req: GenerateRequest = {
      departure_city: '上海',
      destination: '巴黎',
      start_date: '2025-06-15',
      days: 5,
      budget: 15000,
      travelers: 2,
      preferred_attractions: ['卢浮宫', '埃菲尔铁塔'],
    }
    expect(req.preferred_attractions).toHaveLength(2)
  })

  it('BudgetBreakdown includes local_transport', () => {
    const budget: BudgetBreakdown = {
      transport: 3000,
      local_transport: 500,
      accommodation: 2000,
      food: 1500,
      tickets: 800,
      misc: 200,
    }
    expect(budget.local_transport).toBe(500)
  })

  it('AccommodationArea has area, description, price_range, vibe', () => {
    const a: AccommodationArea = {
      area: '玛黑区',
      description: '步行 5 分钟到卢浮宫',
      price_range: '¥800-1500/晚',
      vibe: '文艺青年聚集',
    }
    expect(a.area).toBe('玛黑区')
  })

  it('ItineraryContent includes accommodations', () => {
    const content: ItineraryContent = {
      summary: '',
      days: [],
      budget_breakdown: { transport: 0, local_transport: 0, accommodation: 0, food: 0, tickets: 0, misc: 0 },
      accommodations: [{ area: '玛黑区', description: '...', price_range: '...', vibe: '...' }],
      tips: [],
      xhs_queries: [],
    }
    expect(content.accommodations).toHaveLength(1)
  })

  it('GenerateRequest and Itinerary include travelers field', () => {
    const req: GenerateRequest = {
      departure_city: '上海',
      destination: '京都',
      start_date: '2025-06-15',
      days: 5,
      budget: 8000,
      travelers: 4,
      preferred_attractions: [],
    }
    expect(req.travelers).toBe(4)
  })

  it('UserProfile has all required fields', () => {
    const profile: UserProfile = {
      user_id: 'user-1',
      travel_styles: ['文化深度', '美食爱好'],
      pace: '平衡',
      budget_style: '高端体验',
      created_at: '2025-05-08T00:00:00Z',
      updated_at: '2025-05-08T00:00:00Z',
    }
    expect(profile.travel_styles).toHaveLength(2)
    expect(profile.pace).toBe('平衡')
  })

  it('GenerateRequest user_profile is optional', () => {
    const req: GenerateRequest = {
      departure_city: '上海',
      destination: '京都',
      start_date: '2025-06-15',
      days: 5,
      budget: 8000,
      travelers: 2,
      preferred_attractions: [],
    }
    expect(req.user_profile).toBeUndefined()
  })
})
