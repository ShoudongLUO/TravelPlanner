import type { Itinerary } from '@/lib/types'

interface Props {
  itinerary: Itinerary
}

const BUDGET_LABELS: Array<[keyof Itinerary['content']['budget_breakdown'], string]> = [
  ['transport', '跨城交通'],
  ['local_transport', '本地交通'],
  ['accommodation', '住宿'],
  ['food', '餐饮'],
  ['tickets', '景点'],
  ['misc', '其他'],
]

export default function ItineraryPrintView({ itinerary }: Props) {
  const { content } = itinerary

  return (
    <div className="hidden print:block print-view">
      <header className="print-header">
        <h1 className="print-title">{itinerary.destination} · {itinerary.days} 天行程</h1>
        <p className="print-subtitle">
          {itinerary.departure_city} → {itinerary.destination} ·{' '}
          {itinerary.start_date} 出发 · {itinerary.travelers} 人 · 预算 ¥{itinerary.budget.toLocaleString()}
        </p>
        {content.summary && <p className="print-summary">{content.summary}</p>}
      </header>

      <section className="print-section print-days">
        <h2 className="print-h2">每日行程</h2>
        {content.days.map((day, i) => (
          <article key={i} className="print-day">
            <h3 className="print-day-title">Day {i + 1} · {day.title}</h3>
            {day.timeline?.length > 0 && (
              <ul className="print-timeline">
                {day.timeline.map((item, j) => (
                  <li key={j} className="print-timeline-item">
                    <span className="print-time">{item.time}</span>
                    <div className="print-timeline-body">
                      <div className="print-poi-name">
                        {item.name}
                        {item.name_en && item.name_en !== item.name && (
                          <span className="print-poi-en"> · {item.name_en}</span>
                        )}
                      </div>
                      <div className="print-poi-desc">{item.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="print-meals">
              {day.lunch && (
                <div className="print-meal">
                  <strong>☀️ 午餐</strong>：{day.lunch.name} · {day.lunch.price_range}
                  <span className="print-meal-detail"> · {day.lunch.location}</span>
                  <span className="print-full-only"> · {day.lunch.reason} · {day.lunch.dishes}</span>
                </div>
              )}
              {day.dinner && (
                <div className="print-meal">
                  <strong>🌙 晚餐</strong>：{day.dinner.name} · {day.dinner.price_range}
                  <span className="print-meal-detail"> · {day.dinner.location}</span>
                  <span className="print-full-only"> · {day.dinner.reason} · {day.dinner.dishes}</span>
                </div>
              )}
            </div>
            {day.daily_budget > 0 && (
              <div className="print-daily-budget">今日预算：¥{day.daily_budget.toLocaleString()}</div>
            )}
          </article>
        ))}
      </section>

      <section className="print-section print-full-only">
        {content.accommodations?.length > 0 && (
          <>
            <h2 className="print-h2">住宿推荐</h2>
            <ul className="print-accommodations">
              {content.accommodations.map((a, i) => (
                <li key={i}>
                  <strong>{a.area}</strong> · {a.price_range}
                  <div className="print-poi-desc">{a.description} — {a.vibe}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="print-section">
        <h2 className="print-h2">预算明细</h2>
        <table className="print-budget-table">
          <tbody>
            {BUDGET_LABELS.map(([key, label]) => (
              <tr key={key}>
                <td>{label}</td>
                <td className="print-amount">¥{(content.budget_breakdown[key] ?? 0).toLocaleString()}</td>
              </tr>
            ))}
            <tr className="print-budget-total">
              <td>合计</td>
              <td className="print-amount">¥{itinerary.budget.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h2 className="print-h2">实用贴士</h2>
        <ol className="print-tips">
          {content.tips.slice(0, 3).map((tip, i) => (
            <li key={i}>{tip}</li>
          ))}
          {content.tips.slice(3).map((tip, i) => (
            <li key={i + 3} className="print-full-only">{tip}</li>
          ))}
        </ol>
      </section>

      {content.xhs_queries?.length > 0 && (
        <section className="print-section print-full-only">
          <h2 className="print-h2">小红书搜索关键词</h2>
          <p className="print-xhs">{content.xhs_queries.join(' · ')}</p>
        </section>
      )}

      <footer className="print-footer">
        由 TravelAI 生成 · {new Date(itinerary.created_at).toLocaleDateString('zh-CN')}
      </footer>
    </div>
  )
}
