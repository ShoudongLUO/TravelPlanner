import type { YoutubeVideo } from './types'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search'

export function buildYoutubeSearchUrl(destination: string): string {
  const params = new URLSearchParams({
    part: 'snippet',
    q: `${destination} 旅游攻略`,
    type: 'video',
    maxResults: '4',
    relevanceLanguage: 'zh',
    key: process.env.YOUTUBE_API_KEY ?? '',
  })
  return `${YOUTUBE_API_BASE}?${params}`
}

export function parseYoutubeResponse(raw: { items: unknown[] }): YoutubeVideo[] {
  return raw.items.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
  }))
}

export async function searchYoutubeVideos(destination: string): Promise<YoutubeVideo[]> {
  const url = buildYoutubeSearchUrl(destination)
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 403) return [] // quota exceeded — degrade gracefully
    throw new Error(`YouTube API error: ${res.status}`)
  }
  const data = await res.json()
  return parseYoutubeResponse(data)
}
