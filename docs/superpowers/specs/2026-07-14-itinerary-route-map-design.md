# 行程路线图设计

- 日期：2026-07-14
- 状态：已获用户确认，按独立审查意见修订
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
- 坐标首先通过行程已有的 `timeline.name_en` 批量查询 Wikipedia；没有 Wikipedia 坐标时才串行回退到 Nominatim，仍失败则跳过。
- 用户已明确接受公共 Nominatim 回退在多用户/多实例环境下无法严格保证应用全局 1 请求/秒；本功能按当前小规模项目实施尽力而为的串行回退，并在风险中明确记录。
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
- 从日程中提取景点 occurrence，并将其映射到去重的坐标查询目标。
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
- 将 attraction 与同日 timeline 的中英文名称保守匹配。
- 按日和全部视图筛选。
- Google Maps URL 编码。
- 坐标缓存键生成。

这些函数独立单元测试，不依赖 DOM 或 Leaflet。

## 景点与坐标数据模型

路线数据分成两层，避免“去重”破坏日程顺序：

- `occurrences`：每个 Day 中每次出现的景点，保留展示原文、Day、原始顺序和匹配到的 `timeline.name_en`。跨天重复景点不会删除。
- `locationTargets`：仅为减少外部请求而去重的坐标目标。优先键为规范化后的 Wikipedia 英文标题；没有英文匹配时使用“中文景点名 + 目的地”。

坐标结果映射回所有 occurrence。单日视图按 occurrence 顺序重新编号；全部视图为每一天绘制独立折线，不连接上一天的终点和下一天的起点。规范化只折叠首尾及连续空白并进行大小写比较，不改变展示原文。空白 attraction 会被过滤，也不计入“已定位 X/Y”的分母。

## 坐标查询数据流

1. 行程生成完成后渲染折叠卡片，不发起地理编码请求。
2. 用户首次展开。
3. 从 `day.attractions` 建立 occurrence，并与同日 `timeline[].name` 比较：优先采用唯一精确匹配；没有精确匹配时，仅当保守包含匹配也恰好只有一个结果，才采用该项的 `name_en`。零匹配或多个匹配都不猜测 Wikipedia 标题，直接进入 Nominatim 回退。
4. 读取版本化浏览器缓存。Wikipedia 与 Nominatim 使用独立命名空间：`wiki:<normalized-title>` 和 `nominatim:<normalized-attraction>|<normalized-destination>`。缓存 TTL 为 30 天，最多保留最近 300 个查询；过期、格式错误或越界坐标直接删除。
5. 将未命中且具有 `name_en` 的目标批量发送到 `/api/route-locations`。服务端使用 GET 调用 English Wikipedia Action API 的 `prop=coordinates`、`redirects=1`，每批最多 50 个标题，携带可识别 User-Agent，并通过 Next fetch cache 保存 30 天。
6. `/api/route-locations` 映射 normalized/redirect title，返回每个输入标题对应的有限数值型 `lat`、`lng`；缺页或无坐标返回 `null`，不使整批失败。
7. 对没有英文标题或 Wikipedia 返回 `null` 的目标，以“景点名 + 目的地”为查询条件，串行调用现有 `/api/geocode`，客户端调用间隔至少一秒。
8. `/api/geocode` 保留现有候选数组契约并为每个候选增加数值型 `lat`、`lng`；过滤 NaN、纬度越界和经度越界，客户端确定性选择首个候选。
9. 成功结果写入对应命名空间缓存并立即更新地图。确定性的“Wikipedia 无坐标”写入 `wiki:` 负缓存，但该状态只跳过后续 Wikipedia 查询，仍必须读取或调用 Nominatim；Nominatim 无结果写入 `nominatim:` 负缓存 24 小时。任一来源的超时、429 和 5xx 都不做负缓存。
10. 切换 Day 或全部视图只筛选已有结果，不重复请求。

公开 Nominatim 要求最多每秒一次、标识应用并缓存结果。本功能将它限制为 Wikipedia 失败后的低频回退，并使用串行调用、浏览器缓存、上游响应缓存和现有应用 User-Agent。客户端限流无法在多实例部署下提供严格的全局速率保证；用户在 2026-07-14 明确选择并接受这一小规模、尽力而为的回退限制。流量增长前必须换成可保证配额的地理编码服务、自托管 Nominatim，或增加共享队列与缓存。不得将本实现描述为高并发生产级 Nominatim 集成。

`/api/route-locations` 与 `/api/geocode` 都限制输入数量和查询长度，并为上游请求设置超时。上游 429 保留为可重试状态；其他 5xx 返回降级响应，不影响攻略页面。

## Google Maps 链接

单日视图按景点顺序生成 Maps URL：

- 第一个景点为 `origin`。
- 最后一个景点为 `destination`。
- 中间景点为 `waypoints`。
- 所有名称附加目的地并进行 URL 编码。
- 只有一个非空景点时使用搜索 URL，而不是路线 URL。
- 外链始终由原始非空 attraction 名称构造，与 Wikipedia/Nominatim 是否定位成功无关。
- 为兼容移动端最多 3 个 waypoints，每段最多包含 5 个停靠点（起点 + 3 个中途点 + 终点）。超过 5 个景点时按顺序分段，相邻段共享端点，并显示“第 1/2 段”等按钮，绝不静默截断。

