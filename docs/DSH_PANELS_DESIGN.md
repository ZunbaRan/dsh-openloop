# DSH Panels 插件设计文档

> **状态**：**v0.2.6 · MVP 定版（2026-08-22）**——S0–S6 主线 + 补齐轮 + 真机验收全部完成：26 个预设组件、双车道渲染、数据对接（API/刷新/错误态/stale）、持久化双向、panelFile 文件通道、三层输入容错、服务端组件级校验（fail-closed）、三层安全（SSRF/禁词/CSP）、三个 skill。**真机验收 21 用例：headless 13 条全过 + web 实测通过-降级 1 条，浏览器视觉 8 条用户确认大体通过**（记录见 PANELS_ACCEPTANCE_PROMPTS.md 验收记录表）。412 tests，装入双 profile（web + headless）。
> **MVP 后续（已排期/已立项，不阻塞定版）**：①代码生成通道（Python builder API，已立项暂缓，见 PANELS_CODEGEN_DESIGN.md）②数据 reshape 缺口（扁平 JSON → data-table/chart，候选 data-table 自适应/binding.map）③14 个未实现 kind（契约合法、运行时占位）④pack 车道 esbuild 裸导入重写（§12.2）⑤onLoad 重复请求去重。
> **v0.2.x 修复轮（真机驱动，0.2.0–0.2.6）**：0.2.0 冻结 args 契约 + persist 双通道；0.2.2 宿主车道主题注入修复（vars 从未注入 DOM 的 S4 老 bug）+ skill 文档三处误导修正；0.2.3 currency 别名/children 错位防御/selection 对比对（vercel 深色聚焦列）；0.2.4 **两层容器组合**（布局→分组→叶子，结构性防递归）+ **服务端组件级校验**（此前 props 校验只在客户端占位、错误模型看不见——fail-open 缺口）；0.2.5 **panelFile 文件通道**（qwen 字符串化长 JSON 100% 崩坏的实证解法：write 文件单层编码 + read/改/write 迭代循环）；0.2.6 chart 三必填（variant/data/series）教学修正。
> **v0.1.x 修复轮**：0.1.2 验收阻断四项补齐（flow/timeline/comparison 移植/刷新编排/持久化唤起/错误态）；0.1.3 参数 schema 结构引导（type:'json' 空 schema 诱导字符串化事故——教训：任何工具参数都不该用无约束 schema）；0.1.4 declarative 退役覆盖核对（danger 别名 / mode:wide 死字段，panels 完全覆盖 declarative）。
> **日期**：2026-08-21（初版）/ 2026-08-22（MVP 定版）
> **读者**：实施本方案的 Agent / 开发者。本文档自包含，按 §2 决策记录 + §4–§13 的技术规范即可开工，无需回溯讨论历史。
> **范围**：在 `dsh-visual-plugins` monorepo 中新建 `packages/panels`（`@openloop/dsh-panels`），**不改动**现有 `@openloop/dsh-visual-declarative` 及其他包（theme 包的 token 扩充除外，见 §14）。

---

## 1. 背景与定位

### 1.1 三插件分层（既有格局，本设计不越界）

| 插件 | 承担面 | 感知度 | 数据/代码来源 |
|---|---|---|---|
| `@openloop/dsh-show-widget` | 流内小片段，一次性 | 用户低感知 | 模型输出 HTML 片段，opaque-origin 沙箱，禁网络 |
| **`@openloop/dsh-panels`（本设计）** | **widget 系统：组件级单元 → 组合成面板 → 持久化复用** | 用户明确感知 | 预设组件库 + 外部组件包 + Agent 自定义代码 + API 实时数据 |
| `@openloop/dsh-html-artifact` | 页面级/系统级独占画布 | 强感知（全屏） | 模型输出完整 HTML，沙箱 iframe，禁网络 |

分层分工：artifact 是页面级独占画布；panels 的沙箱单元是**面板里的一个格子**。三者按承担面错位，互不替代。

### 1.2 从 declarative 到什么

现有 declarative 是「bounded JSON 渲染器」：3 个组件 kind、8 套预设、零信任（模型只填数据）、回放稳定。本设计是一次**有意的范式升级**：

- 从「渲染器」到「widget 单元平台」：面板是最小交付物，widget 单元是最小组成粒度
- 从「零信任」到「双车道信任模型」：策展代码跑宿主、生成/外来代码跑沙箱（见 §4）
- 从「回放稳定」到「实时数据」（见 §10）
- declarative 包**保持现状不动**；panels 成熟后两者关系另行决策（退役/共存均不在本方案内）

---

## 2. 决策记录（已定案，实施中不得重开；变更需用户批准并回写本节）

