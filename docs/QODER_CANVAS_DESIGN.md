# dsh-qoder-canvas · 技术架构文档

> **版本**：v0.2（2026-09-05，经 subagent 评审后修订——v0.1 的 P0×3 / P1×6 全部吸收）
> **定位**：独立 DSH 插件，复刻 Qoder Canvas 的核心能力（非融入 openloop 体系；仅共用仓库托管）。
> **目标内核**：DSH 0.1.2-rc.1+（peer 沿仓库惯例 `^0.1.1-rc.2`，0.1.2 机制差异由 M0 spike 验证后再定）。
> **调研来源**：Qoder 官方文档 extensions/canvas、phodal 博客《/canvas：不止是更漂亮的输出，而是下一代人机协作》（CSDN 转载全文）、phodal 2026-08-27 推文、DSH 插件开发社区教程、openloop 系插件一手实现经验（评审对照基线：panels/artifact/dock/mcp-runtime 实码 + IMPL_NOTES）。

---

## 1. 目标能力（对齐 Qoder Canvas 五大件）

| # | 能力 | v0.1 范围 | 说明 |
|---|---|---|---|
| C1 | **Canvas 工具**：Agent 生成/编辑画布 | ✅ | 工具名 `canvas`；产物 = 受约束的组件树 JSON（§3.1），不跑 TSX 源码 |
| C2 | **对话即迭代**：编辑同一画布 | ✅ | `canvasId`（host 生成）+ 全量 document 提交（见 §3.2）；画布跨轮持续演进 |
| C2.5 | **会话历史回放**：历史轮画布留档可回看 | ✅ | presentationMeta **内嵌全量快照**（v0.2 修订：与 panels/artifact 同模式，天然回放） |
| C3 | **标注回流（Annotation）**：圈选元素→评注→回传对话 | ✅ | v0.1 核心亮点；语义 = **标注注入 composer 输入框为草稿**（§3.4 定死） |
| C4 | **结构化行动入口**：action 节点带上下文回传 | ✂️ 部分 | 与 C3 共用逆向通道；完整 recipes 体系留 v0.2 |
| C5 | **Skill 化 / 团队分享** | ❌ v0.2+ | Publish/Share 依赖服务端，先不做 |

**明确不做**（与 openloop 划清边界）：不实现 pin/看板、快照悬浮窗、preset 组件库。本插件专注「对话流内的画布 + 标注回流」。

## 2. 总体架构

```
┌────────────────────────── DSH Web (浏览器) ──────────────────────────┐
│  conversation.chat.toolview 槽位（DSH 原生，per-callId 卡片）          │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ CanvasCard（toolview 卡片）                                 │    │
│  │  · 读 block.meta（presentationMeta 内嵌画布全量快照）        │    │
│  │  · CanvasSurface 组件树渲染（10 节点类型）                   │    │
│  │  · AnnotationOverlay（点选/矩形圈选 + 评注）                │    │
│  │  · 标注/action 编排 + composer 草稿注入（全在 client 侧）    │    │
│  └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
        ▲ presentationMeta（渲染数据通道：内嵌快照）  ▲ 标注（逆向通道：同源 fetch）
┌────────┴──────────────────────────────────────┴─────────────────────┐
│ Host 半（Node，cordis apply）                                        │
│  · canvas 工具（defineTool）：DSL 校验 → 存 storage → meta 内嵌快照   │
│  · 画布存储：profiles/<profile>/data/qoder-canvas/<workspace>/…     │
│    （ctx.fs.resolve + sandboxPolicy 第 5 参，见 §4.2）               │
│  · 标注端点：POST /qoder-canvas/annotate（CSRF 校验，见 §3.4）       │
│  · skill 注册（含路由话术互避，见 §6）                               │
└──────────────────────────────────────────────────────────────────────┘
```

