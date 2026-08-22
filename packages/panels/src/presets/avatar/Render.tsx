/**
 * avatar 渲染器：name 首字 + 色圆（tone 缺省按 name 哈希稳定取色）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'

const AVATAR_TONES = ['primary', 'info', 'success', 'warning', 'error'] as const

const SIZES: Record<string, number> = { sm: 24, md: 32, lg: 40 }

/** 确定性哈希取色：同名同色，切预设/明暗自动跟随 token */
function avatarColor(name: string, tone: unknown): string {
  const explicit = (AVATAR_TONES as readonly string[]).includes(String(tone)) ? String(tone) : undefined
  if (explicit) return `var(--openloop-${explicit})`
  let hash = 0
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0
  const picked = AVATAR_TONES[hash % AVATAR_TONES.length] ?? 'primary'
  return `var(--openloop-${picked})`
}

export function AvatarRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const name = typeof root.name === 'string' ? root.name : ''
  const size = SIZES[String(root.size)] ?? SIZES.md ?? 32
  const initial = Array.from(name.trim())[0]?.toUpperCase() ?? '?'

  const circle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    borderRadius: '9999px',
    background: avatarColor(name, root.tone),
    color: 'var(--openloop-primary-foreground, #ffffff)',
    fontSize: size >= 40 ? 18 : size >= 32 ? 15 : 12,
    fontWeight: 650,
    lineHeight: 1,
    flexShrink: 0,
    userSelect: 'none',
  }
  return (
    <span data-openloop-preset="avatar" data-openloop-size={String(root.size ?? 'md')} style={circle} aria-label={name} role="img">
      {initial}
    </span>
  )
}
