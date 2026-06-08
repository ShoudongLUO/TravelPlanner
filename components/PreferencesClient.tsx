'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import AttractionCard from './AttractionCard'
import CustomTagInput from './CustomTagInput'
import { userApiKeyHeader } from '@/lib/userApiKey'
import type { Attraction } from '@/lib/types'

export default function PreferencesClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [customTags, setCustomTags] = useState<string[]>([])

  const departure_city = searchParams.get('departure_city') ?? ''
  const destination = searchParams.get('destination') ?? ''
  const start_date = searchParams.get('start_date') ?? ''
  const days = searchParams.get('days') ?? ''
  const budget = searchParams.get('budget') ?? ''
  const travelers = searchParams.get('travelers') ?? '2'
  const outbound_depart_time = searchParams.get('outbound_depart_time') ?? '07:00'
  const outbound_arrive_time = searchParams.get('outbound_arrive_time') ?? '21:00'
  const return_depart_time = searchParams.get('return_depart_time') ?? '07:00'
  const return_arrive_time = searchParams.get('return_arrive_time') ?? '21:00'

  useEffect(() => {
    if (!destination) return
    fetch(`/api/popular-attractions?destination=${encodeURIComponent(destination)}`, {
      headers: userApiKeyHeader(),
    })
      .then(r => r.json())
      .then(data => {
        setAttractions(data.attractions ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [destination])

  const toggle = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const handleGenerate = () => {
    const allPreferred = [...Array.from(selected), ...customTags]
    const params = new URLSearchParams({
      departure_city,
      destination,
      start_date,
      days,
      budget,
      travelers,
      preferred_attractions: allPreferred.join(','),
      outbound_depart_time,
      outbound_arrive_time,
      return_depart_time,
      return_arrive_time,
    })
    router.push(`/generate?${params}`)
  }

  const totalCount = selected.size + customTags.length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Page Hero */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-5 rounded-xl mb-4">
        <h1 className="text-lg font-extrabold mb-1">🎯 选择你想去的景点</h1>
        <p className="text-sm opacity-85">
          📍 {destination} · {days}天 · ¥{Number(budget).toLocaleString()} · 出发 {start_date}
        </p>
      </div>

      {/* Step indicator */}
      <div className="bg-white rounded-xl px-4 py-3 mb-4 flex items-center gap-2 text-xs text-slate-500">
        <span>① 填写信息</span>
        <span className="text-slate-300">→</span>
        <span className="text-indigo-600 font-bold">② 选择偏好</span>
        <span className="text-slate-300">→</span>
        <span>③ 生成攻略</span>
      </div>

      {/* Attractions */}
      <div className="bg-white rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-slate-800 mb-1">🏛 热门景点（AI 推荐）</div>
        <div className="text-xs text-slate-400 mb-4">勾选你感兴趣的景点，AI 会优先安排到行程中</div>

        {loading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <div className="mb-2">⏳ AI 正在为你挑选 {destination} 热门景点...</div>
            <div className="text-xs text-slate-400">通常需要 3-5 秒，请稍等</div>
          </div>
        ) : attractions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attractions.map(a => (
              <AttractionCard
                key={a.name}
                attraction={a}
                selected={selected.has(a.name)}
                onToggle={() => toggle(a.name)}
              />
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-sm text-slate-400">
            无法加载推荐景点，可使用下方自定义输入
          </div>
        )}
      </div>

      {/* Custom tags */}
      <div className="bg-white rounded-xl p-5 mb-4">
        <div className="text-sm font-bold text-slate-800 mb-1">✏️ 还想去其他地方？</div>
        <div className="text-xs text-slate-400 mb-3">输入景点名称按回车添加</div>
        <CustomTagInput tags={customTags} onChange={setCustomTags} />
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl p-4 flex items-center gap-3">
        <span className="text-sm text-slate-600 flex-1">
          已选 <strong className="text-indigo-600">{totalCount}</strong> 个景点
          {customTags.length > 0 && <span className="text-slate-400">（含 {customTags.length} 个自定义）</span>}
        </span>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-slate-500 text-sm underline"
        >
          ← 返回修改
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:shadow-lg transition-all"
        >
          🚀 生成攻略
        </button>
      </div>
    </div>
  )
}
