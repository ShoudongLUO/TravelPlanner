import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MapClient from '@/components/MapClient'
import type { Itinerary } from '@/lib/types'

export default async function MapPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data } = await supabase
    .from('itineraries')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const itineraries: Itinerary[] = data ?? []

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
        <h1 className="text-xl font-extrabold">🗺 我的足迹</h1>
        <p className="text-sm opacity-85 mt-1">所有保存的攻略地点都在这里</p>
      </div>
      <MapClient itineraries={itineraries} />
    </div>
  )
}
