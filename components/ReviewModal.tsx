'use client'
import { useState } from 'react'

interface Props {
  itineraryId: string
  existingReview?: {
    id: string
    rating: number
    actual_budget: number
    highlights: string
    improvements: string
    visited_at: string
  }
  onClose: () => void
  onSaved: () => void
}

export default function ReviewModal({ itineraryId, existingReview, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    rating: existingReview?.rating ?? 0,
    actual_budget: existingReview?.actual_budget ?? '',
    highlights: existingReview?.highlights ?? '',
    improvements: existingReview?.improvements ?? '',
    visited_at: existingReview?.visited_at ?? '',
  })
  const [saving, setSaving] = useState(false)

  const isEdit = !!existingReview
  const isValid = form.rating > 0 && Number(form.actual_budget) > 0 && form.visited_at

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const url = `/api/itineraries/${itineraryId}/review`
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, actual_budget: Number(form.actual_budget) }),
    })
    if (res.ok) {
      onSaved()
      onClose()
    } else {
      alert('保存失败，请重试')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-5 text-white rounded-t-2xl">
          <h2 className="font-bold text-lg">✍️ 旅行后感受如何？</h2>
          <p className="text-sm opacity-90 mt-1">{isEdit ? '修改你的反馈' : '分享你的旅行体验'}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">整体评分</label>
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} type="button" onClick={() => setForm(f => ({ ...f, rating: n }))}
                  className={`text-2xl transition-transform hover:scale-110 ${n <= form.rating ? 'opacity-100' : 'opacity-30'}`}>
                  ⭐
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">实际花费（元）</label>
            <input type="number" min={1}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              placeholder="¥"
              value={form.actual_budget}
              onChange={e => setForm(f => ({ ...f, actual_budget: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">旅行日期</label>
            <input type="date"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-pink-400 focus:outline-none"
              value={form.visited_at}
              onChange={e => setForm(f => ({ ...f, visited_at: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">✨ 旅行亮点</label>
            <textarea rows={2}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-pink-400 focus:outline-none resize-none"
              placeholder="哪些地方超出预期？"
              value={form.highlights}
              onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">🔧 改进建议</label>
            <textarea rows={2}
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-pink-400 focus:outline-none resize-none"
              placeholder="哪些安排需要调整？"
              value={form.improvements}
              onChange={e => setForm(f => ({ ...f, improvements: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border-2 border-slate-200 text-slate-500 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50">
              取消
            </button>
            <button type="submit" disabled={!isValid || saving}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl py-2.5 text-sm font-bold disabled:opacity-40">
              {saving ? '保存中...' : '📬 提交反馈'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
