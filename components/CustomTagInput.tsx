'use client'
import { useState } from 'react'

interface CustomTagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export default function CustomTagInput({ tags, onChange, placeholder = '输入景点名称...' }: CustomTagInputProps) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const trimmed = input.trim()
    if (!trimmed) return
    if (tags.includes(trimmed)) {
      setInput('')
      return
    }
    onChange([...tags, trimmed])
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag))
  }

  return (
    <div className="border-2 border-slate-200 rounded-xl p-2 bg-slate-50 flex flex-wrap gap-1.5 items-center">
      {tags.map(tag => (
        <span
          key={tag}
          className="bg-amber-100 text-amber-800 text-xs font-semibold pl-2.5 pr-1 py-0.5 rounded-full flex items-center gap-1"
        >
          {tag}
          <button
            type="button"
            aria-label={`删除 ${tag}`}
            onClick={() => removeTag(tag)}
            className="bg-amber-200 hover:bg-amber-300 rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        className="bg-transparent outline-none text-sm flex-1 min-w-[120px] px-1"
        placeholder={placeholder}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            addTag()
          }
        }}
      />
    </div>
  )
}
