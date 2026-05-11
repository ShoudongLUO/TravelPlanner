/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/itineraries/route'
import { GET as GET_DETAIL, DELETE } from '@/app/api/itineraries/[id]/route'
import { NextRequest } from 'next/server'

const mockItinerary = {
  id: 'itin-1',
  user_id: 'user-1',
  departure_city: '上海',
  destination: '京都',
  start_date: '2025-06-15',
  days: 5,
  budget: 8000,
  travelers: 2,
  content: {},
  youtube_videos: [],
  created_at: '2025-05-08T00:00:00Z',
}

function makeMockSupabase(listData: unknown[] = [mockItinerary]) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: listData, error: null }),
      single: jest.fn().mockResolvedValue({ data: mockItinerary, error: null }),
    }),
  }
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

describe('GET /api/itineraries', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns itineraries for authenticated user', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.itineraries).toBeDefined()
  })
})

describe('POST /api/itineraries', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify({ departure_city: '上海', destination: '京都', start_date: '2025-06-15', days: 5, budget: 8000, travelers: 2, content: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 201 and saved itinerary for authenticated user', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries', {
      method: 'POST',
      body: JSON.stringify({ departure_city: '上海', destination: '京都', start_date: '2025-06-15', days: 5, budget: 8000, travelers: 2, content: {} }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
  })
})

describe('GET /api/itineraries/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1')
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns itinerary detail for authenticated user', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeMockSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1')
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.itinerary).toBeDefined()
  })
})

describe('DELETE /api/itineraries/[id]', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 204 on successful delete', async () => {
    const deleteChain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    }
    // Make the chain itself a thenable that resolves to { error: null }
    ;(deleteChain as any).then = (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: jest.fn().mockReturnValue(deleteChain),
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1', { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(204)
  })
})
