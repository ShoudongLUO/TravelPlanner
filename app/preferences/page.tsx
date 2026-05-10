import { Suspense } from 'react'
import PreferencesClient from '@/components/PreferencesClient'

export default function PreferencesPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-400">加载中...</div>}>
      <PreferencesClient />
    </Suspense>
  )
}
