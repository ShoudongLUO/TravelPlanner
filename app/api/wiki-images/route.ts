import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface WikiSrcsetItem {
  src: string
  scale: string
}

interface WikiMediaItem {
  type: string
  showInGallery?: boolean
  title?: string
  caption?: { text?: string }
  srcset?: WikiSrcsetItem[]
}

interface WikiImageResult {
  url: string
  caption: string
}

async function fetchMediaList(lang: 'en' | 'zh', title: string): Promise<WikiMediaItem[] | null> {
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelAI/1.0 (travel-planner-app)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.items ?? []
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name param required' }, { status: 400 })
  }

  try {
    const title = name.replace(/ /g, '_')
    // Try English Wikipedia first, fall back to Chinese Wikipedia
    let items = await fetchMediaList('en', title)
    if (items === null || items.length === 0) {
      items = await fetchMediaList('zh', title)
    }
    if (items === null) return NextResponse.json({ images: [] })

    const images: WikiImageResult[] = items
      .filter(item =>
        item.type === 'image' &&
        item.showInGallery === true &&
        item.title &&
        !item.title.toLowerCase().endsWith('.svg') &&
        item.srcset &&
        item.srcset.length > 0
      )
      .slice(0, 5)
      .map(item => {
        const hi = item.srcset!.find(s => s.scale === '2x') ?? item.srcset![item.srcset!.length - 1]
        const fullUrl = hi.src.startsWith('//') ? `https:${hi.src}` : hi.src
        const fallbackCaption = (item.title ?? '')
          .replace(/^File:/, '')
          .replace(/_/g, ' ')
          .replace(/\.[^.]+$/, '')
        return {
          url: fullUrl,
          caption: item.caption?.text ?? fallbackCaption,
        }
      })

    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
