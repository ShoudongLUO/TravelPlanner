import { Suspense } from 'react'
import ItineraryStream from '@/components/ItineraryStream'

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">加载中...</div>}>
      <ItineraryStream />
    </Suspense>
  )
}
