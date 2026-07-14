import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const MAX_QUERY_LENGTH = 200
const UPSTREAM_TIMEOUT_MS = 10_000
const USER_AGENT =
  'TravelPlanner/1.0 (https://github.com/ShoudongLUO/TravelPlanner)'
// Nominatim coordinates are strings. Accept JSON-number syntax only so values
// such as hexadecimal numbers, leading plus signs, `.5`, and `1.` stay invalid.
const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/

interface GeoResult {
  display_name: string
  city: string
  country: string
  country_code: string
  lat: number
  lng: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return ''
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }
  if (typeof value !== 'string') return null

  if (!JSON_NUMBER.test(value)) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function cancelResponseBody(body: ReadableStream<Uint8Array> | null) {
  if (!body) return
  try {
    await body.cancel()
  } catch {
    // Cancellation is best-effort and must not replace the upstream status.
  }
}

function parseResult(value: unknown): GeoResult | null {
  if (!isRecord(value) || typeof value.display_name !== 'string') return null
  if (value.display_name.trim().length === 0) return null

  const lat = parseCoordinate(value.lat)
  const lng = parseCoordinate(value.lon)
  if (
    lat === null ||
    lng === null ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null
  }

  const address = isRecord(value.address) ? value.address : {}
  const displayCity = value.display_name.split(',')[0].trim()

  return {
    display_name: value.display_name,
    city: firstNonEmptyString(
      address.city,
      address.town,
      address.village,
      displayCity,
    ),
    country: stringField(address.country),
    country_code: stringField(address.country_code),
    lat,
    lng,
  }
}

function emptyResults(status = 503) {
  return NextResponse.json({ results: [] }, { status })
}

function nominatimUrl(query: string): string {
  const searchParams = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  })
  return `${NOMINATIM_ENDPOINT}?${searchParams.toString()}`
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get('q')
  if (rawQuery === null || rawQuery.trim().length === 0) {
    return NextResponse.json({ error: 'q param required' }, { status: 400 })
  }

  const query = rawQuery.trim()
  if (rawQuery.length > MAX_QUERY_LENGTH) {
    if (query.length <= MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { error: 'q contains excessive surrounding whitespace' },
        { status: 400 },
      )
    }
    return NextResponse.json(
      { error: `q must be at most ${MAX_QUERY_LENGTH} characters` },
      { status: 413 },
    )
  }

  if (request.signal.aborted) return emptyResults()

  const controller = new AbortController()
  const abortFromRequest = () => controller.abort(request.signal.reason)
  request.signal.addEventListener('abort', abortFromRequest, { once: true })
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const response = await fetch(nominatimUrl(query), {
      method: 'GET',
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    })

    if (response.status === 429) {
      await cancelResponseBody(response.body)
      return emptyResults(429)
    }
    if (!response.ok) {
      await cancelResponseBody(response.body)
      return emptyResults()
    }

    let body: unknown
    try {
      body = await response.json()
    } catch {
      return emptyResults()
    }
    if (!Array.isArray(body)) return emptyResults()

    const results = body
      .map(parseResult)
      .filter((result): result is GeoResult => result !== null)
    return NextResponse.json({ results })
  } catch {
    return emptyResults()
  } finally {
    clearTimeout(timeout)
    request.signal.removeEventListener('abort', abortFromRequest)
  }
}