| # | 决策 | 内容 |
|---|---|---|
| D1 | 独立新包 | 新建 `packages/panels`，不改 declarative |
| D2 | 双车道 | **宿主车道**＝策展代码（预设组件 + 审核过的外部包）；**沙箱车道**＝Agent 自定义代码 + React 19 外来库 + 不可信 HTML。车道按 widget 单元声明/推导，面板内可混合编排 |
| D3 | 自定义一律沙箱 | Agent 生成的代码**不**进宿主 React 树（修正早期「宿主内执行」设想）。宿主车道只跑我们策展的代码 |
| D4 | 实时数据 | 面板加载即拉取真实数据（非快照）；回放稳定承诺放弃；需加载/错误/刷新三态设计 |
| D5 | token opt-in 三档制 | 预设切换＝切 token。组件消费 `--openloop-*` 则跟随换肤（档 1 预设 / 档 2 token 化自定义），完全自写样式则不受控（档 3）。桥接协议见 §8.4 |
| D6 | token 词汇表扩充 | 46 → **61**：**预设系 50**（新增 foreground-subtle/strong、border-muted/strong）+ **全局系 11**（font-sans、type×5、space×5，不随预设变）。刻意不扩：状态色 8 级化、motion、z-index |
| D7 | 技术基座 | headless 行为原语 + `--openloop-*` token 样式层 + 主题桥接适配层。React 18 锁定（宿主给定）。**勘误（2026-08-21 搬运后核实）**：openchamber Native Kit 实际基于 **@base-ui/react**（+ cva/Slot）而非 Radix；panels 自建原语跟随搬运源用 Base UI 以减少改写摩擦，二者同属 headless 原语，外部包兼容面（D11 梯队 A）不受影响 |
| D8 | 预设组件库 | 6 大类 **40 个**（§6.1），复刻 shadcn 类结构、涂自家 token；openchamber Native Kit 源码为主要搬运源。明确不收表单输入族 |
| D9 | 资源服务 | 基础层＝**URL 资源服务**（非代码 API）：v1 作 panels server 模块，v2 视兄弟插件复用需求拆 `@openloop/dsh-visual-runtime` |
| D10 | 体积策略 | 传输层共享 hashed URL + immutable 缓存；编译层依赖 V8 同 URL 字节码缓存；内存层接受每沙箱格 2–5MB，v2 兜底为「同面板沙箱格合并单 iframe 多 root」 |
| D11 | 外部包兼容面 | 梯队 A（Radix/Base UI/React Aria/Ark/antd6/MUI9）直接可接；梯队 B（shadcn 源码改造/Chakra 预编译/Arco/Semi CSS 打包）构建时吸收；梯队 C（Appica/Mantine9/HeroUI3/Tamagui2，React 19 硬约束）走沙箱车道自带运行时 |
| D12 | skill 三件套 | ①预设风格开发指引（公共基础）②Agent widget 编写指引（运行时注入，含资源选择阶梯）③外部组件包接入指引（§13） |

### 2.1 资源选择阶梯（写进 Agent skill 的默认路由）

```
① 预设组件能表达 → 用预设（零成本车道：无 runtime、≈0 内存、原生换肤）
② 结构不够但无品牌要求 → token 化自定义（沙箱 + 桥接，仍跟随换肤）
③ 品牌强定制 / 复杂交互 / 指定 React 库 → 沙箱自由车道（付全价）
```

---

## 3. 术语

| 用语 | 含义 |
|---|---|
| **widget 单元** | 系统最小粒度。统一接口：来源 + props + 数据绑定 + 车道 + 刷新策略 |
| **面板（panel）** | widget 单元的组合容器 + 布局，可持久化、可复用、可再实例化 |
| **宿主车道** | widget 在 DSH 宿主 React 树内渲染（共享宿主 React 18 实例） |
| **沙箱车道** | widget 在 opaque-origin iframe 内渲染（自带运行时，经消息桥通信） |
| **预设系 token** | 随 8 套预设切换的 50 个变量（色板/圆角/阴影） |
| **全局系 token** | 不随预设变的 11 个变量（字体/字阶/间距） |
| **runtime 资产** | 沙箱车道共享的 JS/CSS 包（React 运行时、外来库），经本地 URL serve |
| **桥（bridge）** | 宿主 ↔ 沙箱 iframe 的 postMessage 协议（token 同步、数据推送、高度上报） |

---

## 4. 架构总览

