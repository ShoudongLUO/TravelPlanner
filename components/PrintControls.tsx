'use client'
import { useEffect } from 'react'

type Mode = 'full' | 'compact'

function setPrintMode(mode: Mode) {
  document.documentElement.classList.remove('print-full', 'print-compact')
  document.documentElement.classList.add(`print-${mode}`)
}

function clearPrintMode() {
  document.documentElement.classList.remove('print-full', 'print-compact')
}

export default function PrintControls() {
  useEffect(() => {
    const handler = () => clearPrintMode()
    window.addEventListener('afterprint', handler)
    return () => window.removeEventListener('afterprint', handler)
  }, [])

  const triggerPrint = (mode: Mode) => {
    setPrintMode(mode)
    // small delay so the class change reflows the layout before the print dialog opens
    requestAnimationFrame(() => window.print())
  }

  return (
    <div className="flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => triggerPrint('full')}
        className="bg-white/20 text-white border border-white/40 hover:bg-white/30 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
        title="下载完整版 PDF"
      >
        🖨 完整 PDF
      </button>
      <button
        type="button"
        onClick={() => triggerPrint('compact')}
        className="bg-white/20 text-white border border-white/40 hover:bg-white/30 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
        title="下载精简版 PDF（适合随身携带）"
      >
        📋 精简 PDF
      </button>
    </div>
  )
}
