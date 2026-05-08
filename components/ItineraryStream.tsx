'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import YoutubeCard from './YoutubeCard'
import { createClient } from '@/lib/supabase/client'
import type { ItineraryContent, YoutubeVideo } from '@/lib/types'

interface StreamState {
  chunks: string
  content: ItineraryContent | null
  videos: YoutubeVideo[]
  done: boolean
  error: string | null
  progress: number
}

export default function ItineraryStream() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [state, setState] = useState<StreamState>({
    chunks: '', content: null, videos: [], done: false, error: null, progress: 0,
  })
  const [saving, setSaving] = useState(false)
  const hasFetched = useRef(false)

  const destination = searchParams.get('destination') ?? ''
  const start_date = searchParams.get('start_date') ?? ''
  const days = Number(searchParams.get('days') ?? 1)
  const budget = Number(searchParams.get('budget') ?? 0)

  useEffect(() => {
    if (hasFetched.current || !destination) return
    hasFetched.current = true

    async function generate() {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ destination, start_date, days, budget }),
      })
      if (!res.body) return

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const json = JSON.parse(line.slice(6))
          if (json.type === 'chunk') {
            setState(s => ({ ...s, chunks: s.chunks + json.text, progress: Math.min(s.progress + 5, 90) }))
          } else if (json.type === 'done') {
            setState(s => ({ ...s, content: json.content, videos: json.youtube_videos, done: true, progress: 100 }))
          } else if (json.type === 'error') {
            setState(s => ({ ...s, error: json.message, done: true }))
          }
        }
      }
    }
    generate()
  }, [destination, start_date, days, budget])

  const handleSave = async () => {
    if (!state.content) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('请先登录'); setSaving(false); return }

    const res = await fetch('/api/itineraries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ destination, start_date, days, budget, content: state.content, youtube_videos: state.videos }),
    })
    if (res.ok) {
      const { itinerary } = await res.json()
      router.push(`/itineraries/${itinerary.id}`)
    } else {
      alert('保存失败，请重试')
      setSaving(false)
    }
  }

  if (state.error) {
    return (
      <div className="text-center py-20 text-red-500">
        <p>生成失败：{state.error}</p>
        <button onClick={() => window.history.back()} className="mt-4 text-indigo-500 underline">返回重试</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-1.5 rounded-full text-sm font-bold">
          📍 {destination} · {days}天 · ¥{budget.toLocaleString()}
        </span>
        {state.done && (
          <button onClick={handleSave} disabled={saving}
            className="ml-auto bg-emerald-500 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-emerald-600 disabled:opacity-50">
            {saving ? '保存中...' : '💾 保存攻略'}
          </button>
        )}
      </div>

      <div className="w-full bg-slate-200 rounded-full h-1 mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-1 rounded-full transition-all duration-300"
          style={{ width: `${state.progress}%` }} />
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        <div>
          {state.content ? (
            <div className="space-y-4">
              <p className="text-slate-600 bg-indigo-50 p-4 rounded-xl">{state.content.summary}</p>
              {state.content.days.map((day, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-indigo-400">
                  <h3 className="font-bold text-slate-800 mb-2">{day.title}</h3>
                  <ul className="space-y-1">
                    {day.activities.map((act, j) => (
                      <li key={j} className="text-sm text-slate-600">{act}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-300">
              <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                {state.chunks}
                {!state.done && <span className="inline-block w-0.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {state.videos.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">📹 相关视频</h4>
              <div className="space-y-2">
                {state.videos.map(v => <YoutubeCard key={v.id} video={v} />)}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">🔗 小红书参考</h4>
            {state.content?.xhs_queries.map((q, i) => (
              <a key={i}
                href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 mb-2 hover:bg-red-100">
                📌 搜索「{q}」
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
