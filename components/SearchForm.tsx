'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SearchForm() {
  const router = useRouter()
  const [form, setForm] = useState({ destination: '', start_date: '', days: '', budget: '' })

  const isValid = form.destination && form.start_date && Number(form.days) > 0 && Number(form.budget) > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams({
      destination: form.destination,
      start_date: form.start_date,
      days: form.days,
      budget: form.budget,
    })
    router.push(`/generate?${params}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl mx-auto">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">📍 目的地</label>
          <input
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-slate-50"
            placeholder="目的地（如：京都、巴黎）"
            value={form.destination}
            onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="start_date" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">📅 出发日期</label>
          <input
            id="start_date"
            type="date"
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-slate-50"
            value={form.start_date}
            onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="days" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">🌙 旅行天数</label>
          <input
            id="days"
            type="number"
            min={1}
            max={30}
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-slate-50"
            placeholder="天"
            value={form.days}
            onChange={e => setForm(f => ({ ...f, days: e.target.value }))}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label htmlFor="budget" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">💰 总预算（元）</label>
          <input
            id="budget"
            type="number"
            min={100}
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-slate-50"
            placeholder="¥"
            value={form.budget}
            onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!isValid}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all"
      >
        🚀 生成攻略 — 立即出发
      </button>
    </form>
  )
}
