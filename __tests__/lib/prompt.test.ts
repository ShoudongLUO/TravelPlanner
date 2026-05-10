import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompt'
import type { GenerateRequest, ItineraryReview } from '@/lib/types'

const baseRequest: GenerateRequest = {
  departure_city: '上海',
  destination: '京都',
  start_date: '2025-06-15',
  days: 5,
  budget: 8000,
  preferred_attractions: [],
}

describe('buildUserPrompt', () => {
  it('includes destination and budget', () => {
    const prompt = buildUserPrompt(baseRequest)
    expect(prompt).toContain('京都')
    expect(prompt).toContain('8000')
    expect(prompt).toContain('5')
  })

  it('includes departure_city', () => {
    const prompt = buildUserPrompt(baseRequest)
    expect(prompt).toContain('上海')
    expect(prompt).toContain('京都')
    expect(prompt).toContain('8000')
  })

  it('does not mention preferred attractions when list is empty', () => {
    const prompt = buildUserPrompt({ ...baseRequest, preferred_attractions: [] })
    expect(prompt).not.toContain('特别想去')
  })

  it('injects preferred attractions when provided', () => {
    const prompt = buildUserPrompt({
      ...baseRequest,
      preferred_attractions: ['卢浮宫', '凡尔赛宫'],
    })
    expect(prompt).toContain('特别想去')
    expect(prompt).toContain('卢浮宫')
    expect(prompt).toContain('凡尔赛宫')
  })
})

describe('buildSystemPrompt', () => {
  it('returns base prompt when no reviews', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('旅游攻略')
    expect(prompt).not.toContain('历史反馈')
  })

  it('injects feedback when reviews provided', () => {
    const reviews: ItineraryReview[] = [{
      id: '1',
      itinerary_id: '2',
      user_id: '3',
      rating: 4,
      actual_budget: 9200,
      highlights: '伏见稻荷早上6点前人很少',
      improvements: 'Day 3 行程太赶',
      visited_at: '2025-06-20',
      created_at: '2025-06-25T00:00:00Z',
    }]
    const prompt = buildSystemPrompt(reviews)
    expect(prompt).toContain('历史反馈')
    expect(prompt).toContain('伏见稻荷早上6点前人很少')
    expect(prompt).toContain('Day 3 行程太赶')
  })

  it('system prompt describes new DayPlan JSON schema with timeline and restaurants', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('attractions')
    expect(prompt).toContain('timeline')
    expect(prompt).toContain('lunch')
    expect(prompt).toContain('dinner')
    expect(prompt).toContain('daily_budget')
    expect(prompt).not.toContain('"activities"')
  })

  it('system prompt requires name_en in timeline items', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('name_en')
  })

  it('system prompt includes local_transport and accommodations', () => {
    const prompt = buildSystemPrompt([])
    expect(prompt).toContain('local_transport')
    expect(prompt).toContain('accommodations')
  })
})
