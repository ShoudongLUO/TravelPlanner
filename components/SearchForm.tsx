'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ApiKeyModal from './ApiKeyModal'
import LocationInput from './LocationInput'

const DEFAULT_DEPART = '07:00'
const DEFAULT_ARRIVE = '21:00'

export default function SearchForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    departure_city: '',
    destination: '',
    start_date: '',
    days: '',
    travelers: '2',
    budget: '',
    outbound_depart_time: DEFAULT_DEPART,
    outbound_arrive_time: DEFAULT_ARRIVE,
    return_depart_time: DEFAULT_DEPART,
    return_arrive_time: DEFAULT_ARRIVE,
  })
  const [timesOpen, setTimesOpen] = useState(false)
  const [apiKeyOpen, setApiKeyOpen] = useState(false)

  const isValid =
    form.departure_city &&
    form.destination &&
    form.start_date &&
    Number(form.days) > 0 &&
    Number(form.budget) > 0 &&
    Number(form.travelers) > 0 && Number(form.travelers) <= 10

  const navigate = (path: '/preferences' | '/generate') => {
    if (!isValid) return
    const params = new URLSearchParams({
      departure_city: form.departure_city,
      destination: form.destination,
      start_date: form.start_date,
      days: form.days,
      travelers: form.travelers,
      budget: form.budget,
      outbound_depart_time: form.outbound_depart_time,
      outbound_arrive_time: form.outbound_arrive_time,
      return_depart_time: form.return_depart_time,
      return_arrive_time: form.return_arrive_time,
    })
    router.push(`${path}?${params}`)
  }

  return (
    <>
    {apiKeyOpen && <ApiKeyModal onClose={() => setApiKeyOpen(false)} />}
    <form onSubmit={e => e.preventDefault()} className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-xl mx-auto">
      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <LocationInput
            id="departure_city"
            label="🛫 出发城市"
            placeholder="如：上海、北京"
            value={form.departure_city}
            onChange={v => setForm(f => ({ ...f, departure_city: v }))}
          />
        </div>
        <span className="text-slate-400 pb-2.5 text-lg flex-shrink-0">→</span>
        <div className="flex-1">
          <LocationInput
            id="destination"
            label="📍 目的地"
            placeholder="如：巴黎、京都"
            value={form.destination}
            onChange={v => setForm(f => ({ ...f, destination: v }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
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
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="travelers" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">👥 同行人数</label>
          <input
            id="travelers"
            type="number"
            min={1}
            max={10}
            className="border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none bg-slate-50"
            placeholder="人"
            value={form.travelers}
            onChange={e => setForm(f => ({ ...f, travelers: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="budget" className="text-xs font-semibold text-slate-400 uppercase tracking-wide">💰 总预算（团队总花费，元）</label>
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

      {/* Travel times (collapsible) */}
      <div className="mb-4 border-2 border-slate-100 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setTimesOpen(o => !o)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">✈️ 出发/到达时间（可选）</span>
          <span className="text-slate-400 text-sm">
            {form.outbound_depart_time} → {form.outbound_arrive_time}
            <span className="ml-2 inline-block transition-transform" style={{ transform: timesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>⌄</span>
          </span>
        </button>
        {timesOpen && (
          <div className="px-4 pb-4 pt-1 space-y-3 bg-slate-50">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-1.5">🛫 去程（Day 1）</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-0.5 text-xs text-slate-500">
                  从家出发
                  <input
                    type="time"
                    value={form.outbound_depart_time}
                    onChange={e => setForm(f => ({ ...f, outbound_depart_time: e.target.value }))}
                    className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-slate-500">
                  到达目的地
                  <input
                    type="time"
                    value={form.outbound_arrive_time}
                    onChange={e => setForm(f => ({ ...f, outbound_arrive_time: e.target.value }))}
                    className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 mb-1.5">🛬 返程（最后一天）</div>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-0.5 text-xs text-slate-500">
                  离开目的地
                  <input
                    type="time"
                    value={form.return_depart_time}
                    onChange={e => setForm(f => ({ ...f, return_depart_time: e.target.value }))}
                    className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-xs text-slate-500">
                  到家
                  <input
                    type="time"
                    value={form.return_arrive_time}
                    onChange={e => setForm(f => ({ ...f, return_arrive_time: e.target.value }))}
                    className="border-2 border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!isValid}
          onClick={() => navigate('/preferences')}
          className="col-span-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-all text-sm"
        >
          🎯 浏览景点偏好（推荐）
        </button>
        <button
          type="button"
          disabled={!isValid}
          onClick={() => navigate('/generate')}
          className="bg-slate-100 text-slate-600 font-semibold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 transition-colors text-sm"
        >
          ⚡ 直接生成
        </button>
      </div>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => setApiKeyOpen(true)}
          className="text-xs text-slate-400 hover:text-indigo-500 underline"
        >
          🔑 配置我的 API Key
        </button>
      </div>
    </form>
    </>
  )
}
