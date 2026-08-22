# DSH Panels 移植源清单（openchamber fork 搬运）

> **任务性质**：只读调研 + 复制。源仓库 `openchamber/` 仅读未改；写入仅限 `docs/_port-src/`。
> **用途**：为 `packages/panels`（@openloop/dsh-panels）预设组件库（§6，6 大类 40 kind）提供移植参考源码。
> **复制日期**：2026-08-21。源基线：openchamber `packages/ui/src`（2026-08-07 提交）。

---

## 1. 文件清单（18 个）

### 1.1 组件 — interactive-ui（10 个）

| 源文件 | 副本（相对 `docs/_port-src/`） | 内容一句话 |
|---|---|---|
| `packages/ui/src/components/interactive-ui/NativeUIKit.tsx` | `openchamber/packages/ui/src/components/interactive-ui/NativeUIKit.tsx` | Native Kit 44 个导出：Card 族、tone Badge/Notice、Progress、Table 族、自实现 context Tabs、Select/Checkbox/RadioGroup/Switch 表单控件、Dialog/Tooltip 薄别名、Stat/DescriptionList/Avatar/Pagination、Stack/Grid/Split 布局；样式全内联 `var(--ocix-*)` |
| `…/nativeUIKitRegistry.ts` | `…/nativeUIKitRegistry.ts` | 把 NativeUIKit + 宿主 Button/Input/Textarea/Skeleton 汇总为 44 键 `nativeUIKit` 注册对象（注入 Native 扩展 activation host） |
| `…/nativeRegistry.ts` | `…/nativeRegistry.ts` | Native 扩展加载器：runtime URL 鉴权 + 动态 `import()` 扩展资产 + `views.register` 命名空间校验 |
| `…/DeclarativeInteractiveView.tsx` | `…/DeclarativeInteractiveView.tsx` | Declarative JSON 渲染器主组件（62KB）：`DeclarativeNode` 递归渲染 34 种 `node.type` + 手绘 SVG Chart（bar/line/area/donut + tooltip/legend/参考线）+ DataTable（搜索/排序/分页/行操作）+ List + `LayoutModeContent`（dashboard-hero / master-detail / report 三组合模式） |
| `…/DeclarativeAdvancedPrimitives.tsx` | `…/DeclarativeAdvancedPrimitives.tsx` | 16 个高级原语组件：Timeline/ActivityFeed/Comparison/Tabs/Accordion/CodeBlock/Sparkline/Gauge/Heatmap/Kanban/Agenda/Funnel/Network/GitGraph/Tree/DiffSummary |
| `…/DeclarativeInteractiveView.test.tsx` | `…/DeclarativeInteractiveView.test.tsx` | 渲染器测试（节点类型、绑定解析、布局模式） |
| `…/NativeUIKit.test.tsx` | `…/NativeUIKit.test.tsx` | Native Kit 组件测试 |
| `…/InteractiveUIStateNotice.tsx` | `…/InteractiveUIStateNotice.tsx` | 状态提示条（loading / error / stale + 重试按钮），渲染器与 artifact 共用 |
| `…/InteractiveUIStateNotice.test.tsx` | `…/InteractiveUIStateNotice.test.tsx` | 状态提示测试 |
| `…/DOCUMENTATION.md` | `…/DOCUMENTATION.md` | Declarative 视图 v1 契约文档（node.type 语义、绑定、action） |

### 1.2 渲染器配套 lib（6 个，Declarative* 直接 import）

| 源文件 | 副本 | 内容一句话 |
|---|---|---|
| `packages/ui/src/lib/interactive-ui/metricIcons.ts` | `…/lib/interactive-ui/metricIcons.ts` | `metric.icon` 白名单 29 个业务语义图标 + `sanitizeOcixMetricIcon` 白名单净化（宿主图标名不可任意注入） |
| `…/lib/interactive-ui/types.ts` | `…/lib/interactive-ui/types.ts` | 契约类型全集：`DeclarativeViewNode/Definition/BindingScope/ActionDefinition`、`InteractiveViewHost`、`NativeActivationHost`（ui 槽位 44 键类型） |
| `…/lib/interactive-ui/bindings.ts` | `…/lib/interactive-ui/bindings.ts` | 绑定解析：`$path` / `$row` / `format` / `fallback` → `displayDeclarativeValue` / `resolveDeclarativeValue` |
| `…/lib/interactive-ui/state.ts` | `…/lib/interactive-ui/state.ts` | `classifyInteractiveUIError` 错误分类（供状态提示判定） |
| `…/lib/interactive-ui/generatedLayout.ts` | `…/lib/interactive-ui/generatedLayout.ts` | `sanitizeGeneratedLayout`：generated-layout 节点校验/净化（30KB，含布局几何） |
| `…/lib/interactive-ui/stylePresets.ts` | `…/lib/interactive-ui/stylePresets.ts` | 8 套 OCIX 预设 id + character 元数据（linear/vercel/notion/claude/apple/figma/binance/slack） |

