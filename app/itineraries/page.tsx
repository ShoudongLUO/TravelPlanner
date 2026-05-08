import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ItineraryCard from '@/components/ItineraryCard'
import Link from 'next/link'

export default async function ItinerariesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: itineraries } = await supabase
    .from('itineraries')
    .select('id, destination, start_date, days, budget, created_at, itinerary_reviews(id)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-slate-800 mb-6">我的攻略记录</h1>
      <div className="grid grid-cols-2 gap-4">
        {itineraries?.map((it, i) => (
          <ItineraryCard key={it.id} itinerary={it as any} index={i} />
        ))}
        <Link href="/"
          className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center min-h-[100px] text-slate-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors">
          <span className="text-3xl mb-1">+</span>
          <span className="text-sm">新建攻略</span>
        </Link>
      </div>
    </div>
  )
}
