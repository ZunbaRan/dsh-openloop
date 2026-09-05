# dsh-qoder-canvas · 实施计划

> **依据**：`docs/QODER_CANVAS_DESIGN.md` v0.2（两轮评审通过，可开工）
> **节奏**：M0（半天 spike）→ M1（渲染闭环）→ M2（标注回流闭环）→ M3（打磨发布）
> **总预估**：M0 0.5 天 · M1 2-3 天 · M2 2-3 天 · M3 1-2 天

---

## M0 · 前置 Spike（半天）——消掉最大不确定性

**目标**：定死 composer 草稿注入的技术选型（整个 M2 系于此）。

### 任务

- [ ] **T0.1 composer 定位验证**：在 3080 真机（agent-browser）确认 `[data-composer-input="true"]` 选择器稳定可达；记录 0.1.2 的 composer DOM 结构快照（contenteditable div / aria 属性 / data-phase）留档
- [ ] **T0.2 注入方案验证**：三种手段实测对比——
  1. 原生 InputEvent 派发（`new InputEvent('input', {bubbles:true})` 前先 `document.execCommand('insertText')`——Lexical 编辑器常用路径，composer 疑似 Lexical：DOM 里有 `data-lexical-editor="true"`）
  2. 直接 `textContent` 拼接 + input 事件派发（兜底）
  3. 检索 DSH 0.1.2 是否暴露 composer 公开 API（`window.__dsh*`、composer slot 的 context 暴露）——有则优先
- [ ] **T0.3 webServer 运行时 inject 验证**：headless profile 下 `ctx.inject(['webServer'], ...)` 失败静默降级是否如 panels 0.1.7 事故记录那样工作
- [ ] **产出**：`composer-bridge.ts` 技术选型注释 + 骨架代码（选型结论写死在文件头），M2 直接用

### 验收

- 真机：向 composer 注入一段草稿文本，刷新前文本可见于输入框
- 结论三选一定死：公开 API / execCommand / textContent 兜底

---

## M1 · 渲染闭环（2-3 天）——C1/C2/C2.5

**目标**：Agent 生成画布 → 对话流出卡片 → 迭代与历史回放全通。

### 任务

- [ ] **T1.1 包骨架**：`packages/qoder-canvas/` 脚手架（package.json 含 `dsh.bundle.patch`、cordis.patch.yml、tsdown.config.ts host ESM + client CJS 双构建、tsconfig×2、vitest）——参照 `packages/artifact` 逐文件抄结构
- [ ] **T1.2 DSL schema + 校验**（`src/dsl.ts`）：
  - 10 节点类型 props schema（手写 fail-closed 校验，错误消息面向 Agent 可自修正，参照 panels `validatePanel` 风格）
  - 全部安全上限落地（nodes≤32、document≤256KB、series≤200×8、rows≤100、title≤120、href 白名单、context≤4KB 扁平对象）
  - `NODE_REGISTRY` 开放注册结构（节点集扩展性的地基，v0.1 注册仪表盘 10 节点）
- [ ] **T1.3 storage**（`src/storage.ts`）：
  - `ctx.fs.resolve` + cwd 回退链；落点 `<DSH_HOME>/profiles/<profile>/data/qoder-canvas/<workspaceKey>/cv_<id>/<rev>.json`
  - `writeText` 带 sandboxPolicy 第 5 参（漏传=静默写失败，IMPL_NOTES §3.3）
  - 不可变快照（每 rev 新文件）+ canvasId 生成（`cv_`+8 位 base32）+ workspace 隔离 + 跨 workspace 报「不存在」
- [ ] **T1.4 canvas 工具**（`src/index.ts`）：
  - `defineTool`：参数 = document（必填）/ canvasId（续编）/ load（唤回续编）/ list（清单）
  - execute：校验 → 存储快照 → presentationMeta **内嵌全量快照**
  - load/list 语义按设计文档 §4.2（load=以旧画布为起点的续编，走全流程；list=纯文本清单无 meta）
- [ ] **T1.5 client 渲染**（`src/client/`）：
  - `CanvasCard.tsx`：toolview 注册（key `qoder-canvas`）+ `canvasMetaFrom(block.meta)` 容错解析
  - `CanvasSurface.tsx` + `nodes.tsx`：10 节点渲染（纯内联 style 消费 `--dsw-alias-*`，参照 RelFloatWindow 模式）；chart 用内联 SVG 手绘（不引库，对齐 show_widget 惯例）
  - `markdown` 节点极简 renderer（标题/列表/加粗/代码 span，零 HTML 解析）
  - `theme.ts`：明暗两套 token 实测
