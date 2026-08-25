---
name: openloop-panels-widget-authoring
description: OpenLoop panels Agent widget 编写指引（§13.2）：资源选择阶梯、33 个预设组件 kind+props 速查、custom code 契约、数据绑定写法与面板构图硬规则。调用 panel 工具前先读。
---

# OpenLoop Panels Agent widget 编写指引

用 `panel` 工具做**多 widget 的面板**（仪表盘/监控/汇总）。先读本 skill，再选资源，再写面板。

> **调用约定（重要）**：`panel` 参数**直接传 JSON 对象**（`{"$schema":"openloop.panel/v1","id":"...","title":"...","widgets":[...]}`），不要把它字符串化成一段 JSON 文本——对象形式有完整的结构引导，校验信息也更易自修正。

## 0. 资源选择阶梯（默认路由，优先用左边）

```
① 预设组件能表达 → 用预设（零成本车道：无 runtime、≈0 内存、原生换肤）
② 结构不够但无品牌要求 → token 化自定义（沙箱 + 桥接，仍跟随换肤）
③ 品牌强定制 / 复杂交互 / 指定 React 库 → 沙箱自由车道（付全价）
```

写 widget 前先自问：预设有没有？结构不够？品牌要求强不强？**能预设就别写代码。**

## 1. 面板构建通道（按复杂度选）

| 场景 | 通道 | 说明 |
|---|---|---|
| 小面板（≤3 个简单 widget） | 直传 panel 对象 | 一次工具调用 |
| **复杂面板（多 widget/图表/容器组合）** | **代码生成（主推）** | 见下，写代码比手写 JSON 快且不会踩契约坑 |
| 调试已有面板 JSON | panelFile | write/edit 文件后渲染 |

### 代码生成工作流（复杂面板首选，推荐所有面板）

本 skill 自带 Python 生成器库（openloop_panels），**契约内化到函数签名**——枚举/边界/容器规则在构造期校验，手写 JSON 会踩的坑（series 必填、tone 枚举、列 id、数字 values）在这里结构性不会发生：

1. write `gen_panel.py`（库路径 = 本 skill 目录下 `scripts/`）：

```python
import sys; sys.path.insert(0, "<skill_dir>/scripts")
from openloop_panels import Panel, grid, card, metrics, donut, gauge, funnel, heatmap, callout, heading, text

p = Panel("data-insights", title="数据洞察")
p.layout_grid(columns=2)
p.add(card(donut([("订阅", 62), ("定制", 38)], title="营收构成"), title="收入"))
p.add(card(gauge("完成率", 72, tone="info"), title="进度"))
p.add(metrics([("月营收", 48210, "+12.4%", "currency"), ("订单数", 1208, "-2.1%")]))
p.save("panels/data-insights.json")
```

2. bash 执行：`python3 gen_panel.py`
3. 渲染：`panel { "panelFile": "panels/data-insights.json" }`
4. 修改：编辑脚本重跑（或 read 生成的 JSON 局部改）

组合子速查（全部返回 widget dict，可直接嵌套）：
- `metrics([(label, value, delta?, fmt?)...], title=?)` 指标组（delta 自动推断涨跌色）
- `donut([(label, value)...])` / `bar(rows, [(key,label)...], x_key)` / `line(...)` 图表（series 契约自动内化）
- `gauge(label, 0-100)` / `funnel([(label, value, detail?)...])` / `heatmap(matrix, row_labels, col_labels)`
- `table([(key, label, align?)...], rows, title=?)` / `callout(text, tone=?, title=?)`
- `text(s)` / `heading(s)` / `badge(label, tone=?)` / `divider()`
- 容器：`card(children, title=?)`、`grid(children, columns=2)`、`stack(children)`（两层规则构造期强制：布局>分组>叶子）
- `Panel(id, title).add(widget)` → `.save(path)`；非法输入抛 `PanelBuildError`（中文消息带合法值）

### panelFile 通道（调试/微调 JSON 用）

write `panels/<id>.json`（单层编码无转义问题）→ `panel { "panelFile": "..." }`；修改 = read → 局部改 → write → 重渲染。优先级：panel > panelFile > load。