```
┌────────────────────────── DSH 宿主（React 18）──────────────────────────┐
│  panel 工具调用 → PanelCard（toolview 渲染）                             │
│  ┌───────────────────── 面板容器（布局/持久化/刷新编排）───────────────┐ │
│  │ 宿主车道格子        │ 宿主车道格子        │ 沙箱车道格子            │ │
│  │ （预设组件）        │（外部包 React18）   │ iframe[opaque origin]   │ │
│  │ registry.resolve()  │ import(pack URL)    │ ├ runtime(共享URL)      │ │
│  │                     │                     │ ├ 自定义编译产物/19库    │ │
│  │                     │                     │ └ 桥：token/数据/高度    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│  useOpenLoopVisualTheme（theme 包，61 token）                            │
└─────────────────────────────────────────────────────────────────────────┘
        ▲ server 模块（cordis ctx）
        ├─ runtime 资产路由  /openloop/runtime/*.<hash>.js|css（immutable）
        ├─ pack 资产路由     /openloop/packs/<name>/<file>（esbuild 重写：批 4 待办，v0.1.x 未实现）
        ├─ 数据解析器        api source 服务端 fetch（10s 超时 / 1MB 上限）
        ├─ 自定义编译器      sucrase（服务端 JSX→JS，按 codeHash 缓存）
        └─ 面板存储          <workspaceRoot>/openloop-panels/*.json（ctx.fs + sandboxPolicy）
```

### 4.1 包结构

```
packages/panels/
├── package.json            # @openloop/dsh-panels@0.1.0
├── cordis.patch.yml
├── src/
│   ├── index.ts            # 服务端注册：tool、路由、存储、编译器
│   ├── contract.ts         # 全部契约类型（§5），client/server 共享
│   ├── tool.ts             # panel 工具定义与校验
│   ├── compiler.ts         # sucrase 自定义代码编译（服务端）
│   ├── datasource.ts       # api source 服务端解析（§10）
│   ├── store.ts            # 面板持久化读写（§11）
│   ├── assets.ts           # runtime/pack 资产路由（§9）
│   ├── sandbox/
│   │   ├── shell.ts        # srcDoc 模板 + CSP 生成（参照 artifact/src/shell.ts）
│   │   └── runtime-entry.* # 沙箱运行时入口（构建出 runtime 资产）
│   ├── presets/            # 预设组件库（§6），每组件一目录
│   │   ├── index.ts        # registry：kind → {schema, validate, render}
│   │   └── <kind>/
│   ├── client/
│   │   ├── index.tsx       # slots.inject toolview 注册
│   │   ├── PanelCard.tsx   # 面板容器（布局 + 编排）
│   │   ├── HostLane.tsx    # 宿主车道格子渲染
│   │   ├── SandboxLane.tsx # 沙箱车道格子（iframe + 桥）
│   │   └── bridge.ts       # postMessage 协议客户端侧
│   └── skills/             # 三个 skill（§13）
└── tests/
```

---

## 5. 数据契约（contract.ts 权威定义）

### 5.1 Widget 单元

```ts
export type JsonObject = Record<string, unknown>

/** 预设组件 kind，§6 全清单 */
export type PresetKind =
  | 'text' | 'markdown' | 'heading' | 'badge' | 'tag' | 'divider' | 'avatar'
  | 'card' | 'section' | 'stack' | 'grid' | 'row' | 'split' | 'scroll-area'
  | 'metric' | 'metric-grid' | 'data-table' | 'list' | 'key-value' | 'stat'
  | 'rating' | 'empty-state' | 'timeline'
  | 'chart' | 'sparkline' | 'gauge' | 'funnel' | 'heatmap'
  | 'flow' | 'comparison' | 'steps' | 'tree'
  | 'callout' | 'status' | 'progress' | 'skeleton'
  | 'tabs' | 'accordion' | 'pagination' | 'tooltip'

export type WidgetSource =
  | { type: 'preset'; kind: PresetKind; props: JsonObject }
  | { type: 'pack'; pack: string; component: string; props: JsonObject }
  | { type: 'custom'; code: string }  // JSX 函数组件源码，契约见 §8.3

export type Lane = 'host' | 'sandbox'

export interface WidgetUnit {
  /** 面板内唯一 id，kebab-case */
  id: string
  /** 缺省推导：preset→host；pack→按 manifest.runtime；custom→sandbox */
  lane?: Lane
  source: WidgetSource
  data?: WidgetDataBinding
  refresh?: RefreshPolicy
}

export interface RefreshPolicy {
  /** 面板打开时重新拉取，默认 true（D4 实时语义） */
  onLoad?: boolean
  /** 定时刷新间隔；缺省不定时。最小 10_000 */
  intervalMs?: number
  /** 渲染手动刷新按钮，默认 true（有 api 数据时） */
  manual?: boolean
}
```

