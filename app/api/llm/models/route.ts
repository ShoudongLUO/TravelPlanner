import { NextRequest, NextResponse } from 'next/server'
import { listProviderModels, type LLMProvider } from '@/lib/gemini'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  let body: { provider?: string; apiKey?: string; baseUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { provider, apiKey, baseUrl } = body
  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'provider and apiKey required' }, { status: 400 })
  }
  if (provider !== 'gemini' && provider !== 'openai_compat') {
    return NextResponse.json({ error: 'unknown provider' }, { status: 400 })
  }
  if (provider === 'openai_compat' && !baseUrl) {
    return NextResponse.json({ error: 'baseUrl required for openai_compat' }, { status: 400 })
  }

  try {
    const models = await listProviderModels(provider as LLMProvider, apiKey, baseUrl)
    return NextResponse.json({ models })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'list models failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
