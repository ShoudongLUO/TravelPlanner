import { NextRequest, NextResponse } from 'next/server'
import { searchYoutubeVideos } from '@/lib/youtube'

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }
  try {
    const videos = await searchYoutubeVideos(destination)
    return NextResponse.json({ videos })
  } catch (error) {
    return NextResponse.json({ error: 'YouTube search failed' }, { status: 500 })
  }
}
