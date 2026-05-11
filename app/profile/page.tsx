import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileClient from '@/components/ProfileClient'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div>
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
        <h1 className="text-xl font-extrabold">🎨 我的旅行画像</h1>
        <p className="text-sm opacity-85 mt-1">调整偏好，AI 会按你的风格生成攻略</p>
      </div>
      <ProfileClient initialProfile={profile ?? undefined} />
    </div>
  )
}
