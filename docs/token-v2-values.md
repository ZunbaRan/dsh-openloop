# Token v2 扩充数值表（46 → 62）

> 依据：`docs/DSH_PANELS_DESIGN.md` §14 + 决策 D6。产出物仅作实施参考；theme 包本轮不改动。
> 调研源：`packages/theme/src/presets.generated.ts`（46 token × 8 预设 × 明暗）、`docs/_port-src/openchamber/packages/ui/src/styles/ocix-theme.css`、`ocix-presets.css`、`packages/declarative/src/client/DeclarativeCard.tsx`。
> 所有 hex 已按 sRGB→Oklab 转换；带 alpha 前景（notion/apple/figma dark）先按其预设 surface 合成再转 oklch。

---

## 一、全局系 12 个（全局唯一，不随预设变）

| token | 值 | 取值依据 |
|---|---|---|
| `font-sans` | `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif` | 来源判断：项目内已有两处系统字体栈先例——`packages/artifact/src/shell.ts:43` 用 `system-ui, -apple-system, sans-serif`，`fixtures/mcp-app-server/src/server.ts:15` 用 `system-ui, sans-serif`。宿主为跨平台中文 AI 客户端，故在系统栈上追加 PingFang SC / Hiragino Sans GB / Microsoft YaHei 覆盖中文，Segoe UI/Roboto 覆盖 Win/Android |
| `type-display` | `24px / 32px / 600 / -0.02em / tabular-nums` | 上游 `.ocix-type-display`（ocix-theme.css:122-128）原值：`1.5rem`(24px) / `2rem`(32px) / `600` / `-0.02em` / `font-variant-numeric: tabular-nums`。KPI 大数字专用，逐字对齐上游 |
| `type-title` | `18px / 1.3 / 650 / -0.02em` | DeclarativeCard.tsx:21 `titleStyle` 现值（fontSize 18、lineHeight 1.3、fontWeight 650、letterSpacing -0.02em），卡片主标题 |
| `type-label` | `13px / 1.4 / 600 / 0` | 尺寸取 DeclarativeCard.tsx:22 `descriptionStyle` 的 13px；权重取 FlowView node label 620（:48）与 ComparisonView 列头 650（:82）的折中 600；行高 1.4 较正文（1.55）紧凑以适配节/列头 |
| `type-meta` | `12px / 1.5 / 500 / 0` | FlowView:49 与 TimelineView:67 的 detail 现值（12px / 1.5），次级说明文字 |
| `type-micro` | `11px / 1.45 / 500 / 0.01em` | TimelineView:62 时间戳与 ComparisonView:82 subtitle 现值 11px；`0.01em` 正字距为小字号可读性策展建议（现状为 0，实施时可按需回退 0） |
| `space-1` | `4px` | DeclarativeCard detail 的 `marginTop: 4`（FlowView:49 / TimelineView:67），最小间距档 |
| `space-2` | `8px` | ComparisonView 列切换 gap 8（:77）、Pill 间距 8，相邻控件间距档 |
| `space-3` | `12px` | FlowView grid gap 12（:39）与节点内 padding `13px 14px`（:47）、TimelineView columnGap 12（:61），卡片内分组档 |
| `space-4` | `16px` | header 垂直 padding `18px 20px 14px`（:20）的近似、radius-lg 16 同源，面板内分区档 |
| `space-5` | `24px` | FlowView padding 20（:39）、TimelineView `20px 20px 22px`（:57）的上取整，面板级留白档 |

> 注：`space-1~5` 阶梯 4/8/12/16/24 覆盖 DeclarativeCard 现用全部间距（另有 flow 节点 gap 10 处于 8/12 之间，属非标值，实施时统一到 8 或 12）。字阶阶梯 display 24 > title 18 > label 13 > meta 12 > micro 11，与上游 display 及渲染器现状一致。

---

## 二、预设系 4 个（每预设 × light/dark）

### 策展规则（对所有 16 组一致）

基于各预设现有 `foreground` / `muted-foreground` / `surface` / `border` 推导，全部输出 oklch、hue 与同预设一致：