### 1.3 样式（2 个）

| 源文件 | 副本 | 内容一句话 |
|---|---|---|
| `packages/ui/src/styles/ocix-theme.css` | `…/styles/ocix-theme.css` | `.ocix-scope` 定义 46 个 `--ocix-*` token（light/dark 双套）+ 字阶类 `.ocix-type-display/.ocix-type-value` + reduced-motion 降级 |
| `…/styles/ocix-presets.css` | `…/styles/ocix-presets.css` | 7 套预设（linear 为默认无 override 块）× light/dark 填充 46 token 槽位；palette/radius/shadow 可随预设，typography 与组合规则全局不变 |

---

## 2. `node.type` 全集（34 个）与 §6.1 覆盖对照

从 `DeclarativeInteractiveView.tsx` 的 `if (node.type === …)` case 分支提取，共 **34 个**：

```
generated-layout  stack  section  row  grid  metric-grid  metric  text  markdown
progress  status  badge  key-value  flow  chart  timeline  activity-feed  comparison
tabs  accordion  code-block  sparkline  gauge  heatmap  kanban  agenda  funnel
network  git-graph  tree  diff-summary  divider  list  callout  data-table
```

> 注：§6.1 文档标称「6 大类 35 个」，但逐项列出实为 **40 个 kind**（§5.1 `PresetKind` union 亦 40 项）——文档内部笔误，下表按 40 项逐一对照。

| §6.1 大类 | kind（§6.1 清单） | 上游 declarative | 覆盖判定 |
|---|---|---|---|
| 排版基础（7） | text | ✅ `text` | 直接覆盖 |
| | markdown | ✅ `markdown` | 直接覆盖 |
| | heading | — | **缺**（需新写，可用 `section.title`+字阶近似） |
| | badge | ✅ `badge` | 直接覆盖（与 `status` 渲染同路） |
| | tag | — | **缺**（需新写；badge 简化可得） |
| | divider | ✅ `divider` | 直接覆盖 |
| | avatar | —（Native 有 `NativeAvatar`） | Native Kit 可补 |
| 容器布局（7） | card | —（`section variant='bordered'` 即 OCIX_PANEL 卡片） | 近似可得 |
| | section | ✅ `section` | 直接覆盖 |
| | stack | ✅ `stack` | 直接覆盖 |
| | grid | ✅ `grid` | 直接覆盖 |
| | row | ✅ `row` | 直接覆盖 |
| | split | —（Native 有 `NativeSplit`，1:1/1:2/2:1） | Native Kit 可补 |
| | scroll-area | —（宿主有 `ScrollShadow`/`OverlayScrollbar`） | 宿主组件可补 |
| 数据展示（9） | metric | ✅ `metric` | 直接覆盖 |
| | metric-grid | ✅ `metric-grid` | 直接覆盖 |
| | data-table | ✅ `data-table` | 直接覆盖（含搜索/排序/分页/行操作，超集） |
| | list | ✅ `list` | 直接覆盖（含 ordered/filterable） |
| | key-value | ✅ `key-value` | 直接覆盖 |
| | stat | —（Native 有 `NativeStat`：label/value/delta/trend/detail） | Native Kit 可补 |
| | rating | — | **缺**（需新写） |
| | empty-state | —（Native 有 `NativeEmptyState`；declarative 空态走 `emptyLabel`） | Native Kit 可补 |
| | timeline | ✅ `timeline` | 直接覆盖（§6.1 已注明从 declarative 移植） |
| 图表（5） | chart(bar/line/donut) | ✅ `chart`（还支持 area/stacked/参考线） | 直接覆盖（超集） |
| | sparkline | ✅ `sparkline` | 直接覆盖 |
| | gauge | ✅ `gauge` | 直接覆盖 |
| | funnel | ✅ `funnel` | 直接覆盖 |
| | heatmap | ✅ `heatmap` | 直接覆盖 |
| 流程关系（4） | flow | ✅ `flow`（horizontal/vertical） | 直接覆盖 |
| | comparison | ✅ `comparison` | 直接覆盖 |
| | steps | —（flow 垂直态可近似步骤条） | 近似可得 |
| | tree | ✅ `tree` | 直接覆盖 |
| 反馈交互（8） | callout | ✅ `callout`（tone 图标联动） | 直接覆盖 |
| | status | ✅ `status` | 直接覆盖 |
| | progress | ✅ `progress` | 直接覆盖 |
| | skeleton | —（宿主有 `@/components/ui/skeleton`） | 宿主组件可补 |
| | tabs | ✅ `tabs` | 直接覆盖 |
| | accordion | ✅ `accordion` | 直接覆盖 |
| | pagination | —（Native 有 `NativePagination`） | Native Kit 可补 |
| | tooltip | —（Native 有 `NativeTooltip`，宿主 Tooltip） | Native Kit 可补 |

