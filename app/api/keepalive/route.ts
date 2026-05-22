import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()

    const [itinRes, profileRes] = await Promise.all([
      // 006 migration check: queries the new `visited` column
      supabase.from('itineraries').select('visited', { count: 'exact', head: true }),
      // 005 migration check: queries the user_profiles table
      supabase.from('user_profiles').select('user_id', { count: 'exact', head: true }),
    ])

    const checks = {
      itineraries_visited: itinRes.error ? `ERR: ${itinRes.error.message}` : 'ok',
      user_profiles: profileRes.error ? `ERR: ${profileRes.error.message}` : 'ok',
    }

    const allOk = !itinRes.error && !profileRes.error
    return NextResponse.json(
      { ok: allOk, ts: new Date().toISOString(), checks },
      { status: allOk ? 200 : 500 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
