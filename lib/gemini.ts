import { buildSystemPrompt, buildUserPrompt } from './prompt'
import type { GenerateRequest, ItineraryContent, ItineraryReview } from './types'

const GEMINI_API_HOST = 'https://generativelanguage.googleapis.com/v1beta/models'
// Fallback order: balanced primary → lightest (lowest load) → highest quality
const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'] as const
const MAX_ATTEMPTS_PER_MODEL = 2
const RETRY_BACKOFF_MS = [500, 1500]
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

interface CallGeminiOptions {
  endpoint: 'streamGenerateContent' | 'generateContent'
  body: unknown
  apiKey: string
  queryParams?: string
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function callGeminiWithFallback({
  endpoint,
  body,
  apiKey,
  queryParams = '',
}: CallGeminiOptions): Promise<Response> {
  let lastError: { status: number; text: string } | null = null

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const suffix = queryParams ? `&${queryParams}` : ''
      const url = `${GEMINI_API_HOST}/${model}:${endpoint}?key=${apiKey}${suffix}`
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) return res

        const errText = await res.text()
        lastError = { status: res.status, text: errText }

        if (!RETRYABLE_STATUS.has(res.status)) {
          throw new Error(`Gemini API error ${res.status}: ${errText}`)
        }
        if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) {
          await sleep(RETRY_BACKOFF_MS[attempt])
        }
      } catch (err) {
        const isFinalAttempt = attempt === MAX_ATTEMPTS_PER_MODEL - 1
        if (err instanceof Error && err.message.startsWith('Gemini API error ')) {
          throw err
        }
        lastError = { status: 0, text: err instanceof Error ? err.message : 'network error' }
        if (!isFinalAttempt) {
          await sleep(RETRY_BACKOFF_MS[attempt])
        }
      }
    }
  }

  const status = lastError?.status ?? 503
  const text = lastError?.text ?? 'Gemini unavailable after retries'
  throw new Error(`Gemini API error ${status}: ${text}`)
}

export async function* streamItinerary(
  request: GenerateRequest,
  priorReviews: ItineraryReview[]
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await callGeminiWithFallback({
    endpoint: 'streamGenerateContent',
    queryParams: 'alt=sse',
    apiKey,
    body: {
      system_instruction: { parts: [{ text: buildSystemPrompt(priorReviews) }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(request) }] }],
      generationConfig: { temperature: 0.7 },
    },
  })

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') return
      try {
        const parsed = JSON.parse(json)
        const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) yield text
      } catch {
        // skip malformed lines
      }
    }
  }
}

export function parseItineraryContent(raw: string): ItineraryContent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in Gemini response')
  return JSON.parse(jsonMatch[0]) as ItineraryContent
}

export async function generateAttractions(destination: string): Promise<import('./types').Attraction[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const prompt = `列出${destination}最值得去的 12 个景点，以 JSON 格式返回：

{
  "attractions": [
    {
      "name": "中文景点名",
      "name_en": "English Attraction Name",
      "description": "一句话简介（30字以内）",
      "icon": "适合的 emoji（一个）"
    }
  ]
}

只返回 JSON，不加其他文字。`

  const res = await callGeminiWithFallback({
    endpoint: 'generateContent',
    apiKey,
    body: {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 },
    },
  })

  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []
  const parsed = JSON.parse(jsonMatch[0])
  return parsed.attractions ?? []
}
