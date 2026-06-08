import { NextRequest } from 'next/server'
import { streamItinerary, parseItineraryContent, type LLMOverride, type LLMProvider } from '@/lib/gemini'
import { searchYoutubeVideos } from '@/lib/youtube'
import { createServerClient } from '@supabase/ssr'
import type { GenerateRequest, ItineraryReview, UserProfile } from '@/lib/types'

function readOverride(request: NextRequest): LLMOverride | undefined {
  const provider = request.headers.get('x-llm-provider') as LLMProvider | null
  const apiKey = request.headers.get('x-llm-key')
  const model = request.headers.get('x-llm-model')
  const baseUrl = request.headers.get('x-llm-base-url') || undefined
  if (!provider || !apiKey || !model) return undefined
  if (provider !== 'gemini' && provider !== 'openai_compat') return undefined
  if (provider === 'openai_compat' && !baseUrl) return undefined
  return { provider, apiKey, model, baseUrl }
}

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    departure_city, destination, start_date, days, budget, travelers,
    preferred_attractions = [],
    outbound_depart_time, outbound_arrive_time,
    return_depart_time, return_arrive_time,
  } = body as GenerateRequest

  if (!departure_city || !destination || !start_date || !days || !budget || !travelers) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })
  }

  // Edge-compatible Supabase client (reads cookies from request, no next/headers)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  let priorReviews: ItineraryReview[] = []
  if (user) {
    const { data } = await supabase
      .from('itinerary_reviews')
      .select(`*, itineraries!inner(destination, user_id)`)
      .eq('itineraries.user_id', user.id)
      .eq('itineraries.destination', destination)
      .order('created_at', { ascending: false })
      .limit(3)
    priorReviews = data ?? []
  }

  let user_profile: UserProfile | undefined = undefined
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    user_profile = data ?? undefined
  }

  const override = readOverride(request)

  const encoder = new TextEncoder()
  const [youtubeVideos, stream] = await Promise.all([
    searchYoutubeVideos(destination),
    (async () => streamItinerary(
      {
        departure_city, destination, start_date, days, budget, travelers,
        preferred_attractions, user_profile,
        outbound_depart_time, outbound_arrive_time,
        return_depart_time, return_arrive_time,
      },
      priorReviews,
      override
    ))(),
  ])

  const readableStream = new ReadableStream({
    async start(controller) {
      let fullText = ''
      try {
        for await (const chunk of stream) {
          fullText += chunk
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: chunk })}\n\n`))
        }
        const content = parseItineraryContent(fullText)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'done', content, youtube_videos: youtubeVideos })}\n\n`)
        )
      } catch (error) {
        const raw = error instanceof Error ? error.message : 'Generation failed'
        const overloaded = /\b(503|429|502|504|UNAVAILABLE|overload|high demand)\b/i.test(raw)
        const usingOverride = !!override
        const message = overloaded
          ? (usingOverride
              ? `所选模型当前过载或不可用：${raw}`
              : 'Gemini 当前过载，重试多次仍未恢复，请稍后再试一次')
          : raw
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  })
}