**汇总**：
- 直接覆盖：**27 / 40**
- Native Kit 可补：**6**（avatar、split、stat、empty-state、pagination、tooltip）
- 宿主组件可补：**2**（skeleton、scroll-area）
- 近似可得：**2**（card≈section bordered、steps≈flow vertical）
- **真正需新写：3**（heading、tag、rating）

declarative 侧另有 8 个超出 §6.1 的 type（移植时可选）：`activity-feed`、`code-block`、`kanban`、`agenda`、`network`、`git-graph`、`diff-summary`，以及布局幻节点 `generated-layout`（本身不直接渲染，套用净化后的子树）。

---

## 3. 依赖注记（评估移植成本）

### 3.1 宿主组件 import（`@/components/ui/*`，不在暂存区内，需在 panels 重建等价物）

| 消费方 | 宿主组件 |
|---|---|
| NativeUIKit.tsx | `Button`、`Card/CardContent/CardHeader/CardTitle`、`Checkbox`、`Radio`、`Switch`、`Select`(+Trigger/Content/Item/Value)、`Dialog`(+5 子件)、`Tooltip`(+3 子件)、`Icon`(`@/components/icon/Icon`，图标名类型 `IconName`) |
| nativeUIKitRegistry.ts | `Button`、`Input`、`Skeleton`、`Textarea` |
| DeclarativeInteractiveView.tsx | `Button`、`Skeleton`、`ScrollShadow`、`Icon` |
| DeclarativeAdvancedPrimitives.tsx | `Button`、`Icon` |

**关键**：宿主 primitives 底层是 **`@base-ui/react`**（非 Radix）——`checkbox`/`switch`/`select`/`dialog`/`tooltip` 均基于 Base UI；`Button` 为 `cva` + `Slot` 自实现（class-variance-authority + tailwind-merge）。移植到 panels 时注意：DSH 设计（D7）宣称「Radix 行为原语」，源与之不符，需决策用 Base UI 还是换 Radix。

### 3.2 hooks / 工具 import

| 模块 | 消费方 | 说明 |
|---|---|---|
| `@/lib/utils`（`cn`） | 全部组件 | clsx + tailwind-merge |
| `@/lib/i18n`（`useI18n`） | Declarative* 3 个 | i18n 文本（可去，硬编码替代） |
| `@/lib/clipboard`（`copyTextToClipboard`） | CodeBlockPrimitive | 仅复制按钮 |
| `@/lib/runtime-url`（`getRuntimeUrlResolver`） | nativeRegistry.ts | 仅 Native 扩展加载用 |
| `@/lib/runtime-auth`（`refreshRuntimeUrlAuthToken`） | nativeRegistry.ts | 同上 |
| `@/lib/interactive-ui/{types,bindings,generatedLayout,state,metricIcons,stylePresets}` | 渲染器/注册器 | 已在 §1.2 复制 |

### 3.3 图表库

**零第三方图表库**。chart（bar/line/area/donut）、sparkline、gauge、heatmap、network、git-graph 全部为**手绘 SVG**（`Intl.NumberFormat` compact 刻度、pointer tooltip、SVG `role="graphics-symbol"` 无障碍），无 recharts/d3。移植 panels 批 3 图表族可直接沿用。

### 3.4 React 版本

宿主 `react@19.1.1`；panels 锁定 React 18（D7）——源码仅用 `useState/useEffect/useContext/useId/useCallback/useMemo` 与 `createContext`，无 19 专属 API，移植兼容。

---

## 4. 上游 token 清单概览

### 4.1 `ocix-theme.css` 的 46 个 `--ocix-*`（theme 包 46 个 `--openloop-*` 的来源）

