import { NextRequest, NextResponse } from 'next/server'
import { generateAttractions } from '@/lib/gemini'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }

  const userApiKey = request.headers.get('x-user-gemini-key') || null

  try {
    const attractions = await generateAttractions(destination, userApiKey)
    return NextResponse.json({ attractions })
  } catch {
    return NextResponse.json({ attractions: [] })
  }
}
