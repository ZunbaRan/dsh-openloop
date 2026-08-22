/**
 * 主题桥接器（§12.3，纯函数，**零依赖**：不引入 antd/MUI，只输出其主题输入的普通对象）。
 *
 * - 输入：openloop token 快照（`Record<string, string>`，键为 §14 词汇表；预设系 50 + 可选全局系）。
 * - 输出：antd `ConfigProvider theme.token` 输入对象 / MUI `createTheme()` 输入对象（结构类型，非官方包）。
 * - **映射是有损的**（§12.3）：antd/MUI 的颜色语义粒度比我们的 token 粗/细不同——
 *   - antd 有 10 级 text 灰阶，我们只有 foreground / muted-foreground / foreground-subtle / foreground-strong 4 级 → 灰阶按语义就近归并；
 *   - MUI 的 `secondary` 在 openloop 无对应 token（无第二品牌色）→ 以 `chart-1` 近似；
 *   - 圆角把 `radius-*` 的 `"12px"` 解析为数字（解析失败用 0，缺失用 0）。
 *   有损近似的依据是"视觉同族就近"，做换肤近似可用；品牌级精确还原应直接消费 `var(--openloop-*)`。
 */

/** antd `ConfigProvider theme.token` 的输入形状（v1 仅映射我们有的字段；缺失字段不输出） */
export interface AntdThemeTokens {
  colorPrimary?: string
  colorPrimaryHover?: string
  colorPrimaryActive?: string
  colorInfo?: string
  colorSuccess?: string
  colorWarning?: string
  colorError?: string
  colorLink?: string
  colorBgContainer?: string
  colorBgLayout?: string
  colorBgElevated?: string
  colorText?: string
  colorTextHeading?: string
  colorTextSecondary?: string
  colorTextTertiary?: string
  colorTextQuaternary?: string
  colorBorder?: string
  colorBorderSecondary?: string
  borderRadius?: number
  borderRadiusSM?: number
  borderRadiusLG?: number
}

/** MUI `createTheme()` 的输入形状（v1 仅映射我们有的字段） */
export interface MuiThemeInput {
  palette?: {
    primary?: { main?: string; light?: string; dark?: string; contrastText?: string }
    /** openloop 无第二品牌色，以 chart-1 近似（有损，§12.3 说明） */
    secondary?: { main?: string }
    error?: { main?: string }
    warning?: { main?: string }
    info?: { main?: string }
    success?: { main?: string }
    text?: { primary?: string; secondary?: string; disabled?: string }
    background?: { default?: string; paper?: string }
    divider?: string
  }
  shape?: { borderRadius?: number }
  typography?: { fontFamily?: string }
}

type TokenMap = Readonly<Record<string, string>>

/** 取值辅助：缺失返回 undefined */
function get(tokens: TokenMap, key: string): string | undefined {
  return tokens[key]
}

/** 圆角解析：`"12px"` → 12；非数值/缺失 → 0（有损，v1 兜底） */
function radiusToNumber(tokens: TokenMap, key: string): number {
  const value = get(tokens, key)
  if (value === undefined) return 0
  const match = /^([\d.]+)/u.exec(value.trim())
  const n = match === null ? Number.NaN : Number(match[1])
  return Number.isFinite(n) ? n : 0
}

/** 圆角字段（number）排除在字符串赋值 helper 之外 */
type AntdStringTokenFields = Omit<AntdThemeTokens, 'borderRadius' | 'borderRadiusSM' | 'borderRadiusLG'>

/**
 * openloop 预设系 token → antd `ConfigProvider theme.token` 输入对象（§12.3）。
 * 有损点：colorText* 灰阶 4 级归并 antd 10 级；无 focus 系列 token（antd 的 controlOutline 等）→ 不输出。
 */
