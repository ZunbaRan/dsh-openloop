---
name: openloop-panels-style-guide
description: OpenLoop panels 预设风格开发指引（§13.1）：62 token 词汇表、三档规则、半 token 化禁令、Appica 审美参照。写任何预设组件或自定义 widget 的样式前先读本 skill。
---

# OpenLoop Panels 预设风格开发指引

本 skill 是面板视觉体系的公共基础：**所有**面板组件（预设组件、custom code、外部 pack）的样式决策都遵循同一套 token 契约。读完本 skill 再动手写样式。

## 1. Token 词汇表（62 个，theme 包 `@openloop/dsh-theme` 提供）

组件样式**一律**经 CSS 变量 `var(--openloop-*)` 消费，禁止硬编码颜色/圆角/阴影。变量由宿主 `useOpenLoopVisualTheme` 注入；沙箱内经桥同步。**主题包变量名 = `--openloop-<token名>`**。

### 1.1 预设系 token（50 个，随预设/明暗切换）

> 8 套预设：`linear · vercel · notion · claude · apple · figma · binance · slack`。切换预设/明暗即整组换值。

| 类别 | token（CSS 变量） | 语义 / 何时用 |
|---|---|---|
| 背景（4） | `--openloop-surface` · `-muted` · `-subtle` | 面板/卡片底、次级区块底、悬浮/层级底 |
| 边框（4） | `--openloop-border` · `-muted` · `-strong` | 常规描边、弱分隔线、强分隔（表头等） |
| 前景（5） | `--openloop-foreground` · `muted-foreground` · `foreground-subtle` · `foreground-strong` · `selection`/`selection-foreground` | 正文、次要文字、弱化文字、强调文字、选中态（成对用） |
| 交互（3） | `--openloop-primary` · `primary-foreground` · `focus-ring` | 主操作色、主色上的前景、焦点环 |
| 状态（12） | `--openloop-{success,warning,error,info}` + 各自 `-background` / `-border` | 状态语义件套：底色 + 描边 + 前景三件同进同退 |
| 图表（13） | `--openloop-chart-1..8`（分类色）· `chart-seq-1..5`（连续色阶） | 图表系列色；seq 用于热力/堆叠等连续数据 |
| 涨跌（3） | `--openloop-delta-up` · `-down` · `-flat` | 指标涨跌（**不复用** success/error，涨跌与成败语义解耦） |
| 主色衍生（2） | `--openloop-primary-tint` · `-shade` | 主色的浅/深变体（hover、渐变端点） |
| 圆角（3） | `--openloop-radius-sm` · `-md` · `-lg` | 小组件/卡片/大容器圆角 |
| 阴影（2） | `--openloop-shadow-1` · `-2` | 卡片浮起、模态层级 |

### 1.2 全局系 token（11 个，不随预设/明暗变，单一来源）

| token（CSS 变量） | 值语义 |
|---|---|
| `--openloop-font-sans` | 系统字体栈（含中文回退 PingFang SC / Hiragino Sans GB / Microsoft YaHei） |
| `--openloop-type-display` | `24px/32px/600/-0.02em/tabular-nums`——KPI 大数字专用 |
| `--openloop-type-title` | `18px/1.3/650/-0.02em`——卡片主标题 |
| `--openloop-type-label` | `13px/1.4/600/0`——节/列头 |
| `--openloop-type-meta` | `12px/1.5/500/0`——次级说明 |
| `--openloop-type-micro` | `11px/1.45/500/0.01em`——时间戳/角标 |
| `--openloop-space-1..5` | 4/8/12/16/24px 间距阶梯 |

## 2. 三档规则（token opt-in 三档制）

| 档 | 规则 | 场景 |
|---|---|---|
| 档 1 全 token | 结构、颜色、圆角、阴影**全部**来自 `var(--openloop-*)` | 预设组件（默认） |
| 档 2 token 化自定义（**主推**） | 结构自由，但颜色/圆角/阴影用 token | custom code、外部 pack（换肤跟随） |
| 档 3 全写死 | 任意硬编码（合法） | 品牌强定制；**代价：不随预设/明暗换肤，暗色下可能不可读，skill 须告知** |

判据：切换预设 + 明暗后组件是否仍协调。档 2/3 由 widget 作者自行声明，系统不强制。

## 3. 半 token 化禁令（成对属性同进同退）

**成对的 token 必须一起消费，禁止只换一边。** 典型成对关系：

- 背景 ↔ 前景（如 `surface` + `foreground`、`{tone}-background` + 前景档）
- 边框 ↔ 底色（如 `{tone}-border` + `{tone}-background`）
- 主色 ↔ 主色前景（`primary` + `primary-foreground`）
- 选中态（`selection` + `selection-foreground`）

违例：`background: var(--openloop-error-background)` 配 `color: var(--openloop-foreground)`（硬前景）——暗色预设下 error 底加深、前景不变，对比崩塌；`border: var(--openloop-border-strong)` 配 `background: #fff`（硬白底）——预设换 surface 后边框与底色失谐。

正确写法：同语境整组取 token 件套，或**整组**退档 3 全写死。**半 token 化 = 换预设/切明暗必崩。**

## 4. Appica 审美参照（角色化组织、密度、构图）

面板的视觉目标参照 Appica 的当代数据产品观感（非逐像素复制）：

- **角色化组织**：每个视觉元素承担明确角色——主数字（display）、标签（label/meta）、容器（surface+muted 分层）、操作（primary）。角色不叠加，一张卡一个主角。
- **密度**：信息按 space 阶梯编排（4/8/12/16/24），同级间距一致；数字列用 tabular-nums（type-display 内建）保证对齐；行/表头用 type-meta/label，不靠字号堆层级。
- **构图**：留白来自 space token 而非透明叠层；分隔用 border-muted 弱线优先于强边框；阴影是「浮起」的提示（shadow-1/2），不是装饰——预设默认 `shadow: none`（linear/apple 等）即「纸面平铺」审美。
- **明暗一致性**：同一组件在 8 预设 × 明暗下只允许 token 值变化，不允许出现「某预设下破版」——这正是 50 预设系 token 存在的意义，也是半 token 化禁令要守住的底线。

写成：先定角色 → 用 token 件套 → 按 space 阶梯排版 → 换预设验证。写错时优先怀疑「硬编码颜色/间距或半 token 化」。
