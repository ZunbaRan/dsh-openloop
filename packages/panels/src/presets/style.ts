/**
 * 预设组件共享内联样式常量。
 * 硬约束：颜色/圆角/阴影 100% 来自 var(--openloop-*)，禁止硬编码色值。
 * 字阶参照 §14 全局系（display 24 / title 18 / label 13 / meta 12 / micro 11）。
 */
import type { CSSProperties } from 'react'

/** 面板外壳：预设组件自持卡片（border + surface + radius-md） */
export const panel: CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid var(--openloop-border)',
  borderRadius: 'var(--openloop-radius-md)',
  background: 'var(--openloop-surface)',
  color: 'var(--openloop-foreground)',
}

/** hero 提升层：阴影 + 更强调的边框（预设换肤时 shadow/border-strong 随预设变化） */
export const panelHero: CSSProperties = {
  ...panel,
  borderColor: 'var(--openloop-border-strong)',
  boxShadow: 'var(--openloop-shadow-1)',
}

/** 区块标题（13px label 档） */
export const title: CSSProperties = {
  margin: 0,
  fontSize: 13,
  lineHeight: 1.4,
  fontWeight: 600,
  color: 'var(--openloop-foreground)',
}

/** 次要文本（12px meta 档） */
export const meta: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
}

/** 辅助微文本（11px micro 档） */
export const micro: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.45,
  color: 'var(--openloop-muted-foreground)',
}

/** 数值/金额专用：等宽数字 */
export const numeric: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}

/** 数值大值（hero / 大数字），参照 .ocix-type-display */
export const displayValue: CSSProperties = {
  ...numeric,
  fontSize: 24,
  lineHeight: 1.25,
  fontWeight: 650,
  letterSpacing: '-0.02em',
  color: 'var(--openloop-foreground)',
}

/** 常规数值（18px title 档 + 等宽数字） */
export const standardValue: CSSProperties = {
  ...numeric,
  fontSize: 18,
  lineHeight: 1.3,
  fontWeight: 650,
  color: 'var(--openloop-foreground)',
}

/**
 * 全局字阶映射（§14：type-display/title/label/meta/micro，theme 包并行加入）。
 * level 1–4 → display / title / label / meta；新 token 用 var() 兜底旧值。
 */
export function headingLevelStyle(level: number): CSSProperties {
  switch (level) {
    case 1:
      return { fontSize: 'var(--openloop-type-display, 24px)', lineHeight: 1.25, fontWeight: 600, letterSpacing: '-0.02em' }
    case 2:
      return { fontSize: 'var(--openloop-type-title, 18px)', lineHeight: 1.3, fontWeight: 650, letterSpacing: '-0.02em' }
    case 3:
      return { fontSize: 'var(--openloop-type-label, 13px)', lineHeight: 1.4, fontWeight: 600 }
    default:
      return { fontSize: 'var(--openloop-type-meta, 12px)', lineHeight: 1.5, fontWeight: 500 }
  }
}

/** 文本 size → 全局字阶（§14 同一张表） */
export function textSizeStyle(size: string): CSSProperties {
  switch (size) {
    case 'xs':
      return { fontSize: 'var(--openloop-type-micro, 11px)', lineHeight: 1.45 }
    case 'sm':
      return { fontSize: 'var(--openloop-type-meta, 12px)', lineHeight: 1.5 }
    case 'lg':
      return { fontSize: 'var(--openloop-type-title, 18px)', lineHeight: 1.3 }
    case 'xl':
      return { fontSize: 'var(--openloop-type-display, 24px)', lineHeight: 1.25 }
    default: // md
      return { fontSize: 'var(--openloop-type-label, 13px)', lineHeight: 1.55 }
  }
}

/** badge/tag 共用 tone → 前景/背景/边框件套（同进同退，§13.1 半 token 化禁令） */
export type BadgeTone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'error'

export const BADGE_TONES: readonly BadgeTone[] = ['neutral', 'primary', 'info', 'success', 'warning', 'error']

export function isBadgeTone(value: unknown): value is BadgeTone {
  return typeof value === 'string' && (BADGE_TONES as readonly string[]).includes(value)
}

export function toneColors(tone: BadgeTone): { background: string; foreground: string; border: string } {
  switch (tone) {
    case 'neutral':
      return {
        background: 'var(--openloop-surface-muted)',
        foreground: 'var(--openloop-muted-foreground)',
        border: 'var(--openloop-border)',
      }
    case 'primary':
      return {
        background: 'var(--openloop-primary)',
        foreground: 'var(--openloop-primary-foreground)',
        border: 'var(--openloop-primary)',
      }
    default: // info / success / warning / error：同 token 三件套
      return {
        background: `var(--openloop-${tone}-background)`,
        foreground: `var(--openloop-${tone})`,
        border: `var(--openloop-${tone}-border)`,
      }
  }
}
