/**
 * @jest-environment node
 */
import { GET } from '@/app/api/popular-attractions/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/gemini', () => ({
  generateAttractions: jest.fn(),
}))

import { generateAttractions } from '@/lib/gemini'

const mockAttractions = [
  { name: '卢浮宫', name_en: 'Louvre Museum', description: '世界最大博物馆', icon: '🏛' },
  { name: '埃菲尔铁塔', name_en: 'Eiffel Tower', description: '巴黎地标', icon: '🗼' },
]

describe('GET /api/popular-attractions', () => {
  it('returns 400 when destination is missing', async () => {
    const req = new NextRequest('http://localhost/api/popular-attractions')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns attractions from Gemini', async () => {
    ;(generateAttractions as jest.Mock).mockResolvedValue(mockAttractions)

    const req = new NextRequest('http://localhost/api/popular-attractions?destination=巴黎')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.attractions).toHaveLength(2)
    expect(body.attractions[0].name).toBe('卢浮宫')
  })

  it('returns empty array when Gemini throws', async () => {
    ;(generateAttractions as jest.Mock).mockRejectedValue(new Error('Gemini failed'))

    const req = new NextRequest('http://localhost/api/popular-attractions?destination=巴黎')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.attractions).toEqual([])
  })
})
