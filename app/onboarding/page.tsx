import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingClient from '@/components/OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // If profile already exists, skip onboarding
  const { data } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (data) redirect('/')

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 text-center">
        <h1 className="text-2xl font-extrabold mb-1">欢迎！让我了解你的旅行偏好</h1>
        <p className="text-sm opacity-90">这能帮 AI 生成更贴合你的攻略</p>
      </div>
      <OnboardingClient />
    </div>
  )
}
