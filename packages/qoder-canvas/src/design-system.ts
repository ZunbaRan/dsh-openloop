/**
 * design-system.ts —— 设计原语节点的样式白名单 + 值校验 + 语义预设（单一事实源）。
 *
 * 0.11.0 DSL 复刻 baoyu-design 的安全模型核心：
 * - Agent 不可信任 → style 走【属性白名单 + 值类型校验】（fail-closed）
 * - 排除项（安全红线）：position / zIndex / transform / 任意 url() /
 *   任意 CSS 字符串 / 伪类 / media query——那是 iframe 的世界
 * - 语义预设（shadow/gradient/tone 枚举）优先于自由值——design tokens 生效，
 *   一致性由枚举保证（三层语法的第一层）
 *
 * 本模块被 dsl.ts（校验）与 client/DesignNodes.tsx（渲染）共享——白名单只此一份。
 */

/** style 属性的值类型描述 */
export type StyleValueType =
  | { readonly type: 'color' } // #hex / rgb() / hsl() / 命名色（正则校验）
  | { readonly type: 'length'; readonly max: number } // number（px）| 'Npx' | 'N%' | 'Nrem'
  | { readonly type: 'enum'; readonly values: readonly string[] }
  | { readonly type: 'number'; readonly min: number; readonly max: number }

/** style 白名单（~30 安全属性——对齐计划中的三层语法第二层） */
export const STYLE_WHITELIST: Readonly<Record<string, StyleValueType>> = {
  // 排版
  color: { type: 'color' },
  fontSize: { type: 'length', max: 96 },
  fontWeight: { type: 'enum', values: ['300', '400', '500', '600', '700', '800'] },
  textAlign: { type: 'enum', values: ['left', 'center', 'right'] },
  lineHeight: { type: 'number', min: 0.8, max: 3 },
  letterSpacing: { type: 'length', max: 8 },
  fontFamily: { type: 'enum', values: ['sans', 'serif', 'mono'] },
  textTransform: { type: 'enum', values: ['none', 'uppercase', 'lowercase', 'capitalize'] },
  // 布局
  display: { type: 'enum', values: ['flex', 'block', 'grid'] },
  flexDirection: { type: 'enum', values: ['row', 'column'] },
  justifyContent: { type: 'enum', values: ['flex-start', 'center', 'flex-end', 'space-between', 'space-around'] },
  alignItems: { type: 'enum', values: ['flex-start', 'center', 'flex-end', 'stretch'] },
  gap: { type: 'length', max: 96 },
  padding: { type: 'length', max: 96 },
  margin: { type: 'length', max: 48 },
  width: { type: 'length', max: 1600 },
  maxWidth: { type: 'length', max: 1600 },
  minHeight: { type: 'length', max: 800 },
  flex: { type: 'enum', values: ['none', 'grow', 'full'] },
  flexWrap: { type: 'enum', values: ['nowrap', 'wrap'] },
  // 盒子
  backgroundColor: { type: 'color' },
  borderRadius: { type: 'length', max: 48 },
  borderWidth: { type: 'length', max: 8 },
  borderStyle: { type: 'enum', values: ['solid', 'dashed', 'none'] },
  borderColor: { type: 'color' },
  opacity: { type: 'number', min: 0, max: 1 },
  // 语义预设（第一层——非自由值）
  shadow: { type: 'enum', values: ['none', 'sm', 'md', 'lg'] },
  gradient: { type: 'enum', values: ['none', 'warm', 'cool', 'sunset', 'ocean', 'forest'] },
  tone: { type: 'enum', values: ['default', 'success', 'warn', 'error', 'info', 'muted'] },
}

export type StylePropName = keyof typeof STYLE_WHITELIST

/** 预定义动画枚举（纯 CSS @keyframes，无 JS） */
export const ANIMATIONS = ['none', 'fade-in', 'slide-up', 'slide-down', 'scale-in', 'pulse', 'float'] as const
export type AnimationName = typeof ANIMATIONS[number]

/** 内置图标白名单（lucide 风格，DesignNodes 渲染） */
export const ICONS = [
  'star', 'heart', 'check', 'x', 'plus', 'arrow-right', 'arrow-up', 'arrow-down',
  'zap', 'shield', 'settings', 'search', 'bell', 'clock', 'calendar', 'user',
  'users', 'mail', 'phone', 'home', 'globe', 'rocket', 'target', 'trending-up',
  'trending-down', 'layers', 'grid', 'list', 'eye', 'lock', 'cloud', 'database',
] as const
export type IconName = typeof ICONS[number]

