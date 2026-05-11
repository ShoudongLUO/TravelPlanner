import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VALID_PACES, VALID_BUDGETS } from '@/lib/profile-options'

export async function GET(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error?.code === 'PGRST116' || !data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ profile: data })
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { travel_styles, pace, budget_style } = body as {
    travel_styles?: string[]
    pace?: string
    budget_style?: string
  }

  if (!Array.isArray(travel_styles) || travel_styles.length === 0) {
    return NextResponse.json({ error: 'travel_styles must be a non-empty array' }, { status: 400 })
  }
  if (typeof pace !== 'string' || !VALID_PACES.includes(pace)) {
    return NextResponse.json({ error: 'invalid pace' }, { status: 400 })
  }
  if (typeof budget_style !== 'string' || !VALID_BUDGETS.includes(budget_style)) {
    return NextResponse.json({ error: 'invalid budget_style' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: user.id,
      travel_styles,
      pace,
      budget_style,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ profile: data })
}
