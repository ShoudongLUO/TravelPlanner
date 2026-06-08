export type LLMProvider = 'gemini' | 'openai_compat'

export interface LLMConfig {
  provider: LLMProvider
  apiKey: string
  baseUrl?: string  // required when provider === 'openai_compat'
  model: string
}

const STORAGE_KEY = 'travelai.llm_config'

export function getLLMConfig(): LLMConfig | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<LLMConfig>
    if (!parsed.provider || !parsed.apiKey || !parsed.model) return null
    if (parsed.provider === 'openai_compat' && !parsed.baseUrl) return null
    return {
      provider: parsed.provider as LLMProvider,
      apiKey: parsed.apiKey,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
    }
  } catch {
    return null
  }
}

export function setLLMConfig(config: LLMConfig): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage may be disabled (private browsing) — silently no-op
  }
}

export function clearLLMConfig(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function llmConfigHeaders(): Record<string, string> {
  const cfg = getLLMConfig()
  if (!cfg) return {}
  const headers: Record<string, string> = {
    'x-llm-provider': cfg.provider,
    'x-llm-key': cfg.apiKey,
    'x-llm-model': cfg.model,
  }
  if (cfg.baseUrl) headers['x-llm-base-url'] = cfg.baseUrl
  return headers
}
