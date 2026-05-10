'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Dynamically import to ensure this only runs client-side after hydration
    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => setUser(data.user))
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })
      return () => subscription.unsubscribe()
    })
  }, [])

  const handleLogin = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
      <Link href="/" className="font-extrabold text-indigo-500 text-lg">✈️ TravelAI</Link>
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <Link href="/">发现</Link>
        {user && <Link href="/itineraries">我的攻略</Link>}
        {user ? (
          <button onClick={handleLogout} className="text-slate-400 hover:text-slate-600">退出</button>
        ) : (
          <button
            onClick={handleLogin}
            className="bg-indigo-500 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-indigo-600 transition-colors"
          >
            登录
          </button>
        )}
      </div>
    </nav>
  )
}