`.ocix-scope` 内定义，light/dark 两套值：

| 分组 | 变量 |
|---|---|
| 表面/文字（8） | `surface` `surface-muted` `surface-subtle` `border` `foreground` `muted-foreground` `selection` `selection-foreground` |
| 强调（5） | `focus-ring` `primary` `primary-foreground` `primary-tint` `primary-shade` |
| 状态色（12） | `success/warning/error/info` ×（基色、`-background`、`-border`） |
| 图表（13） | `chart-1…8`、`chart-seq-1…5` |
| 涨跌（3） | `delta-up`(=success) `delta-down`(=error) `delta-flat`(=muted-foreground) |
| 几何（5） | `radius-sm/md/lg`、`shadow-1`、`shadow-2` |

> 与 `dsh-visual-plugins/packages/theme/src/presets.generated.ts`（`OPENLOOP_PRESETS`）的每预设 46 键**一一对应**——theme 包由 `scripts/sync-openloop-presets.mjs` 从 `ocix-theme.css` 生成。**注意：`ocix-theme.css` 里 `--ocix-panel-hero-bg` 被渲染器引用但从未定义**（上游疏漏，hero 面板背景落到继承值），移植时需补槽。

### 4.2 46 个 `--openloop-*` 之外的**上游额外槽位**（移植必读）

1. **字阶类**（ocix-theme.css 内，全局不随预设）：
   - `.ocix-type-display`：`font-size:1.5rem; line-height:2rem; font-weight:600; letter-spacing:-0.02em; font-variant-numeric:tabular-nums` —— §14 全局系 `type-display` 的取值的直接来源
   - `.ocix-type-value`：仅 `tabular-nums`
2. **宿主 Tailwind 字阶工具类**（typography.css，**未随拷贝**，需自建）：`typography-body/meta/micro/ui-label/ui-header/code`——组件样式大量引用（`typography-meta` 39 次、`typography-micro` 29 次居首）
3. **代码块专用变量**（非 ocix 命名空间）：`--syntax-background` / `--syntax-foreground`（CodeBlockPrimitive 用，宿主语法高亮主题）
4. **其它槽位**：`.ocix-artifact-dialog::backdrop`（对话框遮罩）、`[data-slot="skeleton"]`（骨架底色）、`@media (prefers-reduced-motion: reduce)` 全局动画/过渡降级
5. **布局组合模式**（渲染器内常量类）：`OCIX_PANEL` / `OCIX_PANEL_HERO` / `OCIX_TITLE` / `OCIX_META` 四个 CSS class 常量 + `data-ocix-layout-mode`（dashboard-hero/master-detail/report）——§14 全局系 `space-*` 参考 `gap-3` 等间距语义

### 4.3 `ocix-presets.css` 结构

- 8 套预设：**linear 为默认**（`ocix-theme.css` 的默认值即 linear，无 override 块）+ 7 套 override：vercel / notion / claude / apple / figma / binance / slack
- 每套含 `.ocix-scope[data-ocix-preset='X']` 与 `.dark .ocix-scope[data-ocix-preset='X']` 双块
- 预设只填 palette + radius 缩放 + shadow 缩放；**typography 与组合规则永不随预设变**
- 暗色块**只重定义需要的键**（如 chart-seq、delta 等），未重定义键继承 light 值——移植到 panels token 化时若做「预设 = token 数据」，需注意这种继承语义
- 预设 `character` 元数据在 `stylePresets.ts`（professional ×6 / playful=figma / financial=binance）

---

## 5. 移植备忘（供后续改写）

- **样式改写目标**：全部 `var(--ocix-*)` → `var(--openloop-*)`；`rounded-[var(--ocix-radius-md)]` 类内联任意值写法在 React 18 + 无 Tailwind 环境下需改为 style 对象或原生 CSS（§6.2 参照 DeclarativeCard 内联样式模式）。
- **断点类**（`sm:`/`lg:`/`xl:`/`@xs` container query）在纯宿主 CSS 环境需重写为 container query / 媒体查询。
- **主要搬运源** = `DeclarativeInteractiveView`（metric/metric-grid/data-table/list/key-value/flow/chart/callout/status/progress/tabs/accordion）+ `DeclarativeAdvancedPrimitives`（timeline/comparison/sparkline/gauge/funnel/heatmap/tree）+ `NativeUIKit`（avatar/split/stat/empty-state/pagination/tooltip 补缺）。