**双模块结构**（DSH 标准形态）：
- `src/index.ts` → host 半：`apply(ctx)` 注册工具/存储/端点/桥
- `src/client/index.tsx` → client 半：React toolview，经 `dsh.client` 入口约定加载（同 artifact 模式）

## 3. 核心设计

### 3.1 画布 DSL（`.canvas.tsx` 的 JSON 等价物）

不跑 TSX 源码（沙箱成本高、TSX 图灵完备无法静态约束 Agent、无编译基建），用**受约束组件树 JSON**：

```jsonc
// canvas 工具的 document 参数（手写 schema 校验，fail-closed）
{
  "canvasId": "cv_7f3k",        // 首次调用省略 → host 生成；续编必填（Agent 从上轮 meta 回读）
  "title": "部署仪表盘",
  "layout": "grid",              // "grid" | "flow" | "split-h" | "split-v"
  "nodes": [
    { "id": "n1", "type": "stat-card", "props": { "label": "错误率", "value": "0.42%", "delta": -12, "tone": "success" } },
    { "id": "n2", "type": "chart", "props": { "chart": "line", "series": [{...}] } },
    { "id": "n3", "type": "action", "props": { "label": "修复此问题", "intent": "fix-n1", "context": { "file": "src/api.ts" } } }
  ],
  "edges": [ { "from": "n1", "to": "n2" } ]   // flow 布局用
}
```

**v0.2 增补：DSL 安全规格**（评审 P1-4）：

| 约束 | 上限/规则 | 违反行为 |
|---|---|---|
| nodes 数量 | ≤ 32 | 校验失败，错误消息面向 Agent 自修正 |
| 单节点 JSON | ≤ 16KB；全 document ≤ 256KB | 同上 |
| chart series 点数 | ≤ 200/系列，≤ 8 系列 | 同上 |
| table rows | ≤ 100（超出 Agent 应改用聚合） | 同上 |
| `markdown` 节点 | 纯文本子集渲染（自写极简 renderer：标题/列表/加粗/代码 span，**不引入 HTML 解析**，无 dangerouslySetInnerHTML） | 恶意标签按纯文本显示 |
| `link.href` | scheme 白名单 `http/https`（大小写归一后校验），否则拒绝该节点并降级为纯文本 | — |
| `action.context` | ≤ 4KB、仅 string/number/boolean 的扁平对象（结构白名单），回传前经长度与字符审计 | 超限截断 + 标记 |
| 所有字符串字段 | 长度上限（title ≤ 120 等，对齐 panels 惯例） | 同 nodes 上限 |

**节点类型 v0.1**（10 个；v0.1 的 `annotation-anchor` 已删——评审 P1-6 指出循环引用无实质定义，标注目标直接用 node id，无需专用锚点类型）：
- 布局：`panel`（容器）、`section`（带标题分组）
- 展示：`stat-card`、`chart`（line/bar/pie/area）、`table`、`key-value`、`markdown`、`callout`
- 行动：`action`（按钮，intent+context 回传）、`link`

**节点集扩展性（v0.2 立项定稿，来自 QoderWork 调研的推论）**：Qoder 用同一套 Canvas 管线垂直化出幻灯片工作台（HTML 16:9 画布 + 版式节点：封面/左图右文/双栏/引文），验证了「Canvas = Agent 产出的统一宿主平台」。**新能力 = 三件套**：
1. **节点集 + 布局 preset**（DSL 静态面：长什么样）
2. **回传语义**（复用平台统一逆向通道——标注/action 回流；这是「Agentic 宿主」与「只是渲染器」的分水岭）
3. **数据绑定**（静态 JSON / 未来 api 绑定，openloop api-widget 同款模式）

v0.1 只实现仪表盘节点集，但 DSL 的节点类型表设计为**开放注册**（host 侧 `NODE_REGISTRY`），v0.2+ 增幻灯片能力 = 新增一组节点 + `slides-16:9` layout preset 的增量扩展，不动架构。明确不做：PPTX 导出、放映模式、模板库（QoderWork 产品线范围）。

