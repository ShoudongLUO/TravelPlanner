/**
 * @jest-environment node
 */
import { GET, PUT } from '@/app/api/profile/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

const mockProfile = {
  user_id: 'user-1',
  travel_styles: ['文化深度'],
  pace: '平衡',
  budget_style: '平衡型',
  created_at: '2025-05-08T00:00:00Z',
  updated_at: '2025-05-08T00:00:00Z',
}

function makeAuthedSupabase(returnedProfile: unknown = mockProfile) {
  return {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: returnedProfile, error: null }),
    }),
  }
}

describe('GET /api/profile', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/profile')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns 404 when profile does not exist', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
      }),
    })
    const req = new NextRequest('http://localhost/api/profile')
    const res = await GET(req)
    expect(res.status).toBe(404)
  })

  it('returns profile when exists', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeAuthedSupabase())
    const req = new NextRequest('http://localhost/api/profile')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile.travel_styles).toEqual(['文化深度'])
  })
})

describe('PUT /api/profile', () => {
  it('returns 401 when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    })
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ travel_styles: ['文化深度'], pace: '平衡', budget_style: '平衡型' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when travel_styles is empty', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeAuthedSupabase())
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ travel_styles: [], pace: '平衡', budget_style: '平衡型' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when pace is invalid', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeAuthedSupabase())
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ travel_styles: ['文化深度'], pace: '飞速', budget_style: '平衡型' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('upserts profile on valid input', async () => {
    ;(createClient as jest.Mock).mockResolvedValue(makeAuthedSupabase())
    const req = new NextRequest('http://localhost/api/profile', {
      method: 'PUT',
      body: JSON.stringify({ travel_styles: ['文化深度'], pace: '平衡', budget_style: '平衡型' }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.profile).toBeDefined()
  })
})
