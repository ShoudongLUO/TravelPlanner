import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface WikiMediaItem {
  type: string
  showInGallery?: boolean
  titles?: { canonical?: string }
  thumbnail?: { source: string; width: number; height: number }
  original?: { source: string; mime: string }
}

interface WikiImageResult {
  url: string
  caption: string
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name param required' }, { status: 400 })
  }

  try {
    const title = name.replace(/ /g, '_')
    const url = `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelAI/1.0 (travel-planner-app)' },
    })

    if (!res.ok) return NextResponse.json({ images: [] })

    const data = await res.json()
    const items: WikiMediaItem[] = data.items ?? []

    const images: WikiImageResult[] = items
      .filter(item =>
        item.type === 'image' &&
        item.showInGallery === true &&
        item.thumbnail?.source &&
        !item.original?.mime?.includes('svg') &&
        (item.thumbnail?.width ?? 0) >= 300
      )
      .slice(0, 5)
      .map(item => ({
        url: item.thumbnail!.source,
        caption: (item.titles?.canonical ?? '')
          .replace('File:', '')
          .replace(/_/g, ' ')
          .replace(/\.[^.]+$/, ''),
      }))

    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