## 2. 预设组件速查（33 个已实现；未列出的 kind 尚未实现，勿用）

> props 均须过组件 schema（bounds 见各表）；容器 children 为子 widget 数组（每项 `{ id, source: { type: "preset", kind, props } }`，仅一层、不含容器）。
>
> **⚠️ children 必须放在 `props` 里面**（不是 source 的直接字段）：
> ```jsonc
> { "id": "main", "source": { "type": "preset", "kind": "stack",
>   "props": { "direction": "vertical", "gap": 16,
>     "children": [ { "id": "c1", "source": { "type": "preset", "kind": "heading", "props": { "text": "标题" } } } ] } } }
> ```
>
> **组合规则（两层有界）**：布局容器（stack/grid/row/split）的 children 可以是叶子组件**或分组容器（card/section）**；分组容器的 children 只能是叶子。布局不可嵌套布局。想要「每张图表带标题卡片进网格」用这个形态：
> ```jsonc
> { "id": "insights", "source": { "type": "preset", "kind": "grid",
>   "props": { "columns": 2, "children": [
>     { "id": "card-rev", "source": { "type": "preset", "kind": "card",
>       "props": { "title": "营收构成", "children": [
>         { "id": "donut", "source": { "type": "preset", "kind": "chart", "props": {
>           "variant": "donut", "xKey": "label",
>           "data": [ { "label": "订阅", "value": 62 }, { "label": "定制", "value": 38 } ],
>           "series": [ { "key": "value", "label": "营收占比" } ] } } } ] } } }
>   ] } } }
> ```

### 排版（7）

| kind | props | 要点 |
|---|---|---|
| `text` | `text` 必填(1–5000)；`size` xs/xl；`tone` default/muted/subtle/strong；`align` | 纯文本 |
| `heading` | `text` 必填(1–200)；`level` 1–4；`align` | 标题，映射全局字阶 |
| `badge` | `label` 必填(1–80)；`tone` neutral/primary/info/success/warning/error | 填充型徽标 |
| `tag` | `label` 必填(1–80)；`tone` 同上 | 描边型标签（透明底+色边框） |
| `divider` | `label` 可选(≤80) | 无 label=纯横线；有=分隔标题 |
| `avatar` | `name` 必填(1–80)；`size` sm/md/lg；`tone` 可选 | 取首字符圆形头像 |
| `markdown` | `content` 必填(1–10000) | 轻量 markdown（标题/列表/加粗/行内代码） |

### 容器（6）

| kind | props | 要点 |
|---|---|---|
| `card` | `title`(≤120) `description`(≤360) `children`(0–12) | 卡片容器 |
| `section` | `title`(≤120) `bordered` 默认 true；`children`(0–12) | 分区容器 |
| `stack` | `direction` vertical/horizontal；`gap` 0–48；`align`；`children` | 排布容器 |
| `grid` | `columns` 1–6；`gap` 0–48；`children` | 等宽网格 |
| `row` | `gap` 0–48；`align` 默认 center；`wrap`；`children` | 水平排布 |
| `split` | `gutter` 0–48；`children` 必填(1–2) | 两栏 50/50 |

### 数据（4）

| kind | props | 要点 |
|---|---|---|
| `metric-grid` | `title`(≤80)；`items` 必填(1–6，`{id,label,value,format,delta,deltaTone,emphasis}`) | **emphasis hero 至多 1 个**；deltaTone 用 up/down/flat；**format 仅 currency-cny（或别名 currency）/number/percent/text** |
| `data-table` | `columns`(1–12，`{key,label,align,format}`)；`rows`(≤200)；`density` | **数据驱动模式**：绑定扁平 API（如 GitHub repo）时**可不写 columns/rows**——resolved 字段自动成 Field/Value 表（≤24 字段） |
| `progress` | `label`(≤80)；`value` 必填(≥0)；`max` 默认 100；`tone` | value 超 max 按满格 |
| `sparkline` | `label`(≤80)；`value` 可选；`series` 必填(2–120 数值)；`extremes` | 手绘 SVG 迷你折线 |

### 反馈（2）

