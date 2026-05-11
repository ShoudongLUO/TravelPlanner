'use client'
import { useState } from 'react'
import ProfileEditor from './ProfileEditor'
import type { UserProfile } from '@/lib/types'

export default function ProfileClient({ initialProfile }: { initialProfile?: UserProfile }) {
  const [toast, setToast] = useState<string | null>(null)
  return (
    <>
      {toast && (
        <div className="fixed top-20 right-4 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-semibold">
          {toast}
        </div>
      )}
      <ProfileEditor
        initialProfile={initialProfile}
        onSaved={() => {
          setToast('✓ 已保存')
          setTimeout(() => setToast(null), 2500)
        }}
        ctaLabel="保存修改"
      />
    </>
  )
}
