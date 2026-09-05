# Canvas-in-Sidebar · canvas 工作台迁移架构（对话流 → 右侧推出栏）

> **版本**：v0.1（2026-09-05，用户拍板方向）
> **动机**：canvas 标注交互在对话流 toolview 容器里反复受挫（三轮修复未能达标杆）——
> 根因是**试图在受限容器 + 全蒙层架构里做精准交互**。迁移到右侧推出栏（canvas
> 工作台 = 我们的 React 树主场）后，标注按 design-comments 的「元素 pin」范式重做。
> **用户拍板**：canvas 不运行在对话流里，运行在右侧 sidebar（类似 dock 推出栏）。

---

## 1. 核心语义：canvas 的「双形态」

| 形态 | 位置 | 职责 | 生命周期 |
|---|---|---|---|
| **入口/快照卡片** | 对话流 toolview | 渲染画布快照（回放定格）、一键「在工作台打开」 | 随 meta 持久化（不可变） |
| **画布工作台（真身）** | 右侧推出栏（dock 第三 tab） | 渲染最新画布 + **标注交互主场** + 评论面板 | 随 storage（可迭代） |

```
你: "画一个部署看板"
  → Agent 调 canvas 工具 → 对话流出现入口卡片（快照）
  → 你点卡片右上「⇱ 工作台打开」
  → dock 展开 + 切到「画布」tab + 定位该画布（真身，可标注/迭代）
```

**关键**：入口卡片和工作台是**同一个 canvasId 的两副面孔**——卡片是快照（历史定格），工作台是真身（storage 最新版，标注/迭代的对象）。

## 2. 集成形态：canvas dock = 与 board 平级的独立第二推出面板

**用户拍板（2026-09-05，修正原「dock 第三 tab」方案）**：canvas dock 是**独立的第二个右侧推出面板**（与 better-sidebar / openloop board 并列），toggle icon 在 board toggle **左侧**，展开/推出机制**照抄 bsb/board 已验证的那套**（「前二者是已经精心开发并且验证过的」）。不做 dock 第三 tab——独立面板与「qoder-canvas 独立插件不融入 openloop」的原始定位一致。

### 2.1 三列共存的空间模型

```
┌─ 内容区 ─┬─ canvas dock ─┬─ openloop board ─┬─ better-sidebar ─┐
           (最靠内容)      (bsb 左)           (最右)
```
toggle 镜像：内容 ← canvas toggle ← board toggle ← bsb 区

### 2.2 挤压协调（唯一的跨包协调点，声明式零运行时依赖）

| 面板 | 占用变量 | 谁设 | 位置（right edge） |
|---|---|---|---|
| bsb | `--dsh-sidebar-width` | bsb（frame 原生 padding 承担，不进 margin） | right: 0 |
| board | `--openloop-dock-width` | dock | right: bsbWidth |
| canvas dock | `--openloop-canvas-width`（新） | qoder-canvas | right: bsbWidth + boardWidth |

**挤压规则（board 做总管）**：dock 的 DockHost 规则改为
`#root { margin-right: calc(var(--openloop-dock-width, 0px) + var(--openloop-canvas-width, 0px)); width: calc(100% - 同上) }`
——无 canvas 插件时 `--openloop-canvas-width` 未定义 fallback 0px，规则退化为只含 board（**向后兼容**）。canvas 插件**只设自己的变量、不写规则**（避免两条规则打架）。

**toggle 定位**：
- board toggle：`right = bsbWidth + 10`（board 关时）/ 隐藏（board 开时）
- canvas toggle：`right = bsbWidth + boardWidth + 46`（46 = board toggle 宽 28 + 间距 8 + board toggle 右边距 10）——永远贴「bsb+board 占用区」左边，board 开时在 board 面板左边，不跳变

### 2.3 canvas dock 面板（qoder-canvas 包内，复刻 DockHost 机制）

- host div：body 直挂 + MutationObserver 保活（复刻 DockHost）
- 推出面板：fixed top:0 bottom:0，`right = bsbWidth + boardWidth`（双变量 500ms 探测），width 0↔W 过渡
- 挤压：设 `--openloop-canvas-width`（见 §2.2）
- 左缘拖宽手柄 + 宽度过渡（复刻 DockHost）
- toggle：fixed top:38（与 board toggle 同高），right 见 §2.2
- 内容：CanvasWorkbench（画布列表 + CanvasSurface + 元素 pin + 评论面板）

### 2.4 canvas 插件侧：入口卡片改造

```ts
// canvas client 半（index.tsx）
export function apply(ctx: ClientContext): void {
  // ① 注册 toolview 入口卡片（职责降级为快照/回放/打开入口）
  ctx.slots.inject('tool.call.toolview', () => ctx.slots.register(
    { name: 'tool.call.toolview', key: 'canvas' }, CanvasEntryCard,
  ))
  // ② 挂 canvas dock（推出面板 + toggle + 工作台）
  mountCanvasDock()  // CanvasDockHost + CanvasToggle + CanvasWorkbench
}
```

**入口卡片 CanvasEntryCard**（现 CanvasCard 瘦身）：
- 保留：CanvasSurface 快照渲染（回放/定格，只读）
- 删除：全部标注交互（AnnotationOverlay 退出对话流）
- 新增：头部右侧「⇱ 工作台」按钮 → canvas dock 展开 + 定位该画布（经 window 事件桥 `__openloopCanvasOpen(canvasId)`）

## 3. 标注范式：design-comments 元素 pin（不做蒙层）

这是与对话流版（v0.2-0.3）的**架构级决裂**——不做盖层蒙布，做**元素侧 pin**：

