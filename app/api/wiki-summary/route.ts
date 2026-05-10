import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface WikiSummary {
  extract?: string
  description?: string
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')
  if (!name) {
    return NextResponse.json({ error: 'name param required' }, { status: 400 })
  }

  try {
    const title = name.replace(/ /g, '_')
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`

    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelAI/1.0 (travel-planner-app)' },
    })

    if (!res.ok) return NextResponse.json({ summary: '' })

    const data: WikiSummary = await res.json()
    return NextResponse.json({ summary: data.extract ?? '' })
  } catch {
    return NextResponse.json({ summary: '' })
  }
}
