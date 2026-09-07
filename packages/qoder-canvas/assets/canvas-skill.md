# Canvas — Agent 第一产物画布

Canvas 是 agent-to-user 沟通的首选第一产物媒介（结构化内容）：信息密度高、用户可在其上做元素级标注（点选/框选/划字 + 评注）回流给你形成精确修改指令。

## 何时用 canvas

- **结构化内容**（看板/指标/表格/清单/流程文案/方案）→ canvas 的 DSL 节点：stat-card / chart / table / key-value / markdown / callout / section / action / link
- **设计稿/原型**（落地页/hero/特性网格/价格卡/PPT 页面）→ **canvas 设计原语**（box/text/icon/divider 嵌套组合，0.11+）——设计也画在 canvas 里，元素级标注回流照常生效，用户点选嵌套里的任何元素都能精确迭代
- **富交互 HTML 应用**（真正的 app/工具）→ 走 `html_artifact` 工具
- 每次调用产生新的不可变 revision，用户可回退任意版本继续迭代

## 标注回流协议

用户消息含「画布标注」块时，`<target path="nodes[i]">` 或 `path="nodes[i].children[j]…"` 指向具体节点（含嵌套子树）——精确修改这些节点，同 canvasId 重发完整 document。消息含「当前画布」行时，用户正开着那个画布的某个版本（rN），上下文以其为准。

## 设计组合指南（0.11 设计原语——复刻 baoyu-design 的品味）

### 排版层次
- 一个视觉区块只放**一个主标题**（fontSize 32-48 + fontWeight 700-800）；副标题 16-20/400-500；正文 13-15/muted tone
- 行高：标题 lineHeight 1.2，正文 1.5-1.7（长文 1.7+）
- 数字要 `fontWeight 700` + tabular 感（mono fontFamily 可选）

### 留白与间距（克制）
- 用 spacing 阶梯：8 → 16 → 24 → 40 → 64（gap/padding 取这些值，不要 13/17 这种碎值）
- hero 区 padding 40-64；卡片 padding 20-24；元素间 gap 12-16
- **留白是设计**——宁可多空，不要挤满

### 色彩（三层克制）
1. 主色一个（gradient 预设 sunset/ocean/forest 选一当品牌色）
2. 中性色阶：文字用 #1a1a2e 级深色 + muted tone；背景 #fff 或极浅灰
3. 语义色只用于状态（tone: success/warn/error）——**一页不超过 1 个强调色 + 语义色**
- 深色 hero（gradient ocean + 白字）配浅色内容区是安全的高级感公式

### 高频模式配方
- **hero**：`box(gradient, padding 48, display flex, column, center) > text(48/800/白) + text(16-18/rgba(255,255,255,.8)) + box(row, gap 12) > [action 区]`
- **特性网格**：`box(display grid… 用多个并列 box(flex grow, padding 20, shadow sm, radius 12) > icon(28) + text(15/600) + text(13/muted)]`
- **价格卡**：三列 `box(padding 24, radius 16, shadow md)`，中间列 `shadow lg + 主色描边`（borderWidth 2 + borderColor 主色）标记推荐
- **数据行**：设计节点做视觉壳 + 混排 stat-card/table 填数据（各司其职）

### 动画（克制原则）
- 每页**最多一种**入场动画（推荐 fade-in 或 slide-up，400-600ms）
- pulse/float 只用于单个小元素（如状态点），**绝不整页**
- delay 可做 100/200/300ms 的级联入场（≤3 级）

### 嵌套纪律
- ≤4 层足够（hero > inner > text）；超过 5 层通常说明结构该拆
- 每个嵌套节点都要 id（标注回流要定位它）

## Companion skills（可选，分开安装）

以下社区 skill 可增强 `html_artifact` 产物的风格质量。**canvas 不依赖它们**；安装后建议先 load 对应 skill 再写 artifact：

| Skill | 适用 |
|---|---|
| `baoyu-design` | 精致 UI 设计稿、交互原型、视觉探索 |
| `huashu-design` | 高保真原型、幻灯片/PPT、动画 |
| `kami` | 文档排版、白皮书、一页纸、落地页 |
| `archify` | 架构图、时序图、数据流图（独立 HTML + 内联 SVG） |
| `lieflat-charts` | 模板驱动图表、整页数据报告 |

安装方式（任一）：clone 到 `$DSH_HOME/skills/<name>/`（含 SKILL.md），或经 DSH skill 市场安装。canvas 的目录扫描 provider 会自动发现 `$DSH_HOME/skills` 下的 SKILL.md 并入册。