### 5.2 数据绑定

```ts
export type WidgetDataSource =
  | { type: 'static'; value: unknown }
  | {
      type: 'api'
      url: string               // 必须 https?://，禁止内网/环回（见 §15）
      method?: 'GET' | 'POST'   // 默认 GET
      query?: Record<string, string>
      body?: unknown
      headers?: Record<string, string>  // v1 仅静态值；禁止 Authorization 明文 → 用 credentialRef
      credentialRef?: string    // 引用插件配置中的凭据名（v2 实现，v1 保留字段）
      timeoutMs?: number        // 默认 10_000，上限 30_000
    }

export interface WidgetDataBinding {
  source: WidgetDataSource
  /** JSONPath 子集取值路径（v1：仅 a.b[0].c 形态），缺省取整个响应 */
  pick?: string
}
```

**数据流铁律**：`api` source 一律由 **server 模块解析**（Node fetch，无浏览器 CORS 问题），解析结果作为 `data` prop 经宿主车道 props / 沙箱车道桥注入 widget。沙箱 iframe 的 CSP 恒为 `connect-src 'none'`——widget 代码永远不直接联网。

### 5.3 面板

```ts
export interface PanelDefinition {
  $schema: 'openloop.panel/v1'
  /** kebab-case；同 id 再调用 = 更新该面板 */
  id: string
  title: string                 // ≤ 120 字符
  description?: string          // ≤ 360 字符
  layout?: {
    mode: 'stack' | 'grid'      // 默认 stack
    columns?: 1 | 2 | 3         // grid 时有效，默认 2
  }
  widgets: WidgetUnit[]         // 1–24 个；id 唯一
  persist?: boolean             // true → 写盘（§11）
}

/** 工具返回的 meta（渲染入口） */
export interface PanelMeta {
  kind: 'openloop.panel'
  version: 1
  panel: PanelDefinition
  /** server 解析完成的数据快照：widgetId → data */
  resolved: Record<string, unknown>
  resolvedAt: string            // ISO 时间
}
```

### 5.4 校验规则（tool.ts 实现，fail-closed）

- 面板：title/description 长度上限；widgets 1–24；widget id 唯一且 kebab-case
- preset：`kind` 在白名单内；props 过该组件的 schema 校验（§6.3）
- pack：pack 名在已注册清单内；component 在该 pack manifest 的 components 内
- custom：`code` ≤ 32 KB；禁词静态扫描（`import`、`require`、`fetch`、`XMLHttpRequest`、`WebSocket`、`eval`、`document.cookie`、`localStorage`、`sessionStorage`、`window.parent`、`top.`）——命中即拒绝（纵深防御，CSP 是主防线）
- api source：URL 必须 `https://`（v1 一律拒绝 `http://`；如未来确需内网 http 数据源，另立显式开关并走配置项）；禁止环回/内网地址（127.0.0.0/8、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、169.254.0.0/16、`localhost`）——防 SSRF 打 DSH 自身与内网

---

## 6. 预设组件库（宿主车道的档 1 组件）

### 6.1 全清单（6 大类 40 个）

| 类 | kind | 批次 |
|---|---|---|
| 排版基础（7） | text · markdown · heading · badge · tag · divider · avatar | 批 2 |
| 容器布局（7） | card · section · stack · grid · row · split · scroll-area | 批 2 |
| 数据展示（9） | metric · metric-grid · data-table · list · key-value · stat · rating · empty-state · timeline | 批 1（timeline 从 declarative 移植改写） |
| 图表（5） | chart(bar/line/donut) · sparkline · gauge · funnel · heatmap | 批 3 |
| 流程关系（4） | flow · comparison · steps · tree | flow/comparison 批 1 移植；steps 批 1；tree 批 4 |
| 反馈交互（8） | callout · status · progress · skeleton · tabs · accordion · pagination · tooltip | 批 1/2 |

**边界（不收）**：表单输入族（input/select/checkbox/…）——静态面板无输入回路，属产品边界；真出现输入需求另立「宿主动作通道」专题。交互件的交互限**组件内本地态**（tabs 切换、accordion 展开、pagination 翻页）。

### 6.2 实现来源

- **结构/交互**：openchamber `packages/ui/src/components/interactive-ui/`（`NativeUIKit.tsx`、`nativeUIKitRegistry.ts`、`DeclarativeInteractiveView.tsx`）——Native Kit 基于 @base-ui/react + cva/Slot，本质是 headless 组件涂 OCIX token 的版本，直接搬运改写。**已搬运暂存**：`docs/_port-src/`（18 文件 + `PORT_MANIFEST.md`，含 node.type 34 个全集、依赖注记、token 概览）；对照 §6.1 清单，真缺仅 heading/tag/rating 3 个
- **样式**：全部改写为消费 `--openloop-*` token（内联样式，参照 declarative 的 `DeclarativeCard.tsx` 模式），禁止任何硬编码颜色/圆角/阴影
- **Radix**：交互原语可引入（peer 兼容 React 16.8–19），打包进客户端 bundle

