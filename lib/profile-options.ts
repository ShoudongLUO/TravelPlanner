export interface TagOption {
  value: string
  icon: string
  desc: string
}

export const TRAVEL_STYLES: TagOption[] = [
  { value: '文化深度', icon: '🏛', desc: '博物馆/历史古迹/在地文化' },
  { value: '美食爱好', icon: '🍱', desc: '探索当地餐厅和美食' },
  { value: '自然风光', icon: '🏔', desc: '山水/海滩/国家公园' },
  { value: '摄影爱好', icon: '📸', desc: '寻找最佳取景点' },
  { value: '夜生活', icon: '🍸', desc: '酒吧/演出/夜市' },
  { value: '购物休闲', icon: '🛍', desc: '商圈/特产/品牌' },
  { value: '亲子游', icon: '👨‍👩‍👧', desc: '适合带孩子的活动' },
]

export const PACE_OPTIONS: TagOption[] = [
  { value: '紧凑高效', icon: '⚡', desc: '一天 4-5 个景点，玩得多' },
  { value: '平衡', icon: '⚖️', desc: '一天 2-3 个景点，张弛有度' },
  { value: '慢节奏', icon: '🐢', desc: '一天 1-2 个景点，深度游' },
]

export const BUDGET_STYLES: TagOption[] = [
  { value: '经济实惠', icon: '💵', desc: '优先性价比，公共交通和小店' },
  { value: '平衡型', icon: '⚖️', desc: '舒适不奢华' },
  { value: '高端体验', icon: '💎', desc: '注重品质，高级餐厅和酒店' },
]

export const VALID_PACES = PACE_OPTIONS.map(p => p.value)
export const VALID_BUDGETS = BUDGET_STYLES.map(b => b.value)
