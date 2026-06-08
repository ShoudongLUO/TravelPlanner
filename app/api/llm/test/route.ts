import { NextRequest, NextResponse } from 'next/server'
import { testProviderModel, type LLMProvider } from '@/lib/gemini'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  let body: { provider?: string; apiKey?: string; baseUrl?: string; model?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const { provider, apiKey, baseUrl, model } = body
  if (!provider || !apiKey || !model) {
    return NextResponse.json({ error: 'provider, apiKey, model required' }, { status: 400 })
  }
  if (provider !== 'gemini' && provider !== 'openai_compat') {
    return NextResponse.json({ error: 'unknown provider' }, { status: 400 })
  }
  if (provider === 'openai_compat' && !baseUrl) {
    return NextResponse.json({ error: 'baseUrl required for openai_compat' }, { status: 400 })
  }

  const err = await testProviderModel(provider as LLMProvider, apiKey, model, baseUrl)
  if (err) {
    return NextResponse.json({ ok: false, error: err }, { status: 200 })
  }
  return NextResponse.json({ ok: true })
}