### 6.3 每组件标准交付（验收清单）

1. `schema.ts`：props 的 JSON Schema（bounded：数量/长度上限）
2. `validate.ts`：校验函数（fail-closed，错误消息面向 Agent 可自修正）
3. `Render.tsx`：渲染器，样式 100% 来自 `var(--openloop-*)`
4. 测试：schema 边界用例 + 渲染快照（vitest）
5. skill 示例：写入「Agent widget 编写指引」的对应条目

### 6.4 schema 示例（metric-grid，供实现参照）

```json
{
  "type": "preset", "kind": "metric-grid",
  "props": {
    "items": [
      { "id": "rev", "label": "月营收", "value": 48210, "format": "currency-cny",
        "delta": "+12.4%", "deltaTone": "up", "emphasis": "hero" },
      { "id": "ord", "label": "订单数", "value": 1208, "delta": "-2.1%", "deltaTone": "down" }
    ]
  }
}
```

约束：items 1–6；label ≤ 40 字符；`emphasis: hero` 至多 1 个；`deltaTone: up|down|flat` 映射 `--openloop-delta-*`（**不**复用 success/error，涨跌与成败解耦）。

---

## 7. 宿主车道渲染器（HostLane.tsx）

```
WidgetUnit(source.type === 'preset')  → presets registry：kind → Render 组件
WidgetUnit(source.type === 'pack')    → pack 加载器：await import(packEntryUrl)（§12）
```

- 主题：`useOpenLoopVisualTheme(scope)`（theme 包既有 hook，§14 扩充后自动获得 61 token）
- 容器属性：`data-openloop-preset` / `data-openloop-appearance` 挂在面板根节点（与现有三插件一致）
- 预设组件交互 = 组件内 `useState` 本地态，不向宿主/模型回传
- 错误边界：每个格子独立 `ErrorBoundary`，单格崩溃渲染降级占位（kind + 错误首行），不拖垮面板

---

## 8. 沙箱车道（SandboxLane.tsx + sandbox/*）

### 8.1 iframe 模型

- `sandbox="allow-scripts"`（**不给** `allow-same-origin`）→ opaque origin
- `referrerPolicy="no-referrer"`
- 文档：`srcDoc` 由 server 侧 `shell.ts` 生成（**不复用 regex 注入**，永远用合成文档包装——消化 mcp-apps F2 教训）
- CSP（meta 下发，按 widget 生成）：

```
default-src 'none'
script-src  http://127.0.0.1:3080 'unsafe-inline'      # runtime URL（本地源）+ 内联编译产物
style-src   'unsafe-inline'                            # token 变量与组件样式均内联
connect-src 'none'                                     # 铁律：widget 不直连网络（§5.2）
img-src     data:
font-src    'none'
```

> 安全注记：从宿主源加载 runtime ≠ 获得宿主身份。iframe 保持 opaque origin，与宿主永不同源（消化 mcp-apps F1 教训：不做任何 hostname 翻转以外的同源冒险）。

### 8.2 沙箱运行时（runtime 资产）

两个运行时（构建产物，经 §9 路由 serve）：

| 资产 | 内容 | 用途 |
|---|---|---|
| `runtime.react18.<hash>.js` | React 18.3.1 + ReactDOM + 桥客户端 + token 应用器 + 数据接收器 | 自定义代码（默认） |
| `runtime.react19.<hash>.js`（批 4 再做） | React 19 + 指定外来库（如 Appica prebuilt） | 梯队 C 库 widget |

桥客户端职责：监听 `openloop:token-sync` / `openloop:data` 消息（校验 `type` + widget 级 `token` 字段），上报 `openloop:size-change`。

### 8.3 自定义代码契约（Agent 写什么的权威定义）

模型输出的 `code` 是**一个 JSX 函数组件源码**：

```jsx
// 必须导出名为 Widget 的函数组件；可用参数：props（source.props）、data（§5.2 解析结果）、tokens（当前 token 快照）
function Widget({ props, data, tokens }) {
  return <div style={{ background: 'var(--openloop-surface)', borderRadius: 'var(--openloop-radius-md)' }}>
    {data.title}
  </div>
}
```

