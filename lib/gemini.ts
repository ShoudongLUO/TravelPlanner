import { buildSystemPrompt, buildUserPrompt } from './prompt'
import type { GenerateRequest, ItineraryContent, ItineraryReview } from './types'

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash'

export async function* streamItinerary(
  request: GenerateRequest,
  priorReviews: ItineraryReview[]
): AsyncGenerator<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const res = await fetch(
    `${GEMINI_API_BASE}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt(priorReviews) }] },
        contents: [{ role: 'user', parts: [{ text: buildUserPrompt(request) }] }],
        generationConfig: { temperature: 0.7 },
      }),
    }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gemini API error ${res.status}: ${err}`)
  }

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
