import type { GenerateRequest, ItineraryReview } from './types'

export function buildSystemPrompt(reviews: ItineraryReview[]): string {
  const base = `你是一位专业旅游规划师，请根据用户提供的出发城市、目的地、日期、天数和预算，生成一份详细的旅游攻略。

攻略必须包含以下内容，以 JSON 格式返回：
{
  "summary": "目的地概览（2-3句）",
  "days": [
    {
      "title": "Day N · 主题关键词",
      "attractions": ["景点A", "景点B", "景点C"],
      "timeline": [
        {
          "time": "09:00",
          "name": "景点或活动名称",
          "description": "详细说明，包含游览建议、门票价格、注意事项"
        }
      ],
      "lunch": {
        "name": "餐馆名称",
        "location": "相对于景点的位置描述",
        "reason": "推荐理由（特色、距离、氛围等）",
        "dishes": "2-3道推荐菜名",
        "price_range": "人均¥XX-XX"
      },
      "dinner": {
        "name": "餐馆名称",
        "location": "位置描述",
        "reason": "推荐理由",
        "dishes": "2-3道推荐菜名",
        "price_range": "人均¥XX-XX"
      },
      "daily_budget": 数字
    }
  ],
  "budget_breakdown": {
    "transport": 数字,
    "accommodation": 数字,
    "food": 数字,
    "tickets": 数字,
    "misc": 数字
  },
  "tips": ["实用贴士1", "贴士2", "贴士3"],
  "xhs_queries": ["小红书搜索关键词1", "关键词2"]
}

要求：
- 预算单位为人民币元，所有金额为整数
- budget_breakdown 各项之和应等于总预算
- attractions 列出当天主要景点名称（2-5个）
- timeline 按时间顺序排列，包含具体时间点
- lunch 和 dinner 各选一家餐馆，综合考虑位置便利性和特色
- 所有 daily_budget 之和应接近 budget_breakdown 中 food + tickets 的总和
- tips 至少 3 条，包含签证、最佳季节、注意事项等
- xhs_queries 提供 3 个小红书搜索词
- 只返回 JSON，不加任何其他文字`

  if (reviews.length === 0) return base

  const feedbackSection = reviews
    .slice(0, 3)
    .map((r, i) => `
反馈${i + 1}（评分 ${r.rating}/5，实际花费 ¥${r.actual_budget}）：
- 亮点：${r.highlights}
- 改进建议：${r.improvements}`)
    .join('\n')

  return `${base}

---
用户历史反馈（请参考以下内容优化行程安排和预算估算）：
${feedbackSection}`
}

export function buildUserPrompt(req: GenerateRequest): string {
  return `出发城市：${req.departure_city}
目的地：${req.destination}
出发日期：${req.start_date}
旅行天数：${req.days} 天
总预算：¥${req.budget} 元

请根据从 ${req.departure_city} 出发的实际情况：
1. 估算 ${req.departure_city}→${req.destination} 机票往返费用，纳入 transport 预算
2. 在 Day 1 安排从 ${req.departure_city} 出发的交通方式（直飞/中转/高铁等）
3. 如需中转，请在行程中标注中转城市

请生成详细旅游攻略。`
}
