import SearchForm from '@/components/SearchForm'

const POPULAR = ['🗾 日本', '🇫🇷 欧洲', '🌴 东南亚', '🏔️ 国内']

export default function Home() {
  return (
    <div
      className="min-h-[calc(100vh-65px)] flex flex-col items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 40%, #f093fb 100%)' }}
    >
      <div className="relative z-10 text-center mb-8">
        <span className="inline-block bg-white/20 text-white text-sm px-4 py-1 rounded-full mb-4 backdrop-blur">
          ✨ AI 旅行规划师
        </span>
        <h1 className="text-4xl font-extrabold text-white mb-2">发现你的下一次旅行</h1>
        <p className="text-white/80">输入目的地、时间与预算，AI 为你生成专属攻略</p>
      </div>
      <SearchForm />
      <div className="flex gap-3 mt-6 flex-wrap justify-center">
        {POPULAR.map(tag => (
          <span key={tag} className="bg-white/20 text-white text-sm px-4 py-1.5 rounded-full border border-white/30 cursor-pointer hover:bg-white/30 transition-colors">
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}