export function toAntdThemeTokens(openloopTokens: TokenMap): AntdThemeTokens {
  const out: AntdThemeTokens = {}
  const set = (key: keyof AntdStringTokenFields, value: string | undefined): void => {
    if (value !== undefined) out[key] = value
  }
  // 品牌色：primary ← 品牌主色；Hover/Active ← primary-tint/shade（antd 需要同族深浅）
  set('colorPrimary', get(openloopTokens, 'primary'))
  set('colorPrimaryHover', get(openloopTokens, 'primary-tint'))
  set('colorPrimaryActive', get(openloopTokens, 'primary-shade'))
  // 状态色一一对应（token 词汇表里成功/警告/错误/信息四态齐全）
  set('colorSuccess', get(openloopTokens, 'success'))
  set('colorWarning', get(openloopTokens, 'warning'))
  set('colorError', get(openloopTokens, 'error'))
  set('colorInfo', get(openloopTokens, 'info'))
  set('colorLink', get(openloopTokens, 'primary'))
  // 背景层：容器 ← surface；布局 ← surface-muted；浮层 ← surface-subtle（有损：antd 浮层比我们多层级）
  set('colorBgContainer', get(openloopTokens, 'surface'))
  set('colorBgLayout', get(openloopTokens, 'surface-muted'))
  set('colorBgElevated', get(openloopTokens, 'surface-subtle'))
  // 前景：4 级 openloop 灰阶归并到 antd 10 级灰阶（有损）
  set('colorText', get(openloopTokens, 'foreground'))
  set('colorTextHeading', get(openloopTokens, 'foreground-strong') ?? get(openloopTokens, 'foreground'))
  set('colorTextSecondary', get(openloopTokens, 'muted-foreground'))
  set('colorTextTertiary', get(openloopTokens, 'foreground-subtle') ?? get(openloopTokens, 'muted-foreground'))
  set('colorTextQuaternary', get(openloopTokens, 'foreground-subtle'))
  // 边框：border ← border；次边框 ← border-muted（有损归并）
  set('colorBorder', get(openloopTokens, 'border'))
  set('colorBorderSecondary', get(openloopTokens, 'border-muted') ?? get(openloopTokens, 'border'))
  // 圆角：token 值形如 "12px"，antd 需要 number
  const radiusMd = radiusToNumber(openloopTokens, 'radius-md')
  const radiusSm = radiusToNumber(openloopTokens, 'radius-sm')
  const radiusLg = radiusToNumber(openloopTokens, 'radius-lg')
  if (radiusMd > 0) out.borderRadius = radiusMd
  if (radiusSm > 0) out.borderRadiusSM = radiusSm
  if (radiusLg > 0) out.borderRadiusLG = radiusLg
  return out
}

/**
 * openloop 预设系 token → MUI `createTheme()` 输入对象（§12.3）。
 * 有损点：`secondary` 无对应 token → chart-1 近似；MUI 默认 8px 圆角 → radius-md；阴影/motion 不映射。
 */
export function toMuiThemeTokens(openloopTokens: TokenMap): MuiThemeInput {
  const out: MuiThemeInput = {}
  // palette 四态 + 品牌：primary 用主色 + tint/shade 做 light/dark；secondary 用 chart-1 近似
  const primary = get(openloopTokens, 'primary')
  const secondary = get(openloopTokens, 'chart-1')
  const error = get(openloopTokens, 'error')
  const warning = get(openloopTokens, 'warning')
  const info = get(openloopTokens, 'info')
  const success = get(openloopTokens, 'success')
  if (primary !== undefined || secondary !== undefined || error !== undefined || warning !== undefined || info !== undefined || success !== undefined) {
    const palette: NonNullable<MuiThemeInput['palette']> = {}
    if (primary !== undefined) {
      const primaryLight = get(openloopTokens, 'primary-tint')
      const primaryDark = get(openloopTokens, 'primary-shade')
      const primaryContrast = get(openloopTokens, 'primary-foreground')
      palette.primary = { main: primary }
      if (primaryLight !== undefined) palette.primary.light = primaryLight
      if (primaryDark !== undefined) palette.primary.dark = primaryDark
      if (primaryContrast !== undefined) palette.primary.contrastText = primaryContrast
    }
    if (secondary !== undefined) palette.secondary = { main: secondary }
    if (error !== undefined) palette.error = { main: error }
    if (warning !== undefined) palette.warning = { main: warning }
    if (info !== undefined) palette.info = { main: info }
    if (success !== undefined) palette.success = { main: success }
    out.palette = palette
  }
  // 文本/背景/分隔线：语义就近映射
  const textPrimary = get(openloopTokens, 'foreground')
  const textSecondary = get(openloopTokens, 'muted-foreground')
  const textDisabled = get(openloopTokens, 'foreground-subtle')
  const bgDefault = get(openloopTokens, 'surface')
  const bgPaper = get(openloopTokens, 'surface-subtle')
  const divider = get(openloopTokens, 'border')
  if (textPrimary !== undefined || textSecondary !== undefined || textDisabled !== undefined) {
    const text: NonNullable<NonNullable<MuiThemeInput['palette']>['text']> = {}
    if (textPrimary !== undefined) text.primary = textPrimary
    if (textSecondary !== undefined) text.secondary = textSecondary
    if (textDisabled !== undefined) text.disabled = textDisabled
    out.palette = { ...out.palette, text }
  }
  if (bgDefault !== undefined || bgPaper !== undefined) {
    const background: NonNullable<NonNullable<MuiThemeInput['palette']>['background']> = {}
    if (bgDefault !== undefined) background.default = bgDefault
    if (bgPaper !== undefined) background.paper = bgPaper
    out.palette = { ...out.palette, background }
  }
  if (divider !== undefined) out.palette = { ...out.palette, divider }
  // 圆角：MUI shape.borderRadius 为 number
  const radiusMd = radiusToNumber(openloopTokens, 'radius-md')
  if (radiusMd > 0) out.shape = { borderRadius: radiusMd }
  // 字体：若输入含全局系 font-sans（§14）则顺带映射
  const fontFamily = get(openloopTokens, 'font-sans')
  if (fontFamily !== undefined) out.typography = { fontFamily }
  return out
}