### 3.2 数据流（v0.2 修订：内嵌快照，评审 P0-1/P0-2）

```
Agent 调 canvas 工具（document JSON）
  → host: schema 校验（fail-closed，错误消息面向 Agent 可自修正——v0.2 从 M3 前移，评审里程碑意见）
  → host: canvasId 规则（评审 P1-2）：
      · 无 canvasId → host 生成（`cv_` + 8 位 base32 随机）；Agent 自带 id 不存在时直接报错（不猜测覆盖）
      · id 存在但 canvasId 归属别的 workspace/session → 报「画布不存在」（不泄露存在性）
  → host: 写 storage（快照文件不可变，见 §4.2）+ revision+1
  → tool output: presentationMeta = {
      kind: 'qoder-canvas', version: 1,
      canvasId, revision,
      canvas: <全量画布快照——内嵌，与 panels/artifact 同模式>
    }
  → client: CanvasCard 读 block.meta.canvas 直接渲染（零二次拉取）
```

**产品语义（评审 P0-2 要求定死）**：同一画布跨轮演进 = **一串各自内嵌快照的 per-callId 历史卡片**（openloop 模式）。不做「单张活卡片原地更新」（DSH toolview 无此机制，且历史留档本就是 C2.5 的卖点）。副作用：大画布多轮迭代的 meta 体积 = 轮数 × 画布大小，由 §3.1 的 256KB 上限兜底；v0.2 若实测过大再考虑「delta 卡片 + 最新全量」混合。

### 3.3 标注回流（C3，本插件的灵魂）

```
用户点击「标注」→ AnnotationOverlay 激活（元素高亮可点）
  → 点选元素 或 矩形拖圈（框住若干 node id）
  → 弹评注输入框（快捷短语：太小了/信息过时/这里错了/删掉）
  → 确认 → 结构化标注：
     { type: 'canvas-annotation', canvasId, revision, targets: [nodeId...],
       note: '...' }                // v0.2 删 screenRect（评审遗漏项 4：视口坐标重排即失效）
  → client（编排，全部在浏览器侧）：从 block.meta 内嵌快照解析 node title，
     把标注编排为用户可读的紧凑文本草稿 → 注入 composer 输入框
  → （并行，尽力而为）同源 fetch POST /qoder-canvas/annotate → host 记审计日志
  → 用户可见可编辑 → 手动发送（「标注即草稿，非标注即指令」）
```

标注草稿的用户可读紧凑格式（示例，client 编排）：
```
[画布标注 · 部署仪表盘 cv_7f3k@r3 · 选中 2 个节点: n1 错误率, n2 趋势图]
这里错误率数字过时了，改成今天的；趋势图时间段改成最近 7 天
```
编排与注入都在 client 完成（内嵌快照在手，无需 host）；host 端点仅审计，**不参与注入链路**——fetch 失败/端点不存在时注入照常工作（尽力而为的审计）。

### 3.4 逆向通道（v0.2 重写：评审 P0-3/P1-1/P1-5）

**语义定死（P1-5）**：标注与 action 一律走「**composer 输入框注入草稿**」——用户确认后随正常消息发送。不直接向消息流注入（保「标注即草稿」原则，也绕开零先例的会话写入 API）。

**机制（两段式，前端为主）**：

1. **注入实现 = 前端 DOM 路径（评审建议的降级方案 A 升格为正选）**：AnnotationOverlay / action 点击后，client 侧直接定位 composer（`[data-composer-input="true"]` / `data-placeholder` 结构已在 0.1.2 DOM 中实证存在），以原生 `InputEvent` 注入文本草稿。host 端点只做**审计日志**（写 `<storage>/annotations.log`），不碰会话。
   - 理由：M0 spike 若发现 0.1.2 有公开的 composer 写入 API 则改用之；DOM 注入对「填草稿」这类非破坏操作是社区可接受的做法（Qoder 语义同为「附加到对话输入」）
   - streaming 冲突（评审 P0-3 时序问题）：注入目标是输入框而非消息流，天然不撞 turn 边界——用户自己决定何时发送
