'use client'
import { useEffect, useState } from 'react'
import { clearUserApiKey, getUserApiKey, setUserApiKey } from '@/lib/userApiKey'

interface Props {
  onClose: () => void
}

export default function ApiKeyModal({ onClose }: Props) {
  const [value, setValue] = useState('')
  const [hasKey, setHasKey] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const existing = getUserApiKey()
    setHasKey(!!existing)
    setValue(existing ?? '')
  }, [])

  const handleSave = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    setUserApiKey(trimmed)
    setHasKey(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleClear = () => {
    clearUserApiKey()
    setValue('')
    setHasKey(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">🔑 个人 Gemini API Key</h2>
            <p className="text-xs text-slate-500 mt-1">
              用你自己的 key 生成攻略，不消耗平台共享额度。
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg"
          >
            ✕
          </button>
        </div>

        <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg mb-3">
          🔒 Key 只存在你的浏览器 localStorage，不会发到我们的数据库。
        </div>

        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
          API Key
        </label>
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="AIzaSy..."
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none mb-2 font-mono"
          autoComplete="off"
          spellCheck={false}
        />

        <p className="text-xs text-slate-400 mb-4">
          没 Key？去{' '}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 underline"
          >
            Google AI Studio
          </a>{' '}
          免费申请一把。
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!value.trim()}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-40"
          >
            {saved ? '✓ 已保存' : '保存'}
          </button>
          {hasKey && (
            <button
              type="button"
              onClick={handleClear}
              className="text-rose-500 text-sm font-semibold px-3 py-2 hover:bg-rose-50 rounded-xl"
            >
              清除
            </button>
          )}
        </div>

        {hasKey && (
          <div className="mt-3 text-xs text-emerald-600 text-center">
            ✓ 已配置自定义 Key — 后续生成将优先使用
          </div>
        )}
      </div>
    </div>
  )
}
