'use client'
import { useEffect, useState } from 'react'
import {
  clearLLMConfig,
  getLLMConfig,
  setLLMConfig,
  type LLMConfig,
  type LLMProvider,
} from '@/lib/llmConfig'

interface Props {
  onClose: () => void
}

const DEFAULT_BASE_URLS: Record<string, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
}

export default function ApiKeyModal({ onClose }: Props) {
  const [provider, setProvider] = useState<LLMProvider>('gemini')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [listError, setListError] = useState<string | null>(null)
  const [listing, setListing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

  useEffect(() => {
    const cfg = getLLMConfig()
    if (cfg) {
      setProvider(cfg.provider)
      setApiKey(cfg.apiKey)
      setBaseUrl(cfg.baseUrl ?? '')
      setModel(cfg.model)
      setHasConfig(true)
    }
  }, [])

  const isReadyToList =
    apiKey.trim().length > 0 &&
    (provider === 'gemini' || baseUrl.trim().length > 0)

  const handleListModels = async () => {
    if (!isReadyToList) return
    setListing(true)
    setListError(null)
    try {
      const res = await fetch('/api/llm/models', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey.trim(),
          baseUrl: provider === 'openai_compat' ? baseUrl.trim() : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setListError(data.error ?? `list failed: ${res.status}`)
        setModels([])
        return
      }
      const ids: string[] = (data.models ?? []).map((m: { id: string }) => m.id)
      setModels(ids)
      if (ids.length === 0) setListError('未返回任何模型，请检查 Key 或 Base URL')
      else if (!ids.includes(model)) setModel(ids[0])
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'network error')
      setModels([])
    } finally {
      setListing(false)
    }
  }

  const isValidForSave =
    apiKey.trim().length > 0 &&
    model.trim().length > 0 &&
    (provider === 'gemini' || baseUrl.trim().length > 0)

  const handleSave = () => {
    if (!isValidForSave) return
    const cfg: LLMConfig = {
      provider,
      apiKey: apiKey.trim(),
      model: model.trim(),
      baseUrl: provider === 'openai_compat' ? baseUrl.trim() : undefined,
    }
    setLLMConfig(cfg)
    setHasConfig(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleClear = () => {
    clearLLMConfig()
    setApiKey('')
    setBaseUrl('')
    setModel('')
    setModels([])
    setHasConfig(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">🤖 配置自己的 AI 模型</h2>
            <p className="text-xs text-slate-500 mt-1">
              选 Provider → 填 Key → 拉模型列表 → 保存。
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg">✕</button>
        </div>

        <div className="bg-amber-50 text-amber-800 text-xs px-3 py-2 rounded-lg mb-4">
          🔒 配置只存浏览器 localStorage，不会发到我们的数据库。
        </div>

        {/* Provider */}
        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Provider</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => { setProvider('gemini'); setModels([]); setBaseUrl('') }}
            className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              provider === 'gemini'
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            ✨ Gemini
          </button>
          <button
            type="button"
            onClick={() => { setProvider('openai_compat'); setModels([]) }}
            className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
              provider === 'openai_compat'
                ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            🔌 OpenAI 兼容
          </button>
        </div>

        {provider === 'openai_compat' && (
          <>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              placeholder="如：https://api.deepseek.com/v1"
              className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none mb-1 font-mono"
              autoComplete="off"
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-1.5 mb-3">
              {Object.entries(DEFAULT_BASE_URLS).map(([name, url]) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setBaseUrl(url)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-full"
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}

        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
          className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none mb-3 font-mono"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Model */}
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">模型</label>
          <button
            type="button"
            onClick={handleListModels}
            disabled={!isReadyToList || listing}
            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-semibold hover:bg-indigo-100 disabled:opacity-40"
          >
            {listing ? '⏳ 拉取中...' : '🔄 拉取可用模型'}
          </button>
        </div>
        {models.length > 0 ? (
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none mb-1 bg-white"
          >
            {models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder={provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini'}
            className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none mb-1 font-mono"
            autoComplete="off"
            spellCheck={false}
          />
        )}
        <p className="text-xs text-slate-400 mb-1">
          {models.length > 0
            ? `共 ${models.length} 个可用模型`
            : '点上方按钮拉模型列表，或手动输入模型名'}
        </p>
        {listError && (
          <p className="text-xs text-rose-500 mb-2">⚠ {listError}</p>
        )}

        <p className="text-xs text-slate-400 mt-3 mb-3">
          {provider === 'gemini' ? (
            <>
              没 Key？去{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">Google AI Studio</a> 申请。
            </>
          ) : (
            <>
              支持任何 OpenAI 兼容服务：DeepSeek / Groq / OpenRouter / Ollama 本地等。
            </>
          )}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValidForSave}
            className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold py-2 rounded-xl text-sm disabled:opacity-40"
          >
            {saved ? '✓ 已保存' : '保存配置'}
          </button>
          {hasConfig && (
            <button
              type="button"
              onClick={handleClear}
              className="text-rose-500 text-sm font-semibold px-3 py-2 hover:bg-rose-50 rounded-xl"
            >
              清除
            </button>
          )}
        </div>

        {hasConfig && (
          <div className="mt-3 text-xs text-emerald-600 text-center">
            ✓ 已配置 — 生成将走 <strong>{provider}</strong> 的 <strong>{model || '(未选模型)'}</strong>
          </div>
        )}
      </div>
    </div>
  )
}
