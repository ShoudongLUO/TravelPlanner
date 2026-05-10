/**
 * @jest-environment node
 */
import { GET } from '@/app/api/wiki-images/route'
import { NextRequest } from 'next/server'

const mockWikiResponse = {
  items: [
    {
      type: 'image',
      showInGallery: true,
      titles: { canonical: 'File:Louvre_Museum.jpg' },
      thumbnail: { source: 'https://upload.wikimedia.org/thumb/louvre.jpg', width: 1280, height: 800 },
      original: { source: 'https://upload.wikimedia.org/louvre.jpg', mime: 'image/jpeg' },
    },
    {
      type: 'image',
      showInGallery: false,
      titles: { canonical: 'File:Icon.png' },
      thumbnail: { source: 'https://upload.wikimedia.org/icon.png', width: 100, height: 100 },
      original: { source: 'https://upload.wikimedia.org/icon.png', mime: 'image/png' },
    },
    {
      type: 'image',
      showInGallery: true,
      titles: { canonical: 'File:Map.svg' },
      thumbnail: { source: 'https://upload.wikimedia.org/map.svg', width: 800, height: 600 },
      original: { source: 'https://upload.wikimedia.org/map.svg', mime: 'image/svg+xml' },
    },
  ],
}

describe('GET /api/wiki-images', () => {
  it('returns 400 when name param is missing', async () => {
    const req = new NextRequest('http://localhost/api/wiki-images')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('returns filtered images from Wikipedia', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockWikiResponse),
    }) as jest.Mock

    const req = new NextRequest('http://localhost/api/wiki-images?name=Louvre+Museum')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.images).toHaveLength(1)
    expect(body.images[0].url).toContain('louvre.jpg')
    expect(body.images[0].caption).toBe('Louvre Museum')
  })

  it('returns empty images when Wikipedia returns 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as jest.Mock

    const req = new NextRequest('http://localhost/api/wiki-images?name=UnknownPlace')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.images).toEqual([])
  })

  it('returns empty images when fetch throws', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error')) as jest.Mock

    const req = new NextRequest('http://localhost/api/wiki-images?name=Louvre')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.images).toEqual([])
  })
})
