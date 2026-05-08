import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import DetailClient from './DetailClient'

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
      <DetailClient itinerary={data as any} />
    </div>
  )
}
