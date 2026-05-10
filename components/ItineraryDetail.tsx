'use client'
import { useState } from 'react'
import YoutubeCard from './YoutubeCard'
import DayCard from './DayCard'
import type { Itinerary, ItineraryReview } from '@/lib/types'

type Tab = 'itinerary' | 'budget' | 'tips' | 'videos'

interface Props {
  itinerary: Itinerary & { itinerary_reviews: ItineraryReview[] }
}

export default function ItineraryDetail({ itinerary }: Props) {
  const [tab, setTab] = useState<Tab>('itinerary')
  const review = itinerary.itinerary_reviews?.[0]
  const { content, youtube_videos } = itinerary

  const tabs: { key: Tab; label: string }[] = [
    { key: 'itinerary', label: '📅 行程' },
    { key: 'budget', label: '💰 预算' },
    { key: 'tips', label: '💡 贴士' },
    { key: 'videos', label: '📹 视频' },
  ]

  return (
    <div>
      <div className="flex border-b border-slate-100 bg-white">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {tab === 'itinerary' && (
          <div className="space-y-3">
            <p className="text-slate-600 bg-indigo-50 p-4 rounded-xl">{content.summary}</p>
            {content.days.map((day, i) => (
              <DayCard key={i} day={day} index={i} defaultOpen={i === 0} />
            ))}
          </div>
        )}

        {tab === 'budget' && (
          <div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100">
                <th className="text-left text-xs text-slate-400 uppercase py-2">类别</th>
                <th className="text-right text-xs text-slate-400 uppercase py-2">计划金额</th>
                {review && <th className="text-right text-xs text-slate-400 uppercase py-2">实际金额</th>}
              </tr></thead>
              <tbody>
                {[
                  ['✈️ 交通', content.budget_breakdown.transport],
                  ['🏨 住宿', content.budget_breakdown.accommodation],
                  ['🍱 餐饮', content.budget_breakdown.food],
                  ['🎭 景点', content.budget_breakdown.tickets],
                  ['🛍️ 其他', content.budget_breakdown.misc],
                ].map(([label, amount]) => (
                  <tr key={label as string} className="border-b border-slate-50">
                    <td className="py-2.5 text-slate-700">{label}</td>
                    <td className="py-2.5 text-right text-slate-600">¥{(amount as number).toLocaleString()}</td>
                    {review && <td className="py-2.5 text-right text-slate-400">—</td>}
                  </tr>
                ))}
                <tr className="font-bold">
                  <td className="pt-3 text-slate-800">合计</td>
                  <td className="pt-3 text-right text-indigo-600">¥{itinerary.budget.toLocaleString()}</td>
                  {review && <td className="pt-3 text-right text-rose-500">¥{review.actual_budget.toLocaleString()}</td>}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {tab === 'tips' && (
          <ul className="space-y-3">
            {content.tips.map((tip, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-600">
                <span className="text-indigo-400 font-bold">#{i + 1}</span>
                {tip}
              </li>
            ))}
          </ul>
        )}

        {tab === 'videos' && (
          <div className="space-y-3">
            {youtube_videos.length > 0
              ? youtube_videos.map(v => <YoutubeCard key={v.id} video={v} />)
              : <p className="text-slate-400 text-sm">暂无相关视频</p>}
            <div className="mt-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">🔗 小红书参考</h4>
              {content.xhs_queries.map((q, i) => (
                <a key={i}
                  href={`https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(q)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-red-50 text-red-600 text-xs rounded-lg px-3 py-2 mb-2 hover:bg-red-100">
                  📌 搜索「{q}」
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
