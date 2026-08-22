/**
 * tag 渲染器：描边型胶囊（背景透明 + tone 色边框/前景）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { isBadgeTone, toneColors } from '../style.ts'

const pill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '1px 9px',
  borderRadius: 'var(--openloop-radius-md)',
  fontSize: 'var(--openloop-type-micro, 11px)',
  fontWeight: 500,
  lineHeight: 1.6,
  whiteSpace: 'nowrap',
  background: 'transparent',
}

export function TagRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const label = typeof root.label === 'string' ? root.label : ''
  const tone = isBadgeTone(root.tone) ? root.tone : 'neutral'
  const colors = toneColors(tone)
  return (
    <span data-openloop-preset="tag" data-openloop-tone={tone} style={{ ...pill, border: `1px solid ${colors.border}`, color: colors.foreground }}>
      {label}
    </span>
  )
}
