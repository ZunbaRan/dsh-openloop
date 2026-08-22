/**
 * divider 渲染器：横线；带 label 时左右横线 + 居中标签。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'

const lineStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  margin: '6px 0',
}

const rule: CSSProperties = {
  flex: 1,
  height: 1,
  background: 'var(--openloop-border)',
}

const labelStyle: CSSProperties = {
  fontSize: 'var(--openloop-type-micro, 11px)',
  fontWeight: 600,
  color: 'var(--openloop-muted-foreground)',
  whiteSpace: 'nowrap',
}

export function DividerRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const label = typeof root.label === 'string' && root.label.length > 0 ? root.label : undefined
  return (
    <div data-openloop-preset="divider" data-openloop-has-label={label ? 'true' : 'false'} style={lineStyle} role="separator" aria-orientation="horizontal">
      <span style={rule} />
      {label !== undefined ? <span style={labelStyle}>{label}</span> : null}
      {label !== undefined ? <span style={rule} /> : null}
    </div>
  )
}
