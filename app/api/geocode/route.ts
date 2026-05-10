import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

interface NominatimResult {
  display_name: string
  address?: {
    city?: string
    town?: string
    village?: string
    country?: string
    country_code?: string
  }
}

interface GeoResult {
  display_name: string
  city: string
  country: string
  country_code: string
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) {
    return NextResponse.json({ error: 'q param required' }, { status: 400 })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelAI/1.0 (travel-planner-app)' },
    })

    if (!res.ok) return NextResponse.json({ results: [] })

    const data: NominatimResult[] = await res.json()
    const results: GeoResult[] = data.map(item => ({
      display_name: item.display_name,
      city: item.address?.city ?? item.address?.town ?? item.address?.village ?? item.display_name.split(',')[0],
      country: item.address?.country ?? '',
      country_code: item.address?.country_code ?? '',
    }))

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