2. **action 节点回传**：与标注同链路（拼 intent + context 的紧凑文本进草稿）；C4 的「结构化上下文整体带回」由 context 字段携带，经 §3.1 白名单审计。

**端点安全（P1-1，v0.2 新增）**：
- `POST /qoder-canvas/annotate` 仅做审计：`Origin`/`Referer` 白名单（同源）+ body JSON schema 硬校验 + 每 canvasId 速率限制（60/min）
- 不存在「DSH 现有 token 机制」可依赖（评审核实仓库内端点均无认证）——审计端点本身无副作用，被伪造的代价仅为日志噪声
- **端点注册纪律**（评审核对结论）：`ctx.effect` 包裹拿 disposer；`webServer` **不入静态 inject**（headless profile 无 HTTP 服务会炸插件——panels 0.1.7 事故教训），运行时 `ctx.inject(['webServer'], ...)` 嵌套注入，失败静默降级

**headless 降级（评审遗漏项 1，v0.2 修正语义）**：注入与编排全在 client、审计端点尽力而为——webserver 不可用时**功能不受影响**，仅跳过审计上报（静默，不隐藏按钮）；canvas 渲染本就零端点依赖。action 节点同样照常（同链路）。

### 3.5 host 与 client 的职责边界

| 关注点 | host | client |
|---|---|---|
| DSL 校验（fail-closed + 自修正错误）/ storage / revision | ✅ | |
| canvas 工具注册 + skill + 路由话术 | ✅ | |
| 标注审计端点（无副作用） | ✅ | |
| 组件树渲染 + 主题 token | | ✅ |
| 圈选交互 + 评注 UI | | ✅ |
| composer 草稿注入（DOM） | | ✅ |

## 4. 工程结构

### 4.1 目录

```
packages/qoder-canvas/
├── src/
│   ├── index.ts               # host 半（工具/存储/审计端点/桥）
│   ├── dsl.ts                 # DSL schema + 校验（纯函数，可单测）
│   ├── storage.ts             # 不可变快照读写（ctx.fs + sandboxPolicy seams）
│   ├── annotate.ts            # 审计端点（ctx.effect + 运行时 webServer inject）
│   ├── skill.ts               # skill provider（assets/ 进 files）
│   └── client/
│       ├── index.tsx          # client 入口：注册 toolview
│       ├── CanvasCard.tsx     # 读 meta（内嵌快照）→ 渲染
│       ├── CanvasSurface.tsx  # 组件树渲染器（11 节点类型）
│       ├── nodes.tsx          # 节点组件（v0.1 聚合单文件）
│       ├── AnnotationOverlay.tsx
│       ├── composer-bridge.ts # composer 定位 + 草稿注入（M0 spike 产物）
│       └── theme.ts           # 消费 --dsw-alias-*（明暗两套实测）
├── tests/                     # dsl.spec / storage.spec（纯函数 seam 注入，对齐 openloop 测试形态）
├── cordis.patch.yml
├── tsdown.config.ts           # host ESM + client CJS（react 等全 external）
└── package.json               # dsh.bundle.patch 声明（评审核实：无独立 dsh.bundle 文件）
```

### 4.2 storage 设计（v0.2 修订：评审 P1-2/P1-3）

