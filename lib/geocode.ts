export interface GeocodeResult {
  lat: number
  lng: number
  country: string | null
}

export async function geocodeDestination(name: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1&addressdetails=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TravelAI/1.0 (travel-planner-app)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const item = data[0]
    return {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      country: item.address?.country ?? null,
    }
  } catch {
    return null
  }
}
