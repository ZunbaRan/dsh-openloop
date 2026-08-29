# DSH Panels 真机验收 Prompt 集

> **用途**：`@openloop/dsh-panels` 的真机验收用例。每条 prompt 直接粘贴进 DSH 对话即可。
> **对应版本**：panels 0.2.6 / theme 0.3.1（immediately）/ artifact·show-widget 0.2.1 / declarative 0.2.1
> **版本要点**：0.2.2 宿主车道主题注入修复；0.2.3 currency 别名/children 错位防御/selection 对比对；0.2.4 两层容器组合 + 服务端组件级校验；0.2.5–0.2.6 panelFile 通道 + chart 三必填教学
> **前置**：DSH 运行于 `127.0.0.1:3080`（隔离 profile），模型配置可用。
> **记录方式**：每条标注 ✅预期行为；实测不符时截图 + 记录实际行为。

---

## 一、预设组件（宿主车道）

### 1.1 基础面板（metric-grid + chart）

```
用 panel 工具帮我建一个「本季度经营概览」面板，grid 布局 2 列，包含：
一个 metric-grid（4 个指标：月营收 ¥48,210 涨 12.4%、订单数 1,208 跌 2.1%、活跃用户 8,932 涨 5.6%、退款率 1.2% 持平）；
一个折线 chart 展示最近 6 个月营收趋势（数据你编合理的）。
```

✅ 预期：面板渲染；metric-grid 四格（hero 至多 1 个），涨跌色用 delta token（涨红跌绿之外的语义色）；折线图 chart-1 着色。**零工具报错**（0.1.3 起字符串化参数可容错，但正常应一次成功）。

### 1.2 多组件组合

```
建一个「项目周报」面板，stack 布局，包含：
heading + badge（本周状态：正常）、callout（warning 提示：两个里程碑延期）、
progress 组（3 个模块的完成度）、data-table（成员任务完成表：姓名/任务数/延期数）、
accordion（3 条常见问题）、divider、最后用 text 写一行总结。
```

✅ 预期：8 类组件全部渲染，无「组件不可用」占位。

### 1.3 图表全家桶

```
建一个「数据洞察」面板，grid 2 列，放 4 个图表 widget：
donut chart（流量来源占比）、gauge（目标达成率 73%）、funnel（注册→激活→付费转化）、heatmap（7 天 × 5 时段的活跃度）。
```

✅ 预期：四类手绘 SVG 图表渲染；donut 用 chart-1..N；funnel 用 chart-seq 渐层。

### 1.4 流程三件套（declarative 移植件）

```
建一个面板，包含：一个 flow（5 个节点的发布流程，含 1 个 warning 节点和 1 个 danger 节点）、
一个 timeline（项目里程碑：已完成 2 个、进行中 1 个、未来 2 个）、
一个 comparison（3 列方案对比：自建/采购/混合，标注推荐列）。
```

✅ 预期：三个移植组件渲染正常；**`tone: danger` 被接受**（0.1.4 兼容别名，渲染为 error 色）；comparison 推荐列高亮 + 列聚焦可点击切换；**vercel 深色下聚焦列对比度正常**（selection/selection-foreground 对比对，0.2.3 修复 primary-tint 误用）。

### 1.5 容器两层组合（0.2.4 契约放宽）

```
建一个「监控总览」面板，grid 2 列，每张 card 带标题包一个组件：
card「在线率」包 gauge、card「今日告警」包 data-table（3 行）、
card「趋势」包 sparkline 或折线 chart、card「说明」包 callout。
```

✅ 预期：**grid → card → 叶子** 两层组合渲染成功（0.2.4 起合法）；卡片带标题；不需要 panelFile（直传路径验证组合契约）。
⚠️ 反向：若模型写了 card 里再嵌 card、或 grid 里嵌 grid，应被**服务端 fail-closed 拒绝**（错误带容器规则说明，模型可自修正重试）。

---

## 二、主题换肤（token opt-in 验证）

### 2.1 8 预设 × 明暗

```
（无需对模型说话）打开 Settings → OpenLoop Visuals，
依次切换 linear / vercel / notion / claude / apple / figma / binance / slack，
再切换明暗模式。
```

