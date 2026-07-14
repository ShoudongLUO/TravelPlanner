# 行程路线图设计

- 日期：2026-07-14
- 状态：已获用户确认
- 目标分支：`feature/itinerary-route-map`

## 目标

在 AI 日程生成完成后提供一个默认折叠的路线图。用户展开后可以按天查看，也可以查看整个行程；站内地图展示景点顺序连线，并可按天在 Google Maps 中打开真实导航。相同功能同时出现在生成完成页与已保存攻略详情页。

## 已确认的产品决策

- 路线图默认折叠，首次展开时才查询景点坐标。
- 支持 Day 1、Day 2……以及“全部行程”视图。
- 地图只包含 `day.attractions` 中的景点，不包含餐馆、酒店或非地点时间线事件。
- 站内地图使用编号标记和顺序连线；连线表达游览顺序，不声称是实际道路。
- 每个单日视图提供 Google Maps 路线链接，不需要 Google API Key。
- “全部行程”可能超过移动端 Google Maps 的中途点限制，因此完整路线只在站内展示；外部导航按天提供。
- 不修改 Supabase 数据库、攻略 JSON 结构或 LLM prompt，旧攻略保持兼容。

## 用户界面

路线图卡片放在日程卡片列表之后。

折叠状态显示：

- 地图图标与“行程路线图”标题。
- “按天浏览景点顺序，也可查看全部行程”说明。
- 展开箭头。

展开状态显示：

- Day 标签和“全部行程”标签。
- Leaflet/OpenStreetMap 地图。
- 按当前视图重新编号的景点标记。
- 单日视图使用对应日颜色；全部视图按天区分颜色。
- 景点顺序连线、定位成功数量和失败提示。
- 单日视图显示“在 Google Maps 打开”；全部视图显示按天导航入口。

地图模块采用动态导入并关闭 SSR，与现有足迹地图的实现方式保持一致。加载期间显示固定高度骨架，避免页面跳动。

## 组件边界

### `ItineraryRouteMap`

负责：

- 折叠与展开状态。
- 当前 Day / 全部行程选择。
- 从日程中提取、规范化和去重景点。
- 首次展开时启动按需地理编码。
- 读取和写入浏览器缓存。
- 加载、部分成功、完全失败等 UI 状态。
- 构造 Google Maps URL。

它接收 `ItineraryContent` 与 `destination`，不依赖保存状态或 Supabase。

### Leaflet 路线视图

负责：

- 渲染 OpenStreetMap 图层。
- 渲染编号标记和弹窗。
- 渲染单日或多日折线。
- 当视图或有效坐标变化时自动调整地图边界。

该组件不负责请求数据，以保持地图渲染与地理编码逻辑解耦。

### 路线工具函数

使用纯函数处理：

- 景点规范化与去重。
- 按日和全部视图筛选。
- Google Maps URL 编码。
- 坐标缓存键生成。

这些函数独立单元测试，不依赖 DOM 或 Leaflet。

## 地理编码数据流

1. 行程生成完成后渲染折叠卡片，不发起地理编码请求。
2. 用户首次展开。
3. 从 `day.attractions` 建立带 Day 与顺序信息的景点列表。
4. 以“景点名 + 目的地”为查询条件，先读取版本化浏览器缓存。
5. 对未命中的景点依次调用 `/api/geocode`，保持最多每秒一次。
6. API 返回 `display_name`、`city`、`country`、`country_code`、`lat` 与 `lng`。
7. 成功结果写入缓存并立即更新地图；失败结果记录为不可定位，但不阻断其他景点。
8. 切换 Day 或全部视图只筛选已有结果，不重复请求。

公开 Nominatim 服务要求不超过每秒一次请求、标识应用并缓存结果。当前 API 已提供应用 User-Agent；新实现必须保持串行查询并加入浏览器缓存。

## Google Maps 链接

单日视图按景点顺序生成 Maps URL：

- 第一个景点为 `origin`。
- 最后一个景点为 `destination`。
- 中间景点为 `waypoints`。
- 所有名称附加目的地并进行 URL 编码。
- 只有一个有效景点时使用搜索 URL，而不是路线 URL。

Google Maps URL 使用 `api=1`，不调用付费 Directions API，也不需要 API Key。

## 失败与降级

- API 返回非成功状态：该景点标记为失败，继续查询下一项。
- 部分景点失败：跳过失败景点画线，显示“已定位 X/Y 个景点”。
- 有效坐标少于两个：不渲染折线，保留可用标记和地点列表。
- 全部景点失败：用明确的空状态替代地图，并保留按天 Google Maps 搜索/路线入口。
- 缓存内容格式无效：忽略对应条目并重新查询。
- 组件卸载或折叠时避免在已卸载组件上更新状态；再次展开复用已获取结果。
- 地理编码失败不得影响攻略保存、详情浏览或其他页面功能。

## 预期文件

预计新增：

- `components/ItineraryRouteMap.tsx`
- `components/ItineraryRouteMapView.tsx`
- `lib/itinerary-route.ts`
- `__tests__/components/ItineraryRouteMap.test.tsx`
- `__tests__/lib/itinerary-route.test.ts`

预计修改：

- `app/api/geocode/route.ts`
- `components/ItineraryStream.tsx`
- `components/ItineraryDetail.tsx`
- `__tests__/api/geocode.test.ts`

最终实施时可根据 Next.js 16.2.6 的仓库内文档要求调整文件边界，但不得扩大产品范围。

## 测试与验证

自动化测试覆盖：

- `/api/geocode` 坐标字段映射与错误返回。
- 折叠状态不请求坐标，首次展开才请求。
- 浏览器缓存命中时不发请求。
- 查询串行执行并保持请求顺序。
- 景点按日提取、规范化、去重且保留顺序。
- Day / 全部行程切换。
- 部分定位失败和完全失败的降级 UI。
- Google Maps 搜索与路线 URL 的顺序和编码。
- 生成完成页和详情页都渲染路线图入口。

完成实现后运行：

```bash
npm test -- --runInBand
npm run lint
npm run build
```

还需人工检查桌面与窄屏下的折叠、展开、标签横向滚动、地图自动缩放和外部导航链接。

## 风险与非目标

- Nominatim 可能无法识别 AI 生成的别名；通过加入目的地、跳过失败项和 Google Maps 入口降级。
- 站内折线不是道路导航，不展示预计距离或时间。
- 本次不接入付费路线 API，不新增环境变量，不持久化坐标到 Supabase。
- 本次不将餐馆、酒店、跨城交通或任意 timeline 事件加入路线图。
- 本次不改变现有“我的足迹”地图。
