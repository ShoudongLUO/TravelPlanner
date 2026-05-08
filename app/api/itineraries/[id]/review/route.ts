import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id: itinerary_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { rating, actual_budget, highlights, improvements, visited_at } = body

  if (!rating || (rating as number) < 1 || (rating as number) > 5) {
    return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
  }
  if (!actual_budget || (actual_budget as number) <= 0) {
    return NextResponse.json({ error: 'actual_budget must be positive' }, { status: 400 })
  }
  if (!visited_at) {
    return NextResponse.json({ error: 'visited_at required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('itinerary_reviews')
    .insert({
      itinerary_id,
      user_id: user.id,
      rating,
      actual_budget,
      highlights: highlights ?? '',
      improvements: improvements ?? '',
      visited_at,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data }, { status: 201 })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id: itinerary_id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { rating, actual_budget, highlights, improvements, visited_at } = body

  if (rating !== undefined && ((rating as number) < 1 || (rating as number) > 5)) {
    return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
  }
  if (actual_budget !== undefined && (actual_budget as number) <= 0) {
    return NextResponse.json({ error: 'actual_budget must be positive' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (rating !== undefined) updates.rating = rating
  if (actual_budget !== undefined) updates.actual_budget = actual_budget
  if (highlights !== undefined) updates.highlights = highlights
  if (improvements !== undefined) updates.improvements = improvements
  if (visited_at !== undefined) updates.visited_at = visited_at

  const { data, error } = await supabase
    .from('itinerary_reviews')
    .update(updates)
    .eq('itinerary_id', itinerary_id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ review: data })
}