- 编译：server 侧 `compiler.ts` 用 **sucrase**（`transforms: ['jsx']`，`jsxRuntime: 'classic'` 注入全局 React）→ ES2020；按 `sha256(code)` 缓存编译产物
- 沙箱全局注入：`React`、`ReactDOM`、挂载逻辑（`ReactDOM.createRoot(document.getElementById('root')).render(<Widget .../>)`）
- 禁止能力（契约层声明 + CSP 强制）：网络、import/require、宿主 DOM 访问、存储
- 样式约定：推荐 `var(--openloop-*)`（档 2 跟随换肤）；写死样式合法（档 3）但 skill 告知代价（§13）

### 8.4 桥协议（bridge.ts，全部带 `source`/`origin` 与 token 校验）

宿主 → iframe：

```ts
{ type: 'openloop:token-sync', token: string, tokenSchema: 2,
  preset: PresetId, appearance: 'light' | 'dark',
  global: Record<string, string>,   // 12 个全局系（仅 tokenSchema 升级或首帧必发）
  tokens: Record<string, string> }  // 50 个预设系（预设/明暗切换时重发）

{ type: 'openloop:data', token: string, widgetId: string, data: unknown, resolvedAt: string }
```

iframe → 宿主：

```ts
{ type: 'openloop:size-change', token: string, height: number }  // 宿主 clamp 360–1600
{ type: 'openloop:ready', token: string }
{ type: 'openloop:error', token: string, message: string }       // 宿主渲染错误占位
```

`token` 为每 widget 每渲染生成的随机值（参照 artifact 的 heightReporter token 模式），宿主侧校验来源与 token 匹配才接受消息。

### 8.5 高度与生命周期

- iframe 初始高 360；`size-change` 驱动调整，`clamp(360, 1600)`
- 数据刷新（§10）：宿主重新解析 → `openloop:data` 重推 → 沙箱内重渲染（**不重建 iframe**）
- 预设切换：宿主重发 `token-sync` → 沙箱内 `:root` 变量热更新

---

## 9. Runtime 资源服务（assets.ts）

- 注册：server 模块经 `ctx.webServer.register(...)`（`@deepseek-ai/dsh-host-webserver`，mcp-runtime 已用此通道）开路由
- 路由：
  - `/openloop/runtime/<name>.<contentHash>.js|css` → runtime 资产，`Cache-Control: public, max-age=31536000, immutable`
  - `/openloop/packs/<pack>/<path>` → pack 资产（§12），同缓存策略
- 体积三层策略（D10）：传输层共享 URL 一次下载；编译层 V8 同 URL 字节码缓存；内存层接受每格 2–5MB（v2 可选「同面板沙箱格合并单 iframe 多 root」，本版不实现）
- v2 拆分预留：当 show-widget/artifact 需要复用时，本模块平移为 `@openloop/dsh-visual-runtime` 独立插件，URL 不变、消费方零迁移

---

## 10. 数据对接（datasource.ts，server 侧）

```
解析时机：tool 执行时（首帧） + 刷新触发时（onLoad/interval/manual）
解析流程：校验 source（§5.4）→ fetch（timeout 10s 默认）→ 限 1MB → JSON 解析
        → pick 路径取值 → 写入 resolved[widgetId] → 推送（宿主 props / 沙箱桥）
失败语义：保留上一份成功数据 + 格子渲染 stale 标记；无旧数据 → 错误占位（含重试按钮，manual=true 时）
```

- 响应仅接受 JSON（`content-type` 含 `json` 或体可 JSON.parse）
- `intervalMs` 最小 10s；面板不可见（intersection observer）时暂停定时器
- v1 不支持凭据（`credentialRef` 保留字段，命中即报「v2 支持」错误）

---

## 11. 面板持久化（store.ts）

- 位置：`<workspaceRoot>/openloop-panels/<panelId>.json`——经 `ctx.fs` + `sandboxPolicy` seams 写入（相对路径 + cwd 回退链：sandboxPolicy.workspaceRoot 优先、session cwd 兜底，参照 artifact `src/index.ts` 的写法与 IMPL_NOTES §3）。**裁决（2026-08-21）**：存储跟随工作区而非 DSH_HOME profile——面板随项目复用，不跨项目串味；profile 级全局面板如未来需要另立机制
- 格式：`PanelDefinition` 全量 + `savedAt` + `pluginVersion`。**自包含快照**：custom code 内联保存；pack 引用记 `pack@version`
- 唤起：模型再次以同 `id` 调用 `panel` 工具 = 更新；`persist: true` 的面板在 tool 描述中告知模型可引用复用
- 降级：重放时 pack 缺失/版本不符 → 该格渲染「组件不可用」占位，其余格子正常（不允许整面板失败）
- 版本迁移：`$schema` 版本字段驱动；v1 无迁移逻辑

