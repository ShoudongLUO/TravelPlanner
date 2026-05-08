import type { YoutubeVideo } from '@/lib/types'

export default function YoutubeCard({ video }: { video: YoutubeVideo }) {
  return (
    <a href={video.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-2 bg-white rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow">
      <img src={video.thumbnail} alt={video.title} className="w-16 h-12 object-cover rounded" />
      <p className="text-xs text-slate-600 line-clamp-2 flex-1">{video.title}</p>
    </a>
  )
}
