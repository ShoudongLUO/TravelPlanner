/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/itineraries/[id]/visited/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockUpdated = { id: 'itin-1', user_id: 'user-1', visited: true }

function makeAuthedSupabase(returned: unknown = mockUpdated) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: returned, error: null }),
    }),
  }
}

describe('PATCH /api/itineraries/[id]/visited', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/visited', {
      method: 'PATCH',
      body: JSON.stringify({ visited: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 400 when visited is not boolean', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeAuthedSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/visited', {
      method: 'PATCH',
      body: JSON.stringify({ visited: 'yes' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(400)
  })

  it('returns 200 with updated itinerary on success', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeAuthedSupabase())
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/visited', {
      method: 'PATCH',
      body: JSON.stringify({ visited: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.itinerary.visited).toBe(true)
  })

  it('returns 404 when itinerary not found', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    })
    const req = new NextRequest('http://localhost/api/itineraries/itin-1/visited', {
      method: 'PATCH',
      body: JSON.stringify({ visited: true }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'itin-1' }) })
    expect(res.status).toBe(404)
  })
})
