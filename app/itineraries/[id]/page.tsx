import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import ItineraryDetail from '@/components/ItineraryDetail'

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data } = await supabase
    .from('itineraries')
    .select('*, itinerary_reviews(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!data) notFound()

  return (
    <div className="max-w-3xl mx-auto px-4 py-0">
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
        <h1 className="text-xl font-extrabold">🗺️ {data.destination} · {data.days}天</h1>
        <p className="text-sm opacity-85 mt-1">{data.start_date} 出发 · 预算 ¥{(data.budget as number).toLocaleString()}</p>
      </div>
      <div className="bg-white rounded-b-xl shadow">
        <ItineraryDetail itinerary={data as any} />
      </div>
    </div>
  )
}