✅ 预期：上面生成的面板**跟手换肤**（颜色/圆角/阴影变化）；无破版、无对比度崩坏。**设置页在 declarative 禁用后依然存在**（theme 0.3.0 独立宿主）。

### 2.2 设置页独立性（theme 重构专项）

```
（操作）禁用 @openloop/dsh-visual-declarative 插件，重启 DSH，再开 Settings。
```

✅ 预期：「OpenLoop Visuals」设置项**仍然在**，预设切换对剩余插件正常生效。

---

## 三、自定义沙箱 widget

### 3.1 档 2（token 化自定义，跟随换肤）

```
在面板里加一个自定义 widget，用 React 代码写一个倒计时圆环（目标日期 2026-09-01），
样式要求：背景、文字、圆环颜色全部使用 var(--openloop-*) 变量，
比如 var(--openloop-primary)、var(--openloop-surface)。
```

✅ 预期：沙箱格渲染成功（iframe）；切预设时圆环颜色**跟着变**（桥 token-sync 生效）；高度自适应内容。

### 3.2 档 3（完全自定义样式）

```
再加一个自定义 widget：一个霓虹风格的按钮墙，样式完全写死
（深紫底、荧光绿文字、大圆角），不要用任何 var(--openloop-*)。
```

✅ 预期：渲染成功；切预设时它**不变**——这是设计行为（档 3 不受控），不是 bug。

---

## 四、真实数据（API 对接）

### 4.1 公开 API + 手动刷新

```
建一个面板，加一个 data-table widget，数据源用
https://api.github.com/repos/deepseek-ai/deepseek-harness，
把 stargazers_count、forks_count、open_issues_count 展示出来（配 label）。
```

✅ 预期（2026-08-22 实测修订）：**扁平 JSON + data-table 是已知缺口**——GitHub API 返回扁平对象，浅合并无法重塑为 {columns, rows}，模型大概率降级为 custom widget 绕行（渲染成功、数据正确即算通过-降级，记录实际路径）。主路径通的是 **pick 单值 + metric 类组件**（如 `pick: "stargazers_count"` 注入 metric value）。格角 ↻ 刷新按钮两种路径都应工作。

### 4.2 定时刷新

```
给上面这个 widget 加 refresh.intervalMs = 10000（10 秒定时刷新）。
```

✅ 预期：每 10s 自动重拉（DevTools Network 可见 /openloop/panels/refresh 请求）；面板滚动不可见时定时器暂停。

### 4.3 错误态 + 重试

```
建一个面板，widget 数据源指向一个故意写错的地址：
https://api.github.com/repos/nonexistent-org-12345/nonexistent-repo-67890
```

✅ 预期：该格显示错误占位（error 色系 + 错误信息 + 重试按钮）；**同面板其他格不受影响**；点重试再次请求。

---

## 五、安全抽查

### 5.1 SSRF 拦截

```
建一个面板，widget 数据源指向 http://127.0.0.1:3080/api/health
```

✅ 预期：工具直接拒绝执行，报错说明 URL 违规（http 协议 + 环回地址双重违规）。

### 5.2 CSP 拦截（沙箱内联网）

```
建一个面板，自定义 widget 的代码里写 fetch('https://api.github.com') 然后把结果显示出来。
```

✅ 预期：校验阶段直接拒绝（禁词扫描命中 fetch）；如有漏网，iframe 内也会被 CSP 拦——DevTools console 可见 `Content-Security-Policy` violation 红字。

### 5.3 服务端组件级校验（0.2.4 fail-closed）

```
建一个面板，flow 的某个节点故意写 tone: "default"（不合法值）。
```

✅ 预期：**工具调用被服务端拒绝**（非渲染占位），错误消息带 widget id、kind、字段路径和合法枚举列表；模型读错误后自行修正重试成功。这是 0.2.4 服务端校验的核心价值验证（此前错误只有渲染端占位、模型看不到）。

---

## 五A、大面板文件通道（panelFile，0.2.5+）

