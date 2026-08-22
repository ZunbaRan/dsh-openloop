/**
 * heading 渲染器：level 1–4 映射全局字阶（type-display/title/label/meta）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { headingLevelStyle } from '../style.ts'

export function HeadingRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const text = typeof root.text === 'string' ? root.text : ''
  const level = typeof root.level === 'number' ? Math.max(1, Math.min(4, Math.trunc(root.level))) : 1
  const align = typeof root.align === 'string' ? root.align : 'left'

  const style: CSSProperties = {
    ...headingLevelStyle(level),
    margin: 0,
    color: 'var(--openloop-foreground)',
    textAlign: align as CSSProperties['textAlign'],
    wordBreak: 'break-word',
  }
  const Tag = (['h1', 'h2', 'h3', 'h4'] as const)[level - 1] ?? 'h1'
  return (
    <Tag data-openloop-preset="heading" data-openloop-level={String(level)} style={style}>
      {text}
    </Tag>
  )
}
