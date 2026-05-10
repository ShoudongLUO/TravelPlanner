import { NextRequest, NextResponse } from 'next/server'
import { generateAttractions } from '@/lib/gemini'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }

  try {
    const attractions = await generateAttractions(destination)
    return NextResponse.json({ attractions })
  } catch {
    return NextResponse.json({ attractions: [] })
  }
}