1. **foreground-subtle**：`foreground` 与 `muted-foreground` 亮度（L）中点，同预设 hue，饱和取 `min(fg.C, muted.C) × 0.75`（同色相减饱和、降对比）。
2. **foreground-strong**：复用该预设 `foreground` 原值（各预设 fg 已是最强对比）。唯一例外：**notion dark** 的 fg 为 `rgb(255 255 255 / 0.87)` 半透明白（合成后 L 0.909），strong 档取近纯白 `oklch(0.97 0 0)`（相当于解包 alpha 到 ~1.0）。
3. **border-muted**：`border` 亮度向 `surface` 移 50%（更贴近底色、弱化分隔），饱和 `× 0.85`。
4. **border-strong**：`border` 亮度向 `foreground` 移 45%（强化分隔），饱和 `× 1.15`。
5. **hue**：每预设固定一个 hue、跨明暗一致——linear 285 / vercel 285（全中性灰，借 linear 中性 hue）/ notion 84.6（暖灰）/ claude 67.7（暖橙灰）/ apple 286 / figma 285（全中性灰，借 linear）/ binance 258.3（蓝灰）/ slack 255.5（冷中性）。
6. 全部推导值经界内校验：border-muted 不越过 surface、border-strong 不越过 foreground。

### linear（hue 285）

源值：light `fg=oklch(.21 .006 285)` `muted-fg=oklch(.46 .014 285)` `surface=oklch(1 0 0)` `border=oklch(.895 .008 285)`；dark `fg=oklch(.95 .005 285)` `muted-fg=oklch(.72 .015 286)` `surface=oklch(.205 .006 285)` `border=oklch(.36 .012 285)`

| linear | light | foreground-subtle | oklch(0.335 0.005 285) | 推导：fg 与 muted-fg 亮度中点、同 hue 285、降饱和 min(C)×.75 |
| linear | light | foreground-strong | oklch(0.21 0.006 285) | 推导：复用 fg 原值 |
| linear | light | border-muted | oklch(0.948 0.007 285) | 推导：border 亮度向 surface 移 50%、饱和×.85 |
| linear | light | border-strong | oklch(0.587 0.009 285) | 推导：border 亮度向 fg 移 45%、饱和×1.15 |
| linear | dark | foreground-subtle | oklch(0.835 0.004 285) | 推导：fg 与 muted-fg 亮度中点、同 hue 285、降饱和 |
| linear | dark | foreground-strong | oklch(0.95 0.005 285) | 推导：复用 fg 原值 |
| linear | dark | border-muted | oklch(0.282 0.010 285) | 推导：border 亮度向 surface(.205) 移 50%、饱和×.85 |
| linear | dark | border-strong | oklch(0.625 0.014 285) | 推导：border 亮度向 fg(.95) 移 45%、饱和×1.15 |

### vercel（hue 285，全中性）

源值：light `fg=#171717` `muted-fg=#888888` `surface=#fff` `border=#ebebeb`；dark `fg=#ededed` `muted-fg=#a1a1a1` `surface=#0a0a0a` `border=#262626`（均转 oklch，C≈0，hue 无意义 → 借 linear 中性 hue 285）

| vercel | light | foreground-subtle | oklch(0.416 0 285) | 推导：fg(.205) 与 muted-fg(.627) 亮度中点、纯中性 |
| vercel | light | foreground-strong | oklch(0.205 0 285) | 推导：复用 fg 原值 #171717 |
| vercel | light | border-muted | oklch(0.970 0 285) | 推导：border(.94) 亮度向 surface(1) 移 50% |
| vercel | light | border-strong | oklch(0.609 0 285) | 推导：border 亮度向 fg(.205) 移 45% |
| vercel | dark | foreground-subtle | oklch(0.828 0 285) | 推导：fg(.946) 与 muted-fg(.709) 亮度中点、纯中性 |
| vercel | dark | foreground-strong | oklch(0.946 0 285) | 推导：复用 fg 原值 #ededed |
| vercel | dark | border-muted | oklch(0.207 0 285) | 推导：border(.269) 亮度向 surface(.145) 移 50% |
| vercel | dark | border-strong | oklch(0.573 0 285) | 推导：border 亮度向 fg(.946) 移 45% |

### notion（hue 84.6 暖灰）

源值：light `fg=#1a1a1a` `muted-fg=#787671` `surface=#fff` `border=#e5e3df`；dark `fg=rgb(255 255 255 / .87)`（合成 #e1e1e1→L.909）`muted-fg=rgb(255 255 255 / .46)`（合成 #838383→L.606）`surface=#191919` `border=#2f2f2f`