| kind | props | 要点 |
|---|---|---|
| `callout` | `tone` info/success/warning/error；`title`(≤80)；`description` 必填(≤240) | error 渲染 role="alert" |
| `accordion` | `title`(≤80)；`defaultOpenIndex`；`items` 必填(1–20，`{label,content}`) | 单开手风琴 |

### 本地后端（7）· 免注入——组件自己同源 fetch /openloop/app/*，无需 data 绑定

| kind | props | 要点 |
|---|---|---|
| `pb-stats` | `title`(≤80)；`autoRefreshMs`(10000–3600000) | PocketBase 门面运行状态：uptime / 集合计数 / 数据占用；dsh-app 未装显示占位 |
| `db-browser` | `collection`(初始表)；`perPage`(5–100 默认 20)；`title` | **交互态**：选库 + 关键词筛选 + 分页浏览门面管理表 |
| `storage-usage` | `title`；`autoRefreshMs` | DSH_HOME 磁盘占用分解（sessions/attachments/cache/data） |
| `api-credentials` | `title`；`autoRefreshMs` | 全部 API 资源凭据配置状态（configured 状态点，key 永不回显） |
| `sessions-stats` | `title`；`autoRefreshMs` | 会话总数/占用/按日柱状/最大占用 Top5 |
| `mcp-status` | `title`；`autoRefreshMs` | MCP 服务清单与连接状态（读 /openloop/mcp/servers） |
| `plugin-registry` | `title` | 已加载插件分组清单（OpenLoop/DeepSeek/其他；来自页面 boot 载荷，零请求） |

组合子：`pb_stats(title=..., auto_refresh_ms=...)` / `db_browser(collection=..., per_page=...)` / `storage_usage(...)` / `api_credentials(...)` / `sessions_stats(...)` / `mcp_status(...)` / `plugin_registry(title=...)`。
适用场景：用户问「后端/数据库/存储/凭据/会话/MCP/插件」的运行状况，或要一个本地系统的自省看板。

### 图表（4）

| kind | props | 要点 |
|---|---|---|
| `chart` | **`variant` bar/line/donut、`data`(1–100 行)、`series`(1–6 项，`{key,label}`) 三者必填**；`xKey`/`legend`/`referenceLine` | 手绘 SVG，chart-1..N 着色；data 行的数值字段名须与 series.key 对应 |
| `gauge` | `value` 必填(0–100)；`label`；`tone` | 弧形仪表，阈值色可选 |
| `funnel` | `stages` 必填(2–8，`{label,value}`) | 段宽按 value 比例，chart-seq 渐层 |
| `heatmap` | `matrix` 必填(≤10×10)；行列标签可选 | 值域映射 chart-seq 深浅 |

### 流程（3）

| kind | props | 要点 |
|---|---|---|
| `flow` | `nodes` 必填(2–12，`{id,label,detail,tone}`)；`edges` 必填(1–20，`{from,to,label}`) | 禁自环；边必须引用存在的节点；**tone 仅限 neutral/info/success/warning/error/danger**（不要借其他组件的 default/primary） |
| `timeline` | `items` 必填(2–16，`{id,title,detail,status,time}`) | status 限 past/current/future；省略时首项兜底 current |
| `comparison` | `columns` 必填(2–4，`{id,title,subtitle,recommended}`)；`rows` 必填(1–12，`{label,values,emphasis}`) | **列 id 必填且唯一**；推荐列 ≤1；每行 values 数必须等于列数；emphasis 仅 normal/strong；列聚焦为本地交互 |

**边界（不收）**：表单输入族（input/select/checkbox…）不在面板内使用——面板无输入回路。

## 3. custom code 契约（档 2/3，§8.3 权威定义）

`code` 是**一个 JSX 函数组件源码**：

```jsx
// 必须导出名为 Widget 的函数组件；可用参数：props（source.props）、data（§5.2 解析结果）、tokens（当前 token 快照）
function Widget({ props, data, tokens }) {
  return <div style={{ background: 'var(--openloop-surface)', borderRadius: 'var(--openloop-radius-md)' }}>
    {data.title}
  </div>
}
```

