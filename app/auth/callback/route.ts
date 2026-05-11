import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(origin)
  }

  const supabase = await createClient()
  await supabase.auth.exchangeCodeForSession(code)

  // Check if user has a profile; if not, send to onboarding
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    if (!data) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }

  return NextResponse.redirect(origin)
}
