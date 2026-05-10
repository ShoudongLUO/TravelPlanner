'use client'
import { useEffect, useState } from 'react'

interface WikiImage {
  url: string
  caption: string
}

interface AttractionModalProps {
  name: string
  name_en: string
  description: string
  onClose: () => void
}

export default function AttractionModal({ name, name_en, description, onClose }: AttractionModalProps) {
  const [images, setImages] = useState<WikiImage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/wiki-images?name=${encodeURIComponent(name_en)}`)
      .then(r => r.json())
      .then(data => {
        setImages(data.images ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [name_en])

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Photo area */}
        <div className="relative h-56 bg-slate-800 flex gap-0.5 overflow-hidden">
          {loading ? (
            <>
              <div className="flex-[2] animate-pulse bg-slate-700" />
              <div className="flex-1 flex flex-col gap-0.5">
                <div className="flex-1 animate-pulse bg-slate-600" />
                <div className="flex-1 animate-pulse bg-slate-700" />
              </div>
            </>
          ) : images.length > 0 ? (
            <>
              <img
                src={images[0].url}
                alt={images[0].caption}
                className="flex-[2] object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="flex-1 flex flex-col gap-0.5">
                {images.slice(1, 4).map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt={img.caption}
                    className="flex-1 object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ))}
              </div>
              <div className="absolute bottom-2 left-2 text-xs text-white/70 bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
                Wikipedia Commons
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700">
              <span className="text-5xl font-black text-white/30">{name[0]}</span>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 text-white text-sm flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <h2 className="text-xl font-extrabold text-slate-800 mb-3">{name}</h2>
          {description ? (
            <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
          ) : (
            <p className="text-sm text-slate-400">暂无详细描述</p>
          )}
        </div>
      </div>
    </div>
  )
}