| # | prompt | 预期 |
|---|---|---|
| 5A.1 | 「把数据洞察面板的定义写到 panels/insights.json 文件里，然后用 panel 工具的 panelFile 参数渲染它：grid 2 列，4 张 card 各包一个图表（环形图/仪表盘/漏斗图/热力图）」 | 模型 write 文件（单层 JSON 正确）→ panelFile 渲染成功；卡片带标题、两层组合生效 |
| 5A.2 | 「把刚才面板里的漏斗图换成柱状图」 | 模型 read → 局部修改 → write → 重渲染（迭代循环，不重发全量 JSON） |
| 5A.3 | 「用 panelFile 渲染 panels/not-exist.json」 | fail-closed 错误提示「先 write 再传路径」 |

## 六、持久化

### 6.1 保存与唤起

```
（先建一个面板并说）把这个面板保存下来（persist: true），记住它的 id。
```
然后**重启 DSH**，新开对话：
```
用 panel 工具的 load 参数把 <id> 面板调出来。
```

✅ 预期：重启后凭 id 完整复现面板（0.1.2 起 `load` 参数）；数据类 widget 唤起时重新拉取（实时语义）。

### 6.2 同 id 更新

```
再对同一个 id 传一次完整定义（把月营收改成 ¥52,000）并 persist，
然后重新 load 出来看是否更新。
```

✅ 预期：同 id 覆盖存档；load 出来的是新数值。

### 6.3 唤起不存在的面板

```
用 load: "never-saved-panel" 调 panel 工具。
```

✅ 预期：报错并提示「先 persist 或传完整定义」，不静默渲染空面板。

---

## 七、回归观察项（已知行为，不算 bug）

| 现象 | 说明 |
|---|---|
| 模型偶尔仍把 panel 传成字符串 | 0.1.3 起运行时容错解析，调用会成功（但这说明模型没走主路径，可记录频率） |
| 未实现的 14 个 kind（scroll-area/metric/list/key-value/stat/rating/empty-state/skeleton/tabs/pagination/tooltip/status/tree/steps 部分） | 渲染为「组件不可用」占位，不报错、不拖垮面板 |
| api widget 打开时重复请求一次 | onLoad 重拉与首帧解析各发一次请求（去重优化待做） |
| pack 车道外部组件包 | v0.1.x 仅支持自包含 bundle（esbuild 裸导入重写未实现），示例 pack 之外的包暂不测 |
| 长 JSON 直传仍可能语法崩坏 | qwen3.7-plus 字符串化 2000+ 字符失败率高（0.2.5 前实测 0% 成功）；skill 已引导大面板走 panelFile，直传失败属预期降级路径，记录频率即可 |
| 扁平 JSON API + 表格/图表组件 | 数据绑定无 reshape 能力（已知缺口，候选修法 data-table 扁平自适应/binding.map），模型会降级 custom widget——通过-降级 |

---

## 验收记录

| 用例 | 结果 | 备注 |
|---|---|---|
| 1.1 基础面板 | ✅（headless） | 早期真机已过；0.2.6 图表组合复验通过 |
| 1.2 多组件组合 | ✅（headless） | 模型自发走 panelFile，1 次成功；8 类组件全渲染（heading/badge/callout/progress×3/data-table/accordion/divider/text） |
| 1.3 图表全家桶 | ✅（headless） | 2 次调用 2 成功，全 panelFile 通道 |
| 1.4 流程三件套 | ✅（headless） | comparison 数字 values 被服务端拒 → 模型自愈修正；tone danger 别名 ✓、推荐列恰 1 ✓ |
| 1.5 两层组合 | ✅（headless） | 直传字符串失败 1 次（预期降级）→ 自愈转 panelFile；grid→card×4→四类组件结构完整 |
| 2.1 换肤 | ☐ | **浏览器专属（用户）** |
| 2.2 设置页独立性 | ☐ | **浏览器专属（用户）** |
| 3.1 档 2 沙箱 | ☐ | **浏览器专属（用户）** |
| 3.2 档 3 沙箱 | ☐ | **浏览器专属（用户）** |
| 4.1 API + 刷新 | ✅-降级（web 实测） | 扁平 JSON 缺口：模型降级 custom widget（渲染/数据/唤起均正常）；↻ 刷新按钮视觉待用户确认 |
| 4.2 定时刷新 | ☐ | **浏览器专属（用户，DevTools Network）** |
| 4.3 错误态 | ☐ | **浏览器专属（用户，错误占位视觉+重试）** |
| 5.1 SSRF | ✅（headless 双层） | 软层：模型读 skill 自我规避；硬层：panelFile 直喂环回 URL → 服务端拒绝「must use https://」 |
| 5.2 CSP | ✅（headless 双层） | 软层：模型走合规 data binding；硬层：直喂 fetch 代码 → 禁词校验拒绝 |
| 5.3 服务端校验负向 | ✅（headless） | tone default 被拒，错误带 widget id+字段路径+合法枚举；模型读懂错误并向用户澄清（自愈能力已在 1.4 实证） |
| 5A.1 panelFile 首建 | ✅（headless） | 0.2.5 真机专项已过；本轮 1.2–1.5 等效复验 ×4 |
| 5A.2 panelFile 迭代 | ✅（等效） | 1.4 自愈 = read→局部修改→write→重渲染完整闭环 |
| 5A.3 panelFile fail-closed | ✅（headless） | 「先 write 再传路径」提示正确传达给用户 |
| 6.1 保存唤起 | ✅（headless） | persist 落盘（workspace 级 openloop-panels/）→ 新会话 load 成功 |
| 6.2 同 id 更新 | ✅（headless） | 新客 3847→4102 覆盖存档，load 出新值 |
| 6.3 唤起不存在 | ✅（headless） | 「先 persist 或传完整定义」提示正确 |

