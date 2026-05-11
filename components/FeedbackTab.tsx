'use client'
import type { ItineraryReview } from '@/lib/types'

interface FeedbackTabProps {
  review: ItineraryReview | null
  planned_budget: number
  onWriteFeedback: () => void
}

function BudgetComparison({ actual, planned }: { actual: number; planned: number }) {
  const diff = actual - planned
  const diffPercent = planned > 0 ? Math.round((diff / planned) * 100) : 0

  if (diff === 0) {
    return (
      <div className="text-sm text-slate-600">
        计划 <strong>¥{planned.toLocaleString()}</strong>
        <span className="mx-2 text-slate-400">→</span>
        实际 <strong>¥{actual.toLocaleString()}</strong>
        <div className="text-emerald-600 text-xs mt-1 font-semibold">✓ 精确符合预算</div>
      </div>
    )
  }

  const isOver = diff > 0
  const label = isOver ? '超支' : '节省'
  const color = isOver ? 'text-rose-600' : 'text-emerald-600'
  const sign = isOver ? '+' : ''

  return (
    <div className="text-sm text-slate-600">
      计划 <strong>¥{planned.toLocaleString()}</strong>
      <span className="mx-2 text-slate-400">→</span>
      实际 <strong>¥{actual.toLocaleString()}</strong>
      <div className={`${color} text-xs mt-1 font-semibold`}>
        {label} ¥{Math.abs(diff).toLocaleString()} ({sign}{diffPercent}%)
      </div>
    </div>
  )
}

export default function FeedbackTab({ review, planned_budget, onWriteFeedback }: FeedbackTabProps) {
  if (!review) {
    return (
      <div className="bg-slate-50 rounded-xl p-8 text-center">
        <div className="text-5xl mb-3">💭</div>
        <div className="text-base font-bold text-slate-800 mb-2">你还没有为这份攻略评分</div>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          评分能帮助 AI 在你下次生成同目的地攻略时<br />
          优先采纳你的亮点和改进意见
        </p>
        <button
          type="button"
          onClick={onWriteFeedback}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:shadow-lg transition-all"
        >
          ✍️ 写下你的反馈
        </button>
      </div>
    )
  }

  const stars = Array.from({ length: 5 }, (_, i) => (i < review.rating ? '⭐' : '☆')).join('')

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 rounded-xl p-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xl">{stars}</div>
          <div className="text-sm text-slate-600 mt-1">
            <strong className="text-amber-700">{review.rating} / 5</strong>
            <span className="text-slate-400 ml-3">📅 实际旅行：{review.visited_at}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={onWriteFeedback}
          className="text-indigo-600 border border-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50"
        >
          📝 修改
        </button>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">💰 预算对比</div>
        <BudgetComparison actual={review.actual_budget} planned={planned_budget} />
      </div>

      {review.highlights && (
        <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">✨ 旅行亮点</div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{review.highlights}</p>
        </div>
      )}

      {review.improvements && (
        <div className="bg-white border-2 border-slate-100 rounded-xl p-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">🔧 改进建议</div>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{review.improvements}</p>
        </div>
      )}

      <div className="text-center text-xs text-slate-400">
        提交于 {review.created_at.slice(0, 10)}
      </div>
    </div>
  )
}