| notion | light | foreground-subtle | oklch(0.392 0 84.6) | 推导：fg 与 muted-fg 亮度中点、继承 border 暖灰 hue |
| notion | light | foreground-strong | oklch(0.218 0 84.6) | 推导：复用 fg 原值 #1a1a1a |
| notion | light | border-muted | oklch(0.958 0.005 84.6) | 推导：border(.916) 亮度向 surface(1) 移 50%、饱和×.85 |
| notion | light | border-strong | oklch(0.602 0.007 84.6) | 推导：border 亮度向 fg(.218) 移 45%、饱和×1.15 |
| notion | dark | foreground-subtle | oklch(0.758 0.003 84.6) | 推导：fg(.909) 与 muted-fg(.606) 亮度中点、降饱和 |
| notion | dark | foreground-strong | oklch(0.97 0 84.6) | 推导：fg 为 87% 透明白，strong 取近纯白（解包 alpha），唯一非复用 fg 的组 |
| notion | dark | border-muted | oklch(0.259 0 84.6) | 推导：border(.305) 亮度向 surface(.213) 移 50% |
| notion | dark | border-strong | oklch(0.577 0 84.6) | 推导：border 亮度向 fg(.909) 移 45% |

### claude（hue 67.7 暖橙灰）

源值：light `fg=#141413` `muted-fg=#6c6a64` `surface=#faf9f5` `border=#e6dfd8`；dark `fg=#faf9f5` `muted-fg=#a09d96` `surface=#181715` `border=#33302b`

| claude | light | foreground-subtle | oklch(0.358 0.001 67.7) | 推导：fg(.191) 与 muted-fg(.524) 亮度中点、继承 border 暖 hue |
| claude | light | foreground-strong | oklch(0.191 0.002 67.7) | 推导：复用 fg 原值 #141413 |
| claude | light | border-muted | oklch(0.945 0.010 67.7) | 推导：border(.907) 亮度向 surface(.982) 移 50%、饱和×.85 |
| claude | light | border-strong | oklch(0.585 0.014 67.7) | 推导：border 亮度向 fg(.191) 移 45%、饱和×1.15 |
| claude | dark | foreground-subtle | oklch(0.839 0.004 67.7) | 推导：fg(.982) 与 muted-fg(.696) 亮度中点 |
| claude | dark | foreground-strong | oklch(0.982 0.005 67.7) | 推导：复用 fg 原值 #faf9f5 |
| claude | dark | border-muted | oklch(0.258 0.008 67.7) | 推导：border(.311) 亮度向 surface(.205) 移 50%、饱和×.85 |
| claude | dark | border-strong | oklch(0.613 0.011 67.7) | 推导：border 亮度向 fg(.982) 移 45%、饱和×1.15 |

### apple（hue 286）

源值：light `fg=#1d1d1f` `muted-fg=#7a7a7a` `surface=#fff` `border=#e0e0e0`；dark `fg=#fff` `muted-fg=rgb(235 235 245 / .6)`（合成 #8d8d93→L.645）`surface=#000` `border=#38383a`

| apple | light | foreground-subtle | oklch(0.406 0 286) | 推导：fg(.232) 与 muted-fg(.580) 亮度中点 |
| apple | light | foreground-strong | oklch(0.232 0.004 286) | 推导：复用 fg 原值 #1d1d1f |
| apple | light | border-muted | oklch(0.953 0 286) | 推导：border(.907) 亮度向 surface(1) 移 50% |
| apple | light | border-strong | oklch(0.603 0 286) | 推导：border 亮度向 fg(.232) 移 45% |
| apple | dark | foreground-subtle | oklch(0.823 0 286) | 推导：fg(1) 与 muted-fg(.645) 亮度中点 |
| apple | dark | foreground-strong | oklch(1 0 286) | 推导：复用 fg 原值 #fff（纯白，天然最强） |
| apple | dark | border-muted | oklch(0.171 0.003 286) | 推导：border(.341) 亮度向 surface(0) 移 50%、饱和×.85 |
| apple | dark | border-strong | oklch(0.638 0.004 286) | 推导：border 亮度向 fg(1) 移 45%、饱和×1.15 |

### figma（hue 285，全中性）

源值：light `fg=#000` `muted-fg=#5a5a5a` `surface=#fff` `border=#e6e6e6`；dark `fg=#fff` `muted-fg=rgb(255 255 255 / .7)`（合成 #bbbbbb→L.793）`surface=#1e1e1e` `border=#3d3d3d`

