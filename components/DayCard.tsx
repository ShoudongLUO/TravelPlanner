'use client'
import { useState } from 'react'
import type { DayPlan, TimelineItem } from '@/lib/types'
import AttractionModal from './AttractionModal'

const COLORS = ['#667eea', '#11998e', '#f093fb', '#f5a623']

interface SelectedAttraction {
  name: string
  name_en: string
  description: string
}

interface DayCardProps {
  day: DayPlan
  index: number
  defaultOpen?: boolean
}

function findTimelineItem(day: DayPlan, name: string): TimelineItem | undefined {
  return day.timeline.find(t => t.name === name)
}

export default function DayCard({ day, index, defaultOpen = false }: DayCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [selected, setSelected] = useState<SelectedAttraction | null>(null)
  const color = COLORS[index % COLORS.length]

  return (
    <>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
        {/* Header */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
          style={{ borderLeft: `4px solid ${color}` }}
        >
          <span
            className="text-xs font-bold text-white px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: color }}
          >
            Day {index + 1}
          </span>
          <span className="font-bold text-slate-800 text-sm flex-1 text-left">{day.title}</span>
          <span
            className="text-slate-400 text-base flex-shrink-0 transition-transform duration-200"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            ⌄
          </span>
        </button>

        {/* Summary — always visible */}
        <div className="px-4 pb-3 pt-2 border-t border-slate-50">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(day.attractions ?? []).map((a, i) => {
              const matched = findTimelineItem(day, a)
              return (
                <span
                  key={i}
                  className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer hover:bg-indigo-100 transition-colors"
                  onClick={() => setSelected({
                    name: a,
                    name_en: matched?.name_en ?? a,
                    description: matched?.description ?? '',
                  })}
                >
                  {a}
                </span>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {day.lunch && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <span>☀️</span>
                <span className="font-semibold text-slate-700">{day.lunch.name}</span>
                <span>· {day.lunch.price_range}</span>
              </span>
            )}
            {day.dinner && (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <span>🌙</span>
                <span className="font-semibold text-slate-700">{day.dinner.name}</span>
                <span>· {day.dinner.price_range}</span>
              </span>
            )}
          </div>
        </div>

        {/* Expanded content */}
        {open && (
          <div className="border-t border-slate-100">
            {/* Timeline */}
            {(day.timeline ?? []).length > 0 && (
              <div className="px-4 py-4">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">今日行程</div>
                <div className="space-y-1">
                  {day.timeline.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-3 cursor-pointer hover:bg-slate-50 rounded-lg px-1 -mx-1 py-1.5 transition-colors"
                      onClick={() => setSelected({
                        name: item.name,
                        name_en: item.name_en,
                        description: item.description,
                      })}
                    >
                      <div className="text-xs text-slate-400 font-mono w-12 pt-0.5 flex-shrink-0">{item.time}</div>
                      <div className="flex-shrink-0 mt-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="text-sm font-semibold text-indigo-600 underline decoration-dotted underline-offset-2">{item.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lunch */}
            {day.lunch && (
              <div className="px-4 py-3 border-t border-slate-50">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">午餐推荐</div>
                <div className="bg-purple-50 rounded-xl p-3 border-l-4 border-purple-300">
                  <div className="font-bold text-purple-800 text-sm mb-1">{day.lunch.name}</div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <div><span>📍 </span><span>{day.lunch.location}</span></div>
                    <div><span>✨ </span><span>{day.lunch.reason}</span></div>
                    <div><span>🍽 </span><span>{day.lunch.dishes}</span></div>
                  </div>
                  <span className="inline-block mt-2 bg-purple-100 text-purple-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {day.lunch.price_range}
                  </span>
                </div>
              </div>
            )}

            {/* Dinner */}
            {day.dinner && (
              <div className="px-4 py-3 border-t border-slate-50">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">晚餐推荐</div>
                <div className="bg-rose-50 rounded-xl p-3 border-l-4 border-rose-300">
                  <div className="font-bold text-rose-800 text-sm mb-1">{day.dinner.name}</div>
                  <div className="space-y-0.5 text-xs text-slate-600">
                    <div><span>📍 </span><span>{day.dinner.location}</span></div>
                    <div><span>✨ </span><span>{day.dinner.reason}</span></div>
                    <div><span>🍽 </span><span>{day.dinner.dishes}</span></div>
                  </div>
                  <span className="inline-block mt-2 bg-rose-100 text-rose-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    {day.dinner.price_range}
                  </span>
                </div>
              </div>
            )}

            {/* Daily budget */}
            {day.daily_budget > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                <span className="text-xs text-slate-500">📊 今日预算小计</span>
                <span className="text-sm font-bold" style={{ color }}>
                  {`¥${day.daily_budget.toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AttractionModal */}
      {selected && (
        <AttractionModal
          name={selected.name}
          name_en={selected.name_en}
          description={selected.description}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
