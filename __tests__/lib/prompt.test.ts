import { buildSystemPrompt, buildUserPrompt } from '@/lib/prompt'
import type { GenerateRequest, ItineraryReview } from '@/lib/types'

const baseRequest: GenerateRequest = {
  departure_city: '上海',
  destination: '京都',
  start_date: '2025-06-15',
  days: 5,
  budget: 8000,
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
})
