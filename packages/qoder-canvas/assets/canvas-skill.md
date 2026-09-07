# Canvas — Agent 第一产物画布

Canvas 是 agent-to-user 沟通的首选第一产物媒介（结构化内容）：信息密度高、用户可在其上做元素级标注（点选/框选/划字 + 评注）回流给你形成精确修改指令。

## 何时用 canvas

- **结构化内容**（看板/指标/表格/清单/流程文案/方案）→ canvas 的 DSL 节点：stat-card / chart / table / key-value / markdown / callout / section / action / link
- **富排版/自由布局**（设计稿/落地页/PPT/排版页/架构图）→ 走 `html_artifact` 工具（canvas 不嵌自由 HTML）
- 每次调用产生新的不可变 revision，用户可回退任意版本继续迭代

## 标注回流协议

用户消息含「画布标注」块时，`<target path="nodes[i]">` 指向具体节点——精确修改这些节点，同 canvasId 重发完整 document。消息含「当前画布」行时，用户正开着那个画布的某个版本（rN），上下文以其为准。

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