---

## 12. 外部组件包契约（packs）

### 12.1 pack manifest（包根 `dsh-pack.json`）

```json
{
  "name": "@acme/dsh-pack-fancy",
  "version": "0.1.0",
  "runtime": "react18",
  "entry": "dist/index.esm.js",
  "styles": "dist/index.css",
  "components": {
    "FancyCard": { "description": "…", "propsSchema": { "type": "object", "…": "…" } }
  }
}
```

### 12.2 硬性约束（写进 skill ③）

1. React 18 peer（`^18`）；`runtime: "react18"` 走宿主车道，`react19` 走沙箱车道（批 4）
2. 构建为 ESM；`react`/`react-dom` 必须 external——server 在 serve 时用 esbuild 将裸导入重写为 `/openloop/runtime/react18-esm.<hash>.js`（panels 提供该共享 ESM React）。**⚠️ v0.1.x 未实现**：当前无重写逻辑，pack 车道只能跑自包含 bundle（external react 的包会在浏览器端解析失败）——批 4 待办，接入前 pack 须把 react 打进 bundle
3. 样式：打进 CSS 文件随包 serve 或内联；**禁止全局 reset/Preflight**（manifest 校验+人工审核义务）
4. 网络：组件禁止自发 fetch（数据走 §5.2 绑定）；校验层做禁词扫描
5. token 合规：推荐消费 `var(--openloop-*)`（档 2）；antd/MUI 类自带主题系统的库，经桥接器映射（§12.3）

### 12.3 主题桥接器（批 4）

- antd 6：`ConfigProvider theme.token` ← 映射我们的 50 个预设系 token（`colorPrimary←--openloop-primary`、`borderRadius←--openloop-radius-md`…）
- MUI 9：`createTheme({ palette, shape })` ← 同理
- 映射是有损的（Appica 7 级前景 ← 我们 4 级），有损表收录在 skill ③

---

## 13. 三个 skill（src/skills/）

### 13.1 预设风格开发指引（公共基础，双受众）

- 61 token 词汇表（预设系 50 + 全局系 11）：名称、语义、何时用哪个
- 三档规则：档 1 全 token（预设组件）、档 2 结构自由 + 颜色圆角阴影用 token（**主推**）、档 3 全写死（合法但明暗自理）
- **半 token 化禁令**：成对属性（背景↔前景、边框↔底色）同进同退，违者换预设/切明暗必崩
- Appica 作为审美参照案例收录（角色化组织、密度、构图）

### 13.2 Agent widget 编写指引（运行时注入）

- 资源选择阶梯（§2.1 原文写死）
- 40 个预设组件的 kind + props 速查与示例（随批次更新）
- 自定义代码契约（§8.3）+ 正例/反例
- 数据绑定写法（§5.2）+ 实时语义说明（每次打开重新拉取）
- 面板构图指引：单焦点、metric ≤ 6、勿为单句答案建面板（借鉴 openchamber L3 构图硬规则）

### 13.3 外部组件包接入指引（开发者）

- manifest 契约（§12.1）+ 硬性约束（§12.2）
- 打包/注册/启用流程（pnpm 装入 profile → panels 配置声明 → 重启生效）
- 主题桥接器用法与有损映射表
- 验收清单（含「禁全局 reset」检查方法）

---

## 14. token v2 扩充执行（theme 包改动，唯一允许的既有包变更）

1. `packages/theme/src/presets.generated.ts`：8 预设 × 明暗各补 4 个预设系新值（foreground-subtle/strong、border-muted/strong）——值需策展（参照上游 `ocix-presets.css` 若有，否则按各预设对比度性格手工策展，落文档记录依据）
2. 新增全局系 11 个（`font-sans`、`type-display/title/label/meta/micro`、`space-1…5`）：全局唯一值，不随预设变；值取上游 `.ocix-type-display`（1.5rem/600/-0.02em/tabular-nums）与 DeclarativeCard 现写死值（18/13/12/11px）；已按 `docs/token-v2-values.md` 实施（theme 包，2026-08-21）
3. `useOpenLoopVisualTheme` 返回结构扩展为 `{ preset, appearance, values, global }`；现有三插件消费方零改动（新增字段为增量）
4. 更新 `sync-openloop-presets.mjs` 或改为手工维护（决策点：若上游无对应槽位则脱离生成，改为策展文件 + 注释说明）

---

## 15. 安全约束清单（测试必须覆盖）