- [ ] **T1.6 单测**：`dsl.spec.ts`（schema 合法/非法/上限/白名单矩阵）+ `storage.spec.ts`（fs seam 注入模拟，snapshot 不可变性/隔离）
- [ ] **T1.7 check 接线**：`check-all.mjs`/`pack-all.mjs` 加包；`pnpm check` 全绿

### 验收（真机）

- Agent 生成 6+ 节点画布渲染正确（含 chart/table/action）
- 同一 canvasId 二次调用 → revision 递增 → 新卡片
- 历史卡片回放各自定格（改画布后旧卡片不变）
- 坏 JSON → Agent 收到自修正错误消息重试成功
- headless 起服不炸

---

## M2 · 标注回流闭环（2-3 天）——C3/C4

**目标**：圈选评注 → 输入框草稿 → 发送 → Agent 修订画布。

### 任务

- [ ] **T2.1 composer-bridge**（M0 产物转正）：`src/client/composer-bridge.ts`——定位 + 注入 + 失败降级（剪贴板提示）
- [ ] **T2.2 AnnotationOverlay**：标注模式开关（画布头部按钮）→ 元素 hover 高亮 + 点选 / 矩形拖圈（node rect 与选框相交判定）→ 评注输入弹层（快捷短语：太小了/信息过时/这里错了/删掉）
- [ ] **T2.3 编排注入**：targets 解析（node id → title，从 meta 内嵌快照）→ 紧凑草稿格式（`[画布标注 · title cv_xxx@rN · 选中: n1 xxx, n2 yyy]
评注内容`）→ composer 注入
- [ ] **T2.4 action 节点**：点击 → intent + context 编排为草稿（context 过白名单审计）→ 注入
- [ ] **T2.5 审计端点**（`src/annotate.ts`）：`ctx.effect` 包裹 + 运行时 `ctx.inject(['webServer'])`（不入静态 inject）+ Origin/Referer 同源校验 + body schema 硬校验 + 60/min 速率限制 + `annotations.log` 追加写；端点失败不影响注入（尽力而为）
- [ ] **T2.6 端到端调试**：标注→草稿→发送→Agent 响应修订画布的完整循环实测（含 streaming 中标注的时序）

### 验收（真机）

- 圈选 2 节点 + 评注 → 输入框出现草稿 → 改写后发送 → Agent 按 canvasId 修订
- action 点击 → 草稿含 intent+context
- webserver 缺失（headless）→ 注入照常，仅无审计
- 伪造 fetch（跨 Origin）→ 403

---

## M3 · 打磨发布（1-2 天）

- [ ] **T3.1 skill**：`src/skill.ts` + `assets/`（进 files）——教 Agent「什么任务用什么节点组合」（recipes 雏形）；工具 description 路由话术与 panel/show_widget/html_artifact **互避表更新为五工具**
- [ ] **T3.2 路由契约**：`VISUAL_ROUTING.md` 加 canvas 列 + `routing-contract.spec.ts` 同步（四件套纪律）
- [ ] **T3.3 主题实测**：明/暗两套全节点过一遍（token 落空检测）
- [ ] **T3.4 上层 AGENTS.md 包矩阵**加 qoder-canvas 行
- [ ] **T3.5 发布纪律全流程**：`pnpm check` → bump 0.1.0 → pack-all → web profile remove+add（绝对路径 tarball）→ 重启真机验收 → `git commit -F` + push

### 验收

- 全仓 check 绿 + 真机全链路（生成→迭代→标注→修订→回放）一次过
- 五工具路由模糊 prompt 抽测（「画个图」「做个看板」）不误选 canvas

---

## 风险前置（随时触发升级路径）

| 触发 | 动作 |
|---|---|
| M0 发现 composer 无稳定注入路径 | M2 降级为「复制到剪贴板」交互（交互降级不砍架构） |
| 真机 meta 内嵌快照过大（>1MB 级） | §3.1 上限收紧 + 设计 delta 卡片方案 |
| 0.1.3 内核发布 | 先跑 AGENTS.md「DSH 内核跟进」隔离验证再动 |

## 纪律备忘

- 发布流程严格走 AGENTS.md「发布纪律」（check → bump → pack → remove+add → 真机 → commit -F）
- 多行 commit 一律写文件 + `git commit -F`
- 真机验证一律 agent-browser（0.1.2 一次性 token，curl 会消耗）
- 每个 M 完成：commit + 更新本文档勾选状态
