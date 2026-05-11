'use client'
import { useRouter } from 'next/navigation'
import ProfileEditor from './ProfileEditor'

export default function OnboardingClient() {
  const router = useRouter()
  return (
    <ProfileEditor
      onSaved={() => router.push('/')}
      ctaLabel="✓ 完成并开始"
    />
  )
}
