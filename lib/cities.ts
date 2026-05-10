export interface City {
  name: string
  nameEn: string
  country: string
  countryCode: string
}

export const CITIES: City[] = [
  // 中国
  { name: '北京', nameEn: 'Beijing', country: '中国', countryCode: 'cn' },
  { name: '上海', nameEn: 'Shanghai', country: '中国', countryCode: 'cn' },
  { name: '广州', nameEn: 'Guangzhou', country: '中国', countryCode: 'cn' },
  { name: '深圳', nameEn: 'Shenzhen', country: '中国', countryCode: 'cn' },
  { name: '成都', nameEn: 'Chengdu', country: '中国', countryCode: 'cn' },
  { name: '杭州', nameEn: 'Hangzhou', country: '中国', countryCode: 'cn' },
  { name: '西安', nameEn: "Xi'an", country: '中国', countryCode: 'cn' },
  { name: '重庆', nameEn: 'Chongqing', country: '中国', countryCode: 'cn' },
  { name: '南京', nameEn: 'Nanjing', country: '中国', countryCode: 'cn' },
  { name: '厦门', nameEn: 'Xiamen', country: '中国', countryCode: 'cn' },
  { name: '青岛', nameEn: 'Qingdao', country: '中国', countryCode: 'cn' },
  { name: '武汉', nameEn: 'Wuhan', country: '中国', countryCode: 'cn' },
  { name: '三亚', nameEn: 'Sanya', country: '中国', countryCode: 'cn' },
  // 日本
  { name: '东京', nameEn: 'Tokyo', country: '日本', countryCode: 'jp' },
  { name: '大阪', nameEn: 'Osaka', country: '日本', countryCode: 'jp' },
  { name: '京都', nameEn: 'Kyoto', country: '日本', countryCode: 'jp' },
  { name: '札幌', nameEn: 'Sapporo', country: '日本', countryCode: 'jp' },
  { name: '福冈', nameEn: 'Fukuoka', country: '日本', countryCode: 'jp' },
  { name: '冲绳', nameEn: 'Okinawa', country: '日本', countryCode: 'jp' },
  { name: '奈良', nameEn: 'Nara', country: '日本', countryCode: 'jp' },
  // 韩国
  { name: '首尔', nameEn: 'Seoul', country: '韩国', countryCode: 'kr' },
  { name: '釜山', nameEn: 'Busan', country: '韩国', countryCode: 'kr' },
  { name: '济州岛', nameEn: 'Jeju', country: '韩国', countryCode: 'kr' },
  // 东南亚
  { name: '曼谷', nameEn: 'Bangkok', country: '泰国', countryCode: 'th' },
  { name: '清迈', nameEn: 'Chiang Mai', country: '泰国', countryCode: 'th' },
  { name: '普吉岛', nameEn: 'Phuket', country: '泰国', countryCode: 'th' },
  { name: '新加坡', nameEn: 'Singapore', country: '新加坡', countryCode: 'sg' },
  { name: '吉隆坡', nameEn: 'Kuala Lumpur', country: '马来西亚', countryCode: 'my' },
  { name: '巴厘岛', nameEn: 'Bali', country: '印度尼西亚', countryCode: 'id' },
  { name: '雅加达', nameEn: 'Jakarta', country: '印度尼西亚', countryCode: 'id' },
  { name: '胡志明市', nameEn: 'Ho Chi Minh City', country: '越南', countryCode: 'vn' },
  { name: '河内', nameEn: 'Hanoi', country: '越南', countryCode: 'vn' },
  { name: '岘港', nameEn: 'Da Nang', country: '越南', countryCode: 'vn' },
  { name: '马尼拉', nameEn: 'Manila', country: '菲律宾', countryCode: 'ph' },
  { name: '宿务', nameEn: 'Cebu', country: '菲律宾', countryCode: 'ph' },
  // 欧洲
  { name: '巴黎', nameEn: 'Paris', country: '法国', countryCode: 'fr' },
  { name: '伦敦', nameEn: 'London', country: '英国', countryCode: 'gb' },
  { name: '罗马', nameEn: 'Rome', country: '意大利', countryCode: 'it' },
  { name: '米兰', nameEn: 'Milan', country: '意大利', countryCode: 'it' },
  { name: '巴塞罗那', nameEn: 'Barcelona', country: '西班牙', countryCode: 'es' },
  { name: '马德里', nameEn: 'Madrid', country: '西班牙', countryCode: 'es' },
  { name: '阿姆斯特丹', nameEn: 'Amsterdam', country: '荷兰', countryCode: 'nl' },
  { name: '维也纳', nameEn: 'Vienna', country: '奥地利', countryCode: 'at' },
  { name: '布拉格', nameEn: 'Prague', country: '捷克', countryCode: 'cz' },
  { name: '柏林', nameEn: 'Berlin', country: '德国', countryCode: 'de' },
  { name: '苏黎世', nameEn: 'Zurich', country: '瑞士', countryCode: 'ch' },
  { name: '伊斯坦布尔', nameEn: 'Istanbul', country: '土耳其', countryCode: 'tr' },
  { name: '雅典', nameEn: 'Athens', country: '希腊', countryCode: 'gr' },
  // 美洲
  { name: '纽约', nameEn: 'New York', country: '美国', countryCode: 'us' },
  { name: '洛杉矶', nameEn: 'Los Angeles', country: '美国', countryCode: 'us' },
  { name: '旧金山', nameEn: 'San Francisco', country: '美国', countryCode: 'us' },
  { name: '拉斯维加斯', nameEn: 'Las Vegas', country: '美国', countryCode: 'us' },
  { name: '温哥华', nameEn: 'Vancouver', country: '加拿大', countryCode: 'ca' },
  { name: '多伦多', nameEn: 'Toronto', country: '加拿大', countryCode: 'ca' },
  // 其他
  { name: '悉尼', nameEn: 'Sydney', country: '澳大利亚', countryCode: 'au' },
  { name: '墨尔本', nameEn: 'Melbourne', country: '澳大利亚', countryCode: 'au' },
  { name: '迪拜', nameEn: 'Dubai', country: '阿联酋', countryCode: 'ae' },
  { name: '开罗', nameEn: 'Cairo', country: '埃及', countryCode: 'eg' },
  { name: '马尔代夫', nameEn: 'Maldives', country: '马尔代夫', countryCode: 'mv' },
  { name: '夏威夷', nameEn: 'Hawaii', country: '美国', countryCode: 'us' },
]

export function filterCities(query: string): City[] {
  if (!query.trim()) return []
  const q = query.toLowerCase().trim()
  return CITIES
    .filter(c => c.name.includes(query) || c.nameEn.toLowerCase().includes(q))
    .slice(0, 5)
}
