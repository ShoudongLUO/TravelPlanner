/**
 * @jest-environment node
 */
import { GET } from '@/app/api/geocode/route'
import { NextRequest } from 'next/server'

const mockNominatimResponse = [
  {
    display_name: '上海市, 中国',
    address: { city: '上海市', country: '中国', country_code: 'cn' },
  },
]

describe('GET /api/geocode', () => {
  it('returns 400 when q param is missing', async () => {
    const req = new NextRequest('http://localhost/api/geocode')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns geocode results from Nominatim', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockNominatimResponse),
    }) as jest.Mock

    const req = new NextRequest('http://localhost/api/geocode?q=%E4%B8%8A%E6%B5%B7')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.results[0].city).toBe('上海市')
    expect(body.results[0].country).toBe('中国')
    expect(body.results[0].country_code).toBe('cn')
  })

  it('returns empty results when Nominatim fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
    }) as jest.Mock

    const req = new NextRequest('http://localhost/api/geocode?q=%E4%B8%8A%E6%B5%B7')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toEqual([])
  })
})