- **路径**：`ctx.fs.resolve(...)` 相对解析 + cwd 回退链；实际落点 `<DSH_HOME>/profiles/<profile>/data/qoder-canvas/<workspaceKey>/cv_<id>/<rev>.json`（对齐 panels 实际形态，**非** v0.1 写的 `storages/dsh-qoder-canvas/`）
- **写入**：`ctx.fs.writeText(path, data, policy)` **必须传 sandboxPolicy**（`sandboxPolicy.resolve({session})` → workspaceRoot；漏传时 backend 默认 read-only 会**静默写失败**——IMPL_NOTES §3.3 血泪）
- **不可变快照**：每次 revision 写新文件 `<rev>.json`，不覆盖（回放与审计的基础）；GC 策略 v0.1 不做（256KB × 轮数上限可控），留 TODO
- **隔离**：workspaceKey 按 session cwd 编码（与 openloop 持久化围栏同语义）；canvasId 命名空间在 workspace 内，跨 workspace 访问报「不存在」
- **多画布管理（评审遗漏项 2）**：工具参数补 `load: "<canvasId>"` 与 `list: true`。**load 语义**：读存储最新快照 + 本次提交的 document 增改 → 正常走 §3.2 全流程（revision+1、meta 内嵌新快照、产生新 toolview 卡片）——即 load 不是纯读取，而是「以旧画布为起点的续编」；Agent 想纯查看用 `list` 或读历史 meta。**list 语义**：返回清单（id/title/revision/updatedAt），无 presentationMeta、不产生渲染卡片（普通文本结果）。host 生成 id 并在 tool result 中显式回显 canvasId+revision，指导 Agent 续编。

### 4.3 构建与 peer

- tsdown：host ESM（lib/index.js）+ client CJS bundle（lib/client.js + `__ModuleLoader__` banner，同 artifact 模式）
- client external：react/react-dom/cordis/dsh-client-*（DSH ModuleLoader 运行时提供）
- peer：`@deepseek-ai/cordis ^4.0.1`、`@deepseek-ai/dsh-tools ^0.1.1-rc.2`（仓库惯例线；0.1.2 实测兼容已由 dock 迁移验证背书）

## 5. 里程碑（v0.2 修订）

| 阶段 | 内容 | 验收 |
|---|---|---|
| **M0（前置 spike，半天）** | ① 真机验证 0.1.2 composer 写入路径：优先找公开 API，无则验证 DOM 注入（`[data-composer-input]` InputEvent 方案）② webServer 运行时 inject 在 headless 的降级实测 | composer-bridge 技术选型定死，产出代码骨架 |
| M1 | DSL schema（含全部安全上限，fail-closed）+ storage（sandboxPolicy seams + 不可变快照）+ canvas 工具（load/list）+ CanvasCard/Surface 渲染（C1/C2/C2.5）+ 单测（dsl/storage） | Agent 生成画布渲染正确；对话迭代 revision 递增；历史卡片各自回放正确 |
| M2 | AnnotationOverlay（点选+矩形圈选）+ composer 草稿注入（M0 产物）+ action 节点（C3 + C4 部分）+ 审计端点 | 圈选评注→输入框草稿→发送→Agent 响应；webserver 缺失时跳过审计、注入不受影响 |
| M3 | skill 打磨（含四工具路由话术互避表更新）+ 明暗主题实测 + 真机全链路 + `pnpm check` + 发布纪律 | 真机验收 + 全仓 check 绿 |

## 6. 风险与开放问题（v0.2 更新）

| 风险 | 应对 |
|---|---|
| composer DOM 结构随 DSH 升级漂移 | M0 定位选择器尽量用 data-* 语义属性（`data-composer-input` 已实证 0.1.2 存在）；升级纪律（AGENTS.md「DSH 内核跟进」）覆盖回归 |
| 与 openloop 四个渲染工具的路由竞争 | 工具 description 互避表更新为五工具（panel/html_artifact/show_widget/canvas）；routing-contract.spec.ts 同步加 canvas 条目（对齐 VISUAL_ROUTING 维护纪律四件套） |
| Qoder 真实 DSL 未公开，JSON DSL 为推断设计 | 以行为语义为准，不追求文件级兼容 |
| 大画布多轮 meta 体积 | §3.1 256KB 上限兜底；实测超限再设计 delta 卡片 |
| 圈选在 grid 布局下的命中判定 | v0.1 只做点选 + 矩形框选（计算 node rect 与选框相交） |
