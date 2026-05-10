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
      title: 'File:Louvre_Museum.jpg',
      caption: { text: 'Louvre Museum exterior' },
      srcset: [
        { src: '//upload.wikimedia.org/thumb/500px-louvre.jpg', scale: '1x' },
        { src: '//upload.wikimedia.org/thumb/1280px-louvre.jpg', scale: '2x' },
      ],
    },
    {
      type: 'image',
      showInGallery: false,
      title: 'File:Icon.png',
      srcset: [
        { src: '//upload.wikimedia.org/thumb/100px-icon.png', scale: '1x' },
      ],
    },
    {
      type: 'image',
      showInGallery: true,
      title: 'File:Map.svg',
      srcset: [
        { src: '//upload.wikimedia.org/thumb/500px-map.svg', scale: '1x' },
      ],
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
    expect(body.images[0].url).toContain('1280px-louvre.jpg')
    expect(body.images[0].url).toMatch(/^https:/)
    expect(body.images[0].caption).toBe('Louvre Museum exterior')
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
