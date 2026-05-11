'use client'
import { useState } from 'react'
import { TRAVEL_STYLES, PACE_OPTIONS, BUDGET_STYLES } from '@/lib/profile-options'
import type { UserProfile } from '@/lib/types'

interface ProfileEditorProps {
  initialProfile?: UserProfile
  onSaved: () => void
  ctaLabel: string
}

export default function ProfileEditor({ initialProfile, onSaved, ctaLabel }: ProfileEditorProps) {
  const [styles, setStyles] = useState<string[]>(initialProfile?.travel_styles ?? [])
  const [pace, setPace] = useState(initialProfile?.pace ?? '平衡')
  const [budget, setBudget] = useState(initialProfile?.budget_style ?? '平衡型')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleStyle = (value: string) => {
    setStyles(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value])
  }

  const isValid = styles.length > 0

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ travel_styles: styles, pace, budget_style: budget }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? '保存失败')
        setSaving(false)
        return
      }
      onSaved()
    } catch {
      setError('网络错误，请重试')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <section>
        <h2 className="text-base font-bold text-slate-800 mb-1">🎨 旅行风格（多选，至少 1 个）</h2>
        <p className="text-xs text-slate-500 mb-3">勾选你感兴趣的方向，AI 会优先推荐</p>
        <div className="grid grid-cols-2 gap-2">
          {TRAVEL_STYLES.map(opt => {
            const selected = styles.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleStyle(opt.value)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{opt.icon}</span>
                  <span className="font-bold text-sm text-slate-800">{opt.value}</span>
                </div>
                <div className="text-xs text-slate-500">{opt.desc}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-800 mb-1">⚡ 节奏偏好</h2>
        <p className="text-xs text-slate-500 mb-3">行程紧凑度</p>
        <div className="grid grid-cols-3 gap-2">
          {PACE_OPTIONS.map(opt => {
            const selected = pace === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPace(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="font-bold text-sm text-slate-800">{opt.value}</div>
                <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-800 mb-1">💰 消费风格</h2>
        <p className="text-xs text-slate-500 mb-3">影响餐厅和住宿推荐的价位</p>
        <div className="grid grid-cols-3 gap-2">
          {BUDGET_STYLES.map(opt => {
            const selected = budget === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setBudget(opt.value)}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="text-2xl mb-1">{opt.icon}</div>
                <div className="font-bold text-sm text-slate-800">{opt.value}</div>
                <div className="text-xs text-slate-500 mt-1">{opt.desc}</div>
              </button>
            )
          })}
        </div>
      </section>

      {error && <p className="text-rose-600 text-sm">{error}</p>}

      <button
        type="button"
        disabled={!isValid || saving}
        onClick={handleSave}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
      >
        {saving ? '保存中...' : ctaLabel}
      </button>
    </div>
  )
}
