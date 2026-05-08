/**
 * @jest-environment node
 */
import { POST, PATCH } from '@/app/api/itineraries/[id]/review/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const validBody = {
  rating: 4,
  actual_budget: 9200,
  highlights: '伏见稻荷早上很美',
  improvements: '行程太赶',
  visited_at: '2025-06-20',
}

const mockReview = {
  id: 'review-1',
  itinerary_id: 'itin-1',
  user_id: 'user-1',
  ...validBody,
  created_at: '2025-07-01T00:00:00Z',
}

function makeMockSupabase() {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockReview, error: null }),
    }),
  }
}

describe('POST /api/itineraries/[id]/review', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/review', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid rating (out of range)', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/review', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, rating: 6 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 201 and review for valid request', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/review', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.review).toBeDefined()
  })
})

describe('PATCH /api/itineraries/[id]/review', () => {
  it('returns 401 when unauthenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/review', {
      method: 'PATCH',
      body: JSON.stringify({ rating: 5 }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid rating in PATCH', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/review', {
      method: 'PATCH',
      body: JSON.stringify({ rating: 0 }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative actual_budget in PATCH', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/review', {
      method: 'PATCH',
      body: JSON.stringify({ actual_budget: -100 }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(400)
  })
})
