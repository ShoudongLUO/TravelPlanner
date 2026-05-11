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
          "name": "景点或活动名称（中文）",
          "name_en": "Attraction English Name",
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
    "local_transport": 数字,
    "accommodation": 数字,
    "food": 数字,
    "tickets": 数字,
    "misc": 数字
  },
  "accommodations": [
    {
      "area": "区域名（中文）",
      "description": "推荐理由（含距主要景点交通时长、特色）",
      "price_range": "¥XXX-XXX/晚",
      "vibe": "适合的人群和氛围"
    }
  ],
  "tips": ["实用贴士1", "贴士2", "贴士3"],
  "xhs_queries": ["小红书搜索关键词1", "关键词2"]
}

要求：
- 预算单位为人民币元，所有金额为整数
- budget_breakdown 各项之和应等于总预算
- attractions 列出当天主要景点名称（2-5个）
- timeline 按时间顺序排列，包含具体时间点
- timeline 中每个景点必须包含 name_en（Wikipedia 上的标准英文名称）
- lunch 和 dinner 各选一家餐馆，综合考虑位置便利性和特色
- 所有 daily_budget 之和应接近 budget_breakdown 中 food + tickets 的总和
- transport = 跨城交通（机票/高铁）
- local_transport = 本地公共交通（地铁/公交/打车/景点间往返），按每天 ¥50-150 估算
- accommodations 推荐 2-3 个适合的住宿区域，覆盖不同价位
- 每个 accommodations 项包含 area（区域名）、description（位置和便利性）、price_range（¥XXX-XXX/晚）、vibe（氛围）
- accommodation 预算项 = price_range 中位数 × 天数
- tips 至少 3 条，包含签证、最佳季节、注意事项等
- xhs_queries 提供 3 个小红书搜索词

**交通预算优化（重要）：**
- local_transport 必须考虑当地最优交通方案：
  - 比较「通票/卡」（如瑞士 Swiss Half Fare Card、东京地铁通票、欧铁通票、日票/周票）与「按次买票」的总花销
  - 选择 days × 单次费用 vs 通票费用，挑最便宜的方案
  - 在 tips 中明确说明所选方案、单人价格、天数适配性
- transport（跨城）必须考虑：
  - 经济舱往返机票 ×人数 + 机场往返交通
  - 如多人同行（≥3），可在 tips 提及打车/网约车的性价比
  - 含可参考的购票渠道和大致价位

**Cross-check 要求（重要）：**
- 生成完成后内部检查：tips 中提到的所有具体金额（含交通卡、门票、签证、专属服务等）必须已经在 budget_breakdown 对应类目中体现
- 如果发现某个 tips 中的费用超出 budget_breakdown 估算，将 budget 调高至能覆盖
- 例如：tips 写「半价卡 ¥960/人」时，local_transport ≥ 960 × travelers

**人数缩放（重要）：**
- accommodation = price_range 中位数 × 天数 × ceil(travelers / 2)（4人→2间房；2人→1间房；1人→1间房；3人→2间房）
- food 通常 × travelers（每人独立餐食）
- tickets 通常 × travelers（每人独立门票）
- daily_budget 也要按人数缩放

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
  const base = `出发城市：${req.departure_city}
目的地：${req.destination}
出发日期：${req.start_date}
旅行天数：${req.days} 天
👥 同行人数：${req.travelers} 人
总预算：¥${req.budget} 元（团队总预算，含 ${req.travelers} 人所有花费）

请根据从 ${req.departure_city} 出发的 ${req.travelers} 人团队实际情况：
1. 估算 ${req.departure_city}→${req.destination} 机票往返费用 × ${req.travelers}，纳入 transport 预算
2. 在 Day 1 安排从 ${req.departure_city} 出发的交通方式（直飞/中转/高铁等）
3. 如需中转，请在行程中标注中转城市
4. 行程安排按 ${req.travelers} 人团队的视角（餐馆人均消费 × 人数；住宿按 ceil(人数/2) 间房）

请生成详细旅游攻略。`

  if (!req.preferred_attractions || req.preferred_attractions.length === 0) {
    return base
  }

  const list = req.preferred_attractions.map(a => `- ${a}`).join('\n')
  return `${base}

用户特别想去以下景点，请确保它们都安排在行程中：
${list}

其余时间可推荐其他亮点。`
}
