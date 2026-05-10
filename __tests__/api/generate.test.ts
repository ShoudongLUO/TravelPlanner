/**
 * @jest-environment node
 */
import { POST } from '@/app/api/generate/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/gemini', () => ({
  streamItinerary: jest.fn(async function* () {
    yield '{"summary":"test","days":[],"budget_breakdown":{"transport":1000,"accommodation":1000,"food":500,"tickets":300,"misc":200},"tips":["tip1"],"xhs_queries":["query1"]}'
  }),
  parseItineraryContent: jest.fn((raw: string) => JSON.parse(raw)),
}))

jest.mock('@/lib/youtube', () => ({
  searchYoutubeVideos: jest.fn().mockResolvedValue([
    { id: 'v1', title: '京都攻略', thumbnail: 'http://img.example.com/t.jpg', url: 'https://youtube.com/watch?v=v1' },
  ]),
}))

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn().mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}))

describe('POST /api/generate', () => {
  it('returns 400 for missing fields', async () => {
    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ destination: '京都' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when departure_city is missing', async () => {
    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ destination: '京都', start_date: '2025-06-15', days: 5, budget: 8000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns SSE stream for valid request', async () => {
    const req = new NextRequest('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({ departure_city: '上海', destination: '京都', start_date: '2025-06-15', days: 5, budget: 8000 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')
  })
})