Google Maps URL 使用 `api=1`，不调用付费 Directions API，也不需要 API Key。

## 失败与降级

- Wikipedia 批量请求失败：所有受影响目标进入 Nominatim 回退，不阻断页面。
- Nominatim 返回非成功状态：该景点标记为失败，继续查询下一项；429、5xx 和超时允许刷新页面或显式重试时再次请求。
- 部分景点失败：跳过失败景点画线，显示“已定位 X/Y 个景点”。
- 有效坐标少于两个：不渲染折线，保留可用标记和地点列表。
- 全部景点失败：用明确的空状态替代地图，并保留由原始景点名生成的按天 Google Maps 搜索/路线入口。
- 缓存内容格式无效：忽略对应条目并重新查询。
- 首次展开后即使再次折叠，已经开始的批次继续完成并缓存，折叠仅隐藏地图；组件卸载时通过 `AbortController` 取消上游请求并清理计时器。React Strict Mode 下用 ref 保证同一挂载周期只启动一次；再次展开复用结果。
- 路线图提供“重试失败地点”操作，只重试未成功且未被有效负缓存覆盖的目标。
- 地图动态加载失败时显示地点列表和 Google Maps 外链，攻略其他内容继续可用。
- 地理编码失败不得影响攻略保存、详情浏览或其他页面功能。

## 可访问性与第三方服务

- 折叠按钮使用 `aria-expanded` 与 `aria-controls`。
- Day 切换使用可键盘操作的 tab 语义和明确的选中状态。
- 外链在新窗口打开并使用 `rel="noopener noreferrer"`。
- Leaflet TileLayer 保留 OpenStreetMap attribution；展开地图会把用户 IP 和可见地图区域发送给 OSM tile 服务。
- 浏览器缓存只保存查询名称、坐标、来源和时间戳。共享浏览器可能保留用户查看过的地点，这是本地持久缓存的隐私权衡。

## 预期文件

预计新增：

- `components/ItineraryRouteMap.tsx`
- `components/ItineraryRouteMapView.tsx`
- `lib/itinerary-route.ts`
- `app/api/route-locations/route.ts`
- `__tests__/components/ItineraryRouteMap.test.tsx`
- `__tests__/lib/itinerary-route.test.ts`
- `__tests__/api/route-locations.test.ts`

预计修改：

- `app/api/geocode/route.ts`
- `components/ItineraryStream.tsx`
- `components/ItineraryDetail.tsx`
- `__tests__/api/geocode.test.ts`

最终实施时可根据 Next.js 16.2.6 的仓库内文档要求调整文件边界，但不得扩大产品范围。

## 测试与验证

自动化测试覆盖：

- Wikipedia 批量坐标的正常、redirect/normalized、缺页、无坐标、超时、429 与 5xx 映射。
- `/api/geocode` 坐标字段映射、有限值/范围校验、空查询、超长查询、无结果、超时、429 与 5xx。
- 折叠状态不请求坐标，首次展开才请求。
- 浏览器缓存命中时不发请求。
- Wikipedia 优先、Nominatim 回退、回退串行和重试行为。
- 命中 Wikipedia-null 缓存时仍读取或执行 Nominatim 回退；两个来源的缓存状态互不覆盖。
- 缓存 TTL、容量淘汰、有效负缓存与瞬时错误不负缓存。
- occurrence 保留跨天重复和原顺序，locationTarget 去重查询，结果正确映射回所有 occurrence。
- attraction 到 timeline 的唯一精确匹配、唯一包含匹配、零匹配与多重歧义匹配。
- Day / 全部行程切换；全部视图每天独立折线。
- 部分定位失败和完全失败的降级 UI。
- Google Maps 外链与坐标成功状态解耦；覆盖 1、2、5、6 个及更多景点的顺序、编码与分段。
- 快速展开—折叠—再展开、卸载、重试和 Strict Mode 不重复启动。
- 0 天、空 attractions、单日、重复景点、空 destination 和动态地图加载失败。
- 折叠按钮、tabs 和外链的无障碍属性。
- 生成完成页和详情页都渲染路线图入口。

完成实现后运行：

```bash
npm test -- --runInBand
npm run lint
npm run build
```

还需人工检查桌面与窄屏下的折叠、展开、标签横向滚动、地图自动缩放和外部导航链接。

## 风险与非目标

- Wikipedia 页面可能没有坐标，Nominatim 也可能无法识别 AI 生成的别名；通过三级降级和 Google Maps 原始名称入口处理。
- 公共 Nominatim 回退不具备跨多实例的严格全局限流保证，只适用于当前小规模使用；高并发部署前必须替换或增加共享限流基础设施。
- 站内折线不是道路导航，不展示预计距离或时间。
- 本次不接入付费路线 API，不新增环境变量，不持久化坐标到 Supabase。
- 本次不将餐馆、酒店、跨城交通或任意 timeline 事件加入路线图。
- 本次不改变现有“我的足迹”地图。