| figma | light | foreground-subtle | oklch(0.234 0 285) | 推导：fg(0) 与 muted-fg(.468) 亮度中点、纯中性 |
| figma | light | foreground-strong | oklch(0 0 285) | 推导：复用 fg 原值 #000（纯黑，天然最强） |
| figma | light | border-muted | oklch(0.962 0 285) | 推导：border(.925) 亮度向 surface(1) 移 50% |
| figma | light | border-strong | oklch(0.509 0 285) | 推导：border 亮度向 fg(0) 移 45% |
| figma | dark | foreground-subtle | oklch(0.896 0 285) | 推导：fg(1) 与 muted-fg(.793) 亮度中点 |
| figma | dark | foreground-strong | oklch(1 0 285) | 推导：复用 fg 原值 #fff |
| figma | dark | border-muted | oklch(0.298 0 285) | 推导：border(.36) 亮度向 surface(.235) 移 50% |
| figma | dark | border-strong | oklch(0.648 0 285) | 推导：border 亮度向 fg(1) 移 45% |

### binance（hue 258.3 蓝灰）

源值：light `fg=#181a20` `muted-fg=#707a8a` `surface=#fff` `border=#eaecef`；dark `fg=#eaecef` `muted-fg=#929aa5` `surface=#0b0e11` `border=#2b3139`

| binance | light | foreground-subtle | oklch(0.398 0.009 258.3) | 推导：fg(.218) 与 muted-fg(.577) 亮度中点、同 hue 258.3 降饱和 |
| binance | light | foreground-strong | oklch(0.218 0.012 258.3) | 推导：复用 fg 原值 #181a20 |
| binance | light | border-muted | oklch(0.971 0.004 258.3) | 推导：border(.942) 亮度向 surface(1) 移 50%、饱和×.85 |
| binance | light | border-strong | oklch(0.617 0.005 258.3) | 推导：border 亮度向 fg(.218) 移 45%、饱和×1.15 |
| binance | dark | foreground-subtle | oklch(0.813 0.003 258.3) | 推导：fg(.942) 与 muted-fg(.683) 亮度中点 |
| binance | dark | foreground-strong | oklch(0.942 0.005 258.3) | 推导：复用 fg 原值 #eaecef |
| binance | dark | border-muted | oklch(0.236 0.014 258.3) | 推导：border(.311) 亮度向 surface(.162) 移 50%、饱和×.85 |
| binance | dark | border-strong | oklch(0.595 0.019 258.3) | 推导：border 亮度向 fg(.942) 移 45%、饱和×1.15 |

### slack（hue 255.5 冷中性）

源值：light `fg=#1d1c1d` `muted-fg=#616061` `surface=#fff` `border=#dddddd`；dark `fg=#d1d2d3` `muted-fg=#ababad` `surface=#1a1d21` `border=#3b3e42`

| slack | light | foreground-subtle | oklch(0.359 0.002 255.5) | 推导：fg(.228) 与 muted-fg(.490) 亮度中点、同 hue 255.5 降饱和 |
| slack | light | foreground-strong | oklch(0.228 0.002 255.5) | 推导：复用 fg 原值 #1d1c1d |
| slack | light | border-muted | oklch(0.949 0 255.5) | 推导：border(.898) 亮度向 surface(1) 移 50% |
| slack | light | border-strong | oklch(0.596 0 255.5) | 推导：border 亮度向 fg(.228) 移 45% |
| slack | dark | foreground-subtle | oklch(0.803 0.001 255.5) | 推导：fg(.863) 与 muted-fg(.742) 亮度中点 |
| slack | dark | foreground-strong | oklch(0.863 0.002 255.5) | 推导：复用 fg 原值 #d1d2d3 |
| slack | dark | border-muted | oklch(0.296 0.007 255.5) | 推导：border(.362) 亮度向 surface(.229) 移 50%、饱和×.85 |
| slack | dark | border-strong | oklch(0.588 0.009 255.5) | 推导：border 亮度向 fg(.863) 移 45%、饱和×1.15 |

---

## 三、附注（实施注意）

1. **notion dark** 是本表唯一 fg-strong ≠ fg 的组，因其 fg 为 87% 透明白；若实施时想保持 token 零例外，可让 fg-strong 直接 `var(--ocix-foreground)` 引用，语义一致。
2. **vercel / figma** 预设本身为纯中性灰（所有相关 token C=0），hue 285 系借用 linear 的中性 hue，视觉上无影响。
3. 上游 `ocix-presets.css` 与 `ocix-theme.css` 中**没有**可参考的 foreground 分档 / border 分档 token（上游仅 fg / muted-fg / border 三档），故 4 个新 token 为纯策展值，无上游直接可复用源；可复用的是 `.ocix-type-display`（已用于全局系）与 `--ocix-delta-flat: var(--ocix-muted-foreground)` 的语义先例。
4. 推导脚本（hex→oklch 转换 + 规则计算）存于 `/tmp/derive_tokens.mjs`，如需复现/复核可运行。