约束（契约层声明 + CSP 强制）：
- **禁**网络（fetch/XMLHttpRequest/WebSocket）、`import`/`require`、宿主 DOM 访问（`window.parent`/`top.`）、存储（localStorage/sessionStorage/document.cookie）、`eval`——命中即拒绝（≤32KB）
- **样式推荐 `var(--openloop-*)`**（档 2 跟随换肤，主推）；写死合法（档 3）但**代价：不随换肤，暗色可能不可读**
- 组件内交互限本地 state；不向宿主/模型回传

✅ 正例：消费 token 件套（背景+前景同进退，见 style-guide §3）；数据从 `data` prop 读，不自己取数。
❌ 反例：
```jsx
function Widget() {
  fetch('/api/x').then(...)          // ✗ 网络被禁（CSP connect-src 'none'）
  return <div style={{ color: '#111', background: '#fff' }}>…</div>  // ✗ 半 token 化，换预设必崩
}
function NotNamed({ data }) { … }    // ✗ 组件名必须叫 Widget
```

## 4. 数据绑定（§5.2，实时语义）

给 widget 加 `data` 字段；**api source 一律由 server 解析**（Node fetch，无 CORS 问题），结果经 props/桥注入，widget 永远不直接联网。

```jsonc
// static：直接给值
{ "id": "kpi", "source": { "type": "preset", "kind": "metric-grid", "props": { "items": [] } },
  "data": { "source": { "type": "static", "value": { "title": "…" } } } }
// api：url 必须 https:// 公网；支持 pick（a.b[0].c）
{ "id": "orders", "source": { "type": "preset", "kind": "data-table", "props": { "columns": [] } },
  "data": { "source": { "type": "api", "url": "https://api.example.com/orders" }, "pick": "items[0].total" },
            "refresh": { "intervalMs": 60000 } } }
```

规则：
- url **必须 `https://`**，禁环回/内网（SSRF 防护）；v1 禁凭据（Authorization 头、credentialRef）
- `timeoutMs` 默认 10s 上限 30s；响应 ≤1MB；仅接受 JSON
- `pick` 支持 `a.b[0].c` 形态，缺路径返回 undefined；缺省取整个响应。**pick 是 data 的字段（与 source 平级），不是 source 的字段**——放错位置会被静默忽略（取到整个响应）
- **预设组件的数据注入**：解析结果为 plain object 时**浅合并覆盖 props**（数据优先）——所以让 API 返回/用 pick 取出与组件 props 同形的对象（如 data-table 取 `{ columns, rows }`）；合并后仍要过组件 schema，越界会降级占位
- `refresh.intervalMs` 最小 10_000（不可见时自动暂停）；`manual` 默认 true（格角刷新按钮）；`onLoad: false` 可关打开即拉
- 扁平 JSON 绑定 data-table 可走数据驱动模式（免写 columns/rows，见速查）
- 扁平 JSON 绑定 data-table 可走数据驱动模式（免写 columns/rows，见速查）
- **实时语义：每次打开面板重新拉取**（D4 已放弃回放稳定承诺）；刷新失败保留旧快照 + stale 角标；无旧数据时渲染错误占位（带重试按钮）

## 4A. 持久化与复用（§11）

- `persist: true`（工具参数或面板字段）→ 面板存入当前工作区 `openloop-panels/<id>.json`
- **唤起**：再次调用 `panel` 工具时**只传 `load: "<id>"`**（不传 panel）→ 从存档读取、重新校验、重新拉取数据渲染；存档不存在会报错并提示先 persist
- **更新**：同 id 重新传完整 PanelDefinition 并 persist → 覆盖存档

## 5. 面板构图硬规则

- **单焦点**：一张面板一个主角——大数字/核心图（`emphasis: hero` 至多 1 个）；其余格子配角，视觉层级靠 token 而非字号堆叠
- **metric ≤ 6**：`metric-grid` 每格 items 1–6；面板内指标格总数不宜超过 6 个
- **勿为单句答案建面板**：一句话能说完的结论直接说；面板是「多 widget、可复用、需实时数据」时才建
- 构图阶梯：先主角 → 配角分区（section/card）→ 排布（stack/grid/split）→ 点缀（badge/tag/sparkline）
- 面板标题 ≤120 字、描述 ≤360 字；widget id kebab-case 且面板内唯一
