import { NextRequest, NextResponse } from 'next/server'
import { generateAttractions, type LLMOverride, type LLMProvider } from '@/lib/gemini'

export const runtime = 'edge'

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

export async function GET(request: NextRequest) {
  const destination = request.nextUrl.searchParams.get('destination')
  if (!destination) {
    return NextResponse.json({ error: 'destination required' }, { status: 400 })
  }

  const override = readOverride(request)

  try {
    const attractions = await generateAttractions(destination, override)
    return NextResponse.json({ attractions })
  } catch {
    return NextResponse.json({ attractions: [] })
  }
}
