const STORAGE_KEY = 'travelai.gemini_api_key'

export function getUserApiKey(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function setUserApiKey(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, key.trim())
  } catch {
    // localStorage may be disabled (e.g. private browsing) — silently no-op
  }
}

export function clearUserApiKey(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function userApiKeyHeader(): Record<string, string> {
  const key = getUserApiKey()
  return key ? { 'x-user-gemini-key': key } : {}
}
