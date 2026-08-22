/**
 * text 渲染器（plain 文本）。
 * 样式 100% 来自 var(--openloop-*)；字阶走全局系（新 token 用 var() 兜底）。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { textSizeStyle } from '../style.ts'

const TONE_COLOR: Record<string, string> = {
  default: 'var(--openloop-foreground)',
  muted: 'var(--openloop-muted-foreground)',
  subtle: 'var(--openloop-foreground-subtle, var(--openloop-muted-foreground))',
  strong: 'var(--openloop-foreground-strong, var(--openloop-foreground))',
}

const base: CSSProperties = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
}

export function TextRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const text = typeof root.text === 'string' ? root.text : ''
  const size = typeof root.size === 'string' ? root.size : 'md'
  const tone = typeof root.tone === 'string' ? root.tone : 'default'
  const align = typeof root.align === 'string' ? root.align : 'left'

  const style: CSSProperties = {
    ...base,
    ...textSizeStyle(size),
    color: TONE_COLOR[tone] ?? TONE_COLOR.default,
    textAlign: align as CSSProperties['textAlign'],
  }
  return (
    <div data-openloop-preset="text" data-openloop-size={size} data-openloop-tone={tone} style={style}>
      {text}
    </div>
  )
}
