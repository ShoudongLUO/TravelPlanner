import { buildYoutubeSearchUrl, parseYoutubeResponse } from '@/lib/youtube'

describe('buildYoutubeSearchUrl', () => {
  it('builds correct URL with destination', () => {
    const url = buildYoutubeSearchUrl('京都')
    expect(url).toContain('q=%E4%BA%AC%E9%83%BD')
    expect(url).toContain('part=snippet')
    expect(url).toContain('maxResults=4')
  })
})

describe('parseYoutubeResponse', () => {
  it('maps API response to YoutubeVideo array', () => {
    const raw = {
      items: [
        {
          id: { videoId: 'abc123' },
          snippet: {
            title: '京都攻略',
            thumbnails: { medium: { url: 'https://img.example.com/thumb.jpg' } },
          },
        },
      ],
    }
    const result = parseYoutubeResponse(raw)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: 'abc123',
      title: '京都攻略',
      thumbnail: 'https://img.example.com/thumb.jpg',
      url: 'https://www.youtube.com/watch?v=abc123',
    })
  })

  it('returns empty array for empty items', () => {
    expect(parseYoutubeResponse({ items: [] })).toEqual([])
  })
})
