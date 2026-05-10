/**
 * @jest-environment node
 */
import { GET } from '@/app/api/wiki-summary/route'
import { NextRequest } from 'next/server'

describe('GET /api/wiki-summary', () => {
  it('returns 400 when name param is missing', async () => {
    const req = new NextRequest('http://localhost/api/wiki-summary')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns extract text from Wikipedia', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        extract: 'The Louvre is the most-visited museum in the world.',
        description: 'Art museum in Paris',
      }),
    }) as jest.Mock

    const req = new NextRequest('http://localhost/api/wiki-summary?name=Louvre')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toContain('Louvre')
  })

  it('returns empty summary when Wikipedia returns 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as jest.Mock

    const req = new NextRequest('http://localhost/api/wiki-summary?name=Unknown')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toBe('')
  })

  it('returns empty summary when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network')) as jest.Mock

    const req = new NextRequest('http://localhost/api/wiki-summary?name=Louvre')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.summary).toBe('')
  })
})
