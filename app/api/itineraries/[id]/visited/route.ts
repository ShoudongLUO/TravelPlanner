import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (typeof body.visited !== 'boolean') {
    return NextResponse.json({ error: 'visited must be boolean' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('itineraries')
    .update({ visited: body.visited })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error?.code === 'PGRST116' || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ itinerary: data })
}