```
┌─ 画布区（CanvasSurface 同渲染） ──────────┐  ┌─ 评论面板（右侧栏内分栏） ─┐
│  [QPS 1200 ①]  [图表 ①②]                 │  │ 全部注释（7）              │
│   ↓ hover → outline（检查器感）            │  │ ┌────────────────────────┐ │
│   ↓ 点击 → 实线高亮 + 元素 pin 亮起        │  │ │ [n1 QPS] 错误率过时了   │ │
│        + 评论面板自动定位该元素注释        │  │ │        改成今天的 ✎🗑   │ │
│        + 元素旁浮「💬 评论」按钮           │  │ ├────────────────────────┤ │
│  [表格]                                   │  │ │ [n2 图表] 趋势改 14 天  │ │
│                                           │  │ │        ──────────────   │ │
└───────────────────────────────────────────┘  │ │ + 新评论（点画布元素添加）│ │
                                                └────────────────────────┘ │
```

**交互**：
1. **点选**：画布区点元素 → 元素实线高亮 + pin 亮起 + 评论面板滚动定位到该元素注释区 + 元素旁浮「💬 评论」小按钮
2. **框选**：拖框 → 松手直接弹评注框（沿用 v0.3.1 的框选收集，已验证）→ targets 多 pin
3. **文本**：选中文本 → 选区末端弹评注框（节选进 targets）
4. **评论面板**：右侧栏内分栏（画布区 | 评论面板），所有注释按元素分组列表 + 新建/编辑/删除
5. **保存**：草稿注入 composer（引用头+评注）+ 元素 pin 持久化（localStorage，v0.3 已有）

**与对话流版的关键差异**：评论不再挤在画布浮动小框里，而是**右侧栏常驻面板**（空间从容，评论列表/输入/历史分层清晰）；画布上只有 pin 和高亮，零蒙层。

## 4. 数据流

```
Agent 调 canvas 工具
  → host: storage 写不可变快照（cv_id/<rev>.json）+ meta 内嵌快照
  → 对话流入口卡片：读 meta.canvas 渲染快照（定格，只读）
  → 工作台打开：client 从 host 私有端点拉 storage 最新快照（cv_id 定位）
       ↳ 需新增 GET /qoder-canvas/canvas/:id（只读端点，webServer 运行时注入）
  → 标注：localStorage 持久化（canvasAnnotations store，v0.3 已有）
  → 迭代：Agent 续编 → 工作台轮询/事件刷新到最新 rev
```

**快照 vs 真身**：入口卡片=meta 定格快照（历史回放）；工作台=storage 最新（标注/迭代的活对象）。canvasId 是两者的关联键。

## 5. 与 openloop 的边界与复用

| 关注点 | 归属 |
|---|---|
| 推出栏机制/宽度/bsb 共存/tab 导航 | dock（复用全套，零新造） |
| canvas 工具/DSL/storage/快照 | qoder-canvas（不变） |
| 对话流入口卡片 | qoder-canvas（瘦身：删标注） |
| 工作台 tab 渲染 + 评论面板 | qoder-canvas（新建，经 registerTab 注入） |
| 元素 pin + 高亮 + 框选 | qoder-canvas（v0.3 几何法保留，去掉蒙层） |
| 跨插件桥 | `__openloopDockService.registerTab/openTab`（window 直通桥，与 pinPanel 同款） |

**明确不做**：独立第二推出栏；对话流内标注；dock 的 board/APP 逻辑改动（canvas tab 是纯增量）。

## 6. 里程碑

| 阶段 | 内容 | 验收 |
|---|---|---|
| **S1** | dock tab 注册能力（registerTab/openTab）+ rail 三 tab | 空 canvas tab 能从 rail 切换 |
| **S2** | canvas 入口卡片瘦身（删标注 + 工作台打开按钮）+ 注册画布 tab + openTab 定位 | 卡片点按钮→dock 展开画布 tab 定位该画布 |
| **S3** | 工作台：CanvasSurface 渲染 + 元素 pin（点选/框选）+ 评论面板（列表/新建/编辑/删除） | 全链路：画布点元素→pin 高亮→面板评论→保存注入→角标持久化 |
| **S4** | GET /qoder-canvas/canvas/:id 只读端点 + storage 拉取真身 + rev 刷新 | 工作台显示最新 rev；Agent 续编后工作台刷新 |

## 7. 风险与开放问题

| 风险 | 应对 |
|---|---|
| 跨插件 React 组件经 service 传递的类型/实例一致性 | openloop 系 bundle 共享 React 实例（ModuleLoader external）已验证可行；render 函数类型用结构化 spec 约束 |
| dock 未装时 canvas 降级 | registerTab 可选链（`dock?.registerTab?.`）；降级为对话流入口卡片（标注不可用，快照/回放仍可用） |
| GET 端点又是端点依赖 | webServer 运行时注入（不入静态 inject，panels 教训）；headless 降级为纯对话流形态 |
| 评论面板与 dock APP tab 三列结构的空间竞争 | canvas tab 用「画布区（主）+ 评论面板（右 280px）」两栏，不复用 APP 三列 |

## 8. 与既有工作的关系（不浪费）

- **保留**：canvas 工具/DSL/storage/不可变快照/CanvasSurface 渲染/几何法框选收集/localStorage 注释 store/注入 composer 链路——**全部复用**
- **删除**：AnnotationOverlay 的对话流蒙层架构（v0.2-0.3 的三轮修补）——**这是迁移的核心收益：把错误出发点连根拔起**
- **重做**：标注交互在「工作台 + 元素 pin」范式下重做（复用几何命中和注释 store，交互骨架全新）