// ---- 值校验器（dsl.ts 的 checkProp 'style' 分支调用；纯函数） ----

const COLOR_RE = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0?\.\d+|1|0)\s*)?\)|hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*(0?\.\d+|1|0)\s*)?\)?|[a-zA-Z]{3,20})$/
const LENGTH_RE = /^(\d{1,4}(\.\d+)?)(px|%|rem)?$/

/** 校验单个 style 值（返回错误消息或 null=通过） */
export function checkStyleValue(prop: string, value: unknown): string | null {
  const rule = STYLE_WHITELIST[prop]
  if (rule === undefined) return `unknown style property "${prop}"; allowed: ${Object.keys(STYLE_WHITELIST).join(', ')}`
  switch (rule.type) {
    case 'color':
      if (typeof value !== 'string' || !COLOR_RE.test(value)) return `"${String(value)}" is not a valid color (use #hex, rgb(), hsl(), or a named color)`
      return null
    case 'length': {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= rule.max) return null
      if (typeof value === 'string' && LENGTH_RE.test(value)) {
        const n = parseFloat(value)
        if (n >= 0 && n <= rule.max) return null
      }
      return `"${String(value)}" must be a length ≤ ${rule.max} (number=px, or "Npx"/"N%"/"Nrem")`
    }
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value) || value < rule.min || value > rule.max) {
        return `"${String(value)}" must be a number in [${rule.min}, ${rule.max}]`
      }
      return null
    case 'enum':
      if (typeof value !== 'string' || !rule.values.includes(value)) return `"${String(value)}" must be one of ${rule.values.join('/')}`
      return null
  }
}

// ---- 语义预设 → CSS 值（渲染层映射；校验层不使用） ----

export const SHADOW_PRESETS: Readonly<Record<string, string>> = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,.08)',
  md: '0 4px 12px rgba(0,0,0,.12)',
  lg: '0 12px 32px rgba(0,0,0,.18)',
}

export const GRADIENT_PRESETS: Readonly<Record<string, string>> = {
  none: 'none',
  warm: 'linear-gradient(135deg, #fdf2f0, #fde8d7)',
  cool: 'linear-gradient(135deg, #eff4ff, #e0ecfb)',
  sunset: 'linear-gradient(135deg, #ff9a6b, #ff5e7e)',
  ocean: 'linear-gradient(135deg, #5b8cff, #38c6ff)',
  forest: 'linear-gradient(135deg, #2fb37a, #86d9a3)',
}

export const FONT_STACKS: Readonly<Record<string, string>> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
}

/** tone → 前景/背景色对（设计节点的语义配色） */
export const TONE_COLORS: Readonly<Record<string, { fg: string; bg: string }>> = {
  default: { fg: 'var(--dsw-alias-label-primary, inherit)', bg: 'transparent' },
  success: { fg: '#15803d', bg: 'rgba(34,197,94,.10)' },
  warn: { fg: '#b45309', bg: 'rgba(245,158,11,.12)' },
  error: { fg: '#b91c1c', bg: 'rgba(225,29,72,.10)' },
  info: { fg: '#1d4ed8', bg: 'rgba(59,130,246,.10)' },
  muted: { fg: 'var(--dsw-alias-label-caption, #888)', bg: 'transparent' },
}

/** @keyframes 生成（DesignNodes 在 surface 层一次性注入） */
export const KEYFRAMES_CSS: string = [
  '@keyframes openloop-fade-in { from { opacity: 0 } to { opacity: 1 } }',
  '@keyframes openloop-slide-up { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }',
  '@keyframes openloop-slide-down { from { opacity: 0; transform: translateY(-12px) } to { opacity: 1; transform: translateY(0) } }',
  '@keyframes openloop-scale-in { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }',
  '@keyframes openloop-pulse { 0%,100% { opacity: 1 } 50% { opacity: .6 } }',
  '@keyframes openloop-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-5px) } }',
].join('\n')

/** animation 名 → CSS animation 简写值（duration/delay 由节点参数填） */
export function animationCss(name: string, durationMs: number, delayMs: number): string {
  const keyframe = `openloop-${name}`
  const dur = Number.isFinite(durationMs) && durationMs > 0 && durationMs <= 4000 ? durationMs : 400
  const del = Number.isFinite(delayMs) && delayMs > 0 && delayMs <= 4000 ? delayMs : 0
  if (name === 'pulse' || name === 'float') return `${keyframe} ${Math.max(dur, 1000)}ms ease-in-out ${del}ms infinite`
  return `${keyframe} ${dur}ms ease-out ${del}ms both`
}
