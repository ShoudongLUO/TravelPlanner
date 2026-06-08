import { buildSystemPrompt, buildUserPrompt } from './prompt'
import type { Attraction, GenerateRequest, ItineraryContent, ItineraryReview } from './types'

export type LLMProvider = 'gemini' | 'openai_compat'

export interface LLMOverride {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string  // required for openai_compat (e.g. https://api.deepseek.com/v1)
  model: string
}

const GEMINI_HOST = 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'] as const
const MAX_ATTEMPTS_PER_MODEL = 2
const RETRY_BACKOFF_MS = [500, 1500]
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ===================== Gemini =====================

async function* streamGemini(
  systemText: string,
  userText: string,
  apiKey: string,
  modelChain: readonly string[]
): AsyncGenerator<string> {
  let lastError: { status: number; text: string } | null = null

  for (const model of modelChain) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt++) {
      const url = `${GEMINI_HOST}/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemText }] },
            contents: [{ role: 'user', parts: [{ text: userText }] }],
            generationConfig: { temperature: 0.7 },
          }),
        })

        if (!res.ok) {
          const errText = await res.text()
          lastError = { status: res.status, text: errText }
          if (!RETRYABLE_STATUS.has(res.status)) {
            throw new Error(`Gemini API error ${res.status}: ${errText}`)
          }
          if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) await sleep(RETRY_BACKOFF_MS[attempt])
          continue
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) return
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
              // skip malformed
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message.startsWith('Gemini API error ')) throw err
        lastError = { status: 0, text: err instanceof Error ? err.message : 'network error' }
        if (attempt < MAX_ATTEMPTS_PER_MODEL - 1) await sleep(RETRY_BACKOFF_MS[attempt])
      }
    }
  }

  const status = lastError?.status ?? 503
  const text = lastError?.text ?? 'Gemini unavailable after retries'
  throw new Error(`Gemini API error ${status}: ${text}`)
}

async function callGeminiOnce(
  systemText: string,
  userText: string,
  apiKey: string,
  modelChain: readonly string[]
): Promise<string> {
  let out = ''
  for await (const chunk of streamGemini(systemText, userText, apiKey, modelChain)) {
    out += chunk
  }
  return out
}

// ===================== OpenAI-compatible =====================

async function* streamOpenAICompat(
  systemText: string,
  userText: string,
  apiKey: string,
  baseUrl: string,
  model: string
): AsyncGenerator<string> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const messages = systemText
    ? [{ role: 'system', content: systemText }, { role: 'user', content: userText }]
    : [{ role: 'user', content: userText }]
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages,
    }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${errText}`)
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) return
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6).trim()
      if (json === '[DONE]') return
      try {
        const parsed = JSON.parse(json)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch {
        // skip malformed
      }
    }
  }
}

async function callOpenAIOnce(
  systemText: string,
  userText: string,
  apiKey: string,
  baseUrl: string,
  model: string
): Promise<string> {
  let out = ''
  for await (const chunk of streamOpenAICompat(systemText, userText, apiKey, baseUrl, model)) {
    out += chunk
  }
  return out
}

// ===================== Public API =====================

export async function* streamItinerary(
  request: GenerateRequest,
  priorReviews: ItineraryReview[],
  override?: LLMOverride
): AsyncGenerator<string> {
  const systemText = buildSystemPrompt(priorReviews)
  const userText = buildUserPrompt(request)

  if (override?.provider === 'openai_compat') {
    if (!override.apiKey) throw new Error('OpenAI API key missing')
    if (!override.baseUrl) throw new Error('OpenAI base URL missing')
    if (!override.model) throw new Error('OpenAI model missing')
    yield* streamOpenAICompat(systemText, userText, override.apiKey, override.baseUrl, override.model)
    return
  }

  // Gemini path — either user-overridden Gemini or platform default
  const apiKey = override?.apiKey || process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')
  const chain = override?.model ? [override.model] : GEMINI_FALLBACK_CHAIN
  yield* streamGemini(systemText, userText, apiKey, chain)
}

export function parseItineraryContent(raw: string): ItineraryContent {
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in LLM response')
  return JSON.parse(jsonMatch[0]) as ItineraryContent
}

export async function generateAttractions(
  destination: string,
  override?: LLMOverride
): Promise<Attraction[]> {
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

  let raw = ''
  try {
    if (override?.provider === 'openai_compat') {
      if (!override.apiKey || !override.baseUrl || !override.model) return []
      raw = await callOpenAIOnce('', prompt, override.apiKey, override.baseUrl, override.model)
    } else {
      const apiKey = override?.apiKey || process.env.GEMINI_API_KEY
      if (!apiKey) return []
      const chain = override?.model ? [override.model] : GEMINI_FALLBACK_CHAIN
      raw = await callGeminiOnce('', prompt, apiKey, chain)
    }
  } catch {
    return []
  }

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return []
  try {
    const parsed = JSON.parse(jsonMatch[0])
    return parsed.attractions ?? []
  } catch {
    return []
  }
}

// ===================== Test model =====================

/**
 * Sends a single tiny non-streaming request to verify the model actually responds.
 * Returns null on success; the upstream error message on failure.
 */
export async function testProviderModel(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  baseUrl?: string
): Promise<string | null> {
  try {
    if (provider === 'gemini') {
      const url = `${GEMINI_HOST}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 5 },
        }),
      })
      if (!res.ok) return `${res.status}: ${await res.text()}`
      return null
    }

    if (provider === 'openai_compat') {
      if (!baseUrl) return 'base URL required'
      const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
          temperature: 0,
          stream: false,
        }),
      })
      if (!res.ok) return `${res.status}: ${await res.text()}`
      return null
    }

    return `unknown provider: ${provider}`
  } catch (err) {
    return err instanceof Error ? err.message : 'network error'
  }
}

// ===================== List models =====================

export interface ListedModel {
  id: string
  display?: string
}

export async function listProviderModels(
  provider: LLMProvider,
  apiKey: string,
  baseUrl?: string
): Promise<ListedModel[]> {
  if (provider === 'gemini') {
    const res = await fetch(`${GEMINI_HOST}/models?key=${encodeURIComponent(apiKey)}`)
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini listModels failed ${res.status}: ${errText}`)
    }
    const data = await res.json()
    const models: ListedModel[] = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[]; name?: string }) => {
        const methods = m.supportedGenerationMethods ?? []
        if (!methods.includes('generateContent')) return false
        const id = (m.name ?? '').replace(/^models\//, '')
        // Skip non-text models (tts, image, music, robotics, embeddings)
        return !/(tts|image|robotics|embedding|lyria|computer-use|gemma)/i.test(id)
      })
      .map((m: { name: string; displayName?: string }) => ({
        id: m.name.replace(/^models\//, ''),
        display: m.displayName,
      }))
    return models.sort((a, b) => a.id.localeCompare(b.id))
  }

  if (provider === 'openai_compat') {
    if (!baseUrl) throw new Error('base URL required for OpenAI-compatible provider')
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI listModels failed ${res.status}: ${errText}`)
    }
    const data = await res.json()
    const arr = data.data ?? data.models ?? []
    const models: ListedModel[] = arr
      .map((m: { id?: string; name?: string }) => {
        const id = m.id ?? m.name
        return typeof id === 'string' ? { id } : null
      })
      .filter((m: ListedModel | null): m is ListedModel => m !== null)
    return models.sort((a, b) => a.id.localeCompare(b.id))
  }

  throw new Error(`unknown provider: ${provider}`)
}