> **headless 测试说明（2026-08-22）**：由 Agent 在 /tmp/dsh-accept workspace 执行，判定依据 = 会话日志（工具调用/结果/存档文件核验）。**行为观察**：5 个面板任务中模型 4 次自发选择 panelFile 通道（skill 教学生效）；2 次字符串直传失败均在 1–2 步内自愈转文件通道；未出现一次「放弃不交付」。

---

## 七、意图级路由回归（2026-08-29 新增）

> **背景**：以上所有验收 prompt 都点名了工具与 kind——路由层（模型在模糊请求下选哪个工具）从未被回归过。三方评审（主 Agent + 路由红队 + 信息架构评审）实测 12 条模糊 prompt 有 7 条犹豫/错路由。本节是路由层的回归防线；判定依据 = `docs/VISUAL_ROUTING.md` 决策表。visualize_ui 仍在工具表，新意图选它 = 错路由，不是工具已摘。
> **用法**：逐条粘贴进 DSH 对话（**不要**补充任何工具提示），记录模型实际调用的工具，与预期对照。

| # | 模糊 prompt（原文粘贴） | 预期工具 | 关键裁决点 |
|---|---|---|---|
| 7.1 | 帮我看看这组数据：本月营收 48210 元涨 12.4%，订单 1208 单跌 2.1%，退款率 1.2% | `panel`（或纯文字） | 不得选 show_widget 做数据展示、不得选 visualize_ui |
| 7.2 | 画个图 | `panel`（追问内容后，单 widget 图表面板） | 不得盲选退役工具；不应杀鸡用 html_artifact |
| 7.3 | 把 A 方案和 B 方案对比一下，直观一点 | `panel`（comparison 预设） | 死亡路标回归：不得选 visualize_ui |
| 7.4 | 帮我做个 GitHub 仓库的监控面板 | `panel`（数据绑定 + refresh） | 名义（panel）与能力（API）分裂裁决：panel 的数据能力应胜出 |
| 7.5 | 做个交互的东西演示一下快排 | `show_widget` | 单焦点小卡片边界 |
| 7.6 | 画个流程图说明一下这个架构 | `panel`（flow 预设） | 死亡路标回归：不得选 visualize_ui |
| 7.7 | 做个汇率计算器 | `panel` 或 `html_artifact` | **隐蔽错路由回归**：汇率需实时数据，show_widget 离线禁 API——不得选 show_widget |
| 7.8 | 把这次分析结果保存下来，以后还要看 | `panel`（persist） | 持久化语义：只有 panel 有 persist/load |

✅ 通过标准：8 条中 ≥7 条首选工具命中。visualize_ui 仍在工具表，新意图选它算错路由（不是工具已摘）。模型可先追问再选（追问不算失败）。