| # | 约束 | 机制 |
|---|---|---|
| S1 | 沙箱 iframe 恒 opaque origin | `sandbox="allow-scripts"`，禁止 allow-same-origin |
| S2 | widget 代码不联网 | CSP `connect-src 'none'`；数据一律 server 解析 |
| S3 | SSRF 防护 | api URL 禁环回/内网段（§5.4） |
| S4 | 凭据不进模型 JSON | v1 禁凭据；v2 credentialRef 引用服务端配置 |
| S5 | CSP 注入不可绕过 | 合成文档包装（禁 regex 注入，F2 教训） |
| S6 | 宿主资源加载 ≠ 宿主身份 | runtime URL 仅入 `script-src`，iframe 不获同源身份（F1 教训） |
| S7 | 桥消息鉴权 | 每条消息带随机 token + source/origin 校验 |
| S8 | 自定义代码静态扫描 | 禁词表 fail-closed（§5.4），纵深防御 |
| S9 | 数据解析限额 | 10s 超时 / 1MB 上限 / 仅 JSON |
| S10 | 面板存储经 sandboxPolicy seams | 禁任意路径写 |

---

## 16. 测试与验收

- **实施参考文件（已就绪）**：`docs/_port-src/PORT_MANIFEST.md`（openchamber 搬运源码清单 + 依赖注记 + node.type 全集）、`docs/DSH_PANELS_IMPL_NOTES.md`（DSH 插件 webServer/tool/ctx.fs/toolview/skill 五种写法的权威示例与踩坑）
- **单测（vitest）**：契约校验（§5.4 全规则）、每预设组件 schema 边界、sucrase 编译、pick 路径、URL SSRF 表、桥消息鉴权
- **构建门禁**：`pnpm check`（typecheck + test + build 全包）
- **真机验收矩阵**（装入隔离 profile 后）：
  1. 预设面板：批 1 六件 + flow/comparison 渲染，8 预设 × 明暗切换无破版
  2. 自定义沙箱 widget：渲染、换肤跟随（档 2）、高度自适应、刷新
  3. 数据：静态/公开 API 两种 source，错误态与重试
  4. 持久化：保存 → 重启 DSH → 同 id 复用渲染
  5. 安全抽查：自定义代码写 `fetch` 被 CSP 拦（console 可见 violation）、SSRF URL 被拒
- 发布流程沿用：bump → check → `pnpm pack:all` → 装隔离 profile → 重启 → 真机双验证（仅 fixture 通过不算数）

---

## 17. 分批实施计划

| 批次 | 内容 | 退出标准 |
|---|---|---|
| **S0** | 包骨架 + contract.ts + tool 注册 + 最小 PanelCard（stack 布局、仅 preset 车道、placeholder 组件） | `panel` 工具端到端跑通 hello 面板 |
| **S1** | token v2 扩充（§14）+ 批 1 组件（metric-grid/data-table/progress/sparkline/callout/accordion + steps + flow/comparison 移植） | 真机验收矩阵 1 通过 |
| **S2** | 批 2 组件（排版 7 + 容器 7 中的 6）+ grid 布局 + 面板持久化（§11） | 验收矩阵 1 全量 + 矩阵 4 |
| **S3** | 沙箱车道全链路（shell/runtime.react18/sucrase 编译/桥协议/错误边界） | 验收矩阵 2 + 安全抽查 |
| **S4** | 数据对接（datasource + 三态 + 刷新编排）+ 三个 skill 成稿 | 验收矩阵 3 + skill 注入实测 |
| **S5** | 批 3 图表族（手绘 SVG 从 openchamber 移植） | 图表面板真机验收 |
| **S6** | 外部 pack 契约与加载器（§12.1/12.2，react18 车道）+ 桥接器（§12.3）+ runtime.react19 资产 | 一个真实 pack（示例包）端到端 |

依赖：S1→S2→S3→S4 串行主线；S5/S6 可并行于 S4 之后。每批走完发布流程再开下一批。

---

## 18. 开放问题（不阻塞 S0–S3）

| ID | 问题 | 默认倾向 |
|---|---|---|
| O1 | declarative 的 3 个 kind 在 panels 里是移植改写还是 re-export | 移植改写（统一新渲染器风格，declarative 保持不动） |
| O2 | 面板在对话流之外的「常驻展示位」（独立视图/侧栏） | v1 只做对话流内 toolview；常驻视图另立方案 |
| O3 | v2 凭据存储形态 | 插件配置文件 + credentialRef 引用 |
| O4 | 沙箱合并单 iframe（D10 内存层兜底）何时启用 | 实测面板 >6 沙箱格且卡顿再议 |
| O5 | pack 分发渠道（npm 公共/私有） | lab 期 file: tarball 安装 |
