/**
 * badge 渲染器：填充型小胶囊。样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { isBadgeTone, toneColors } from '../style.ts'

const pill: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 9px',
  borderRadius: 'var(--openloop-radius-md)',
  fontSize: 'var(--openloop-type-micro, 11px)',
  fontWeight: 600,
  lineHeight: 1.6,
  whiteSpace: 'nowrap',
}

export function BadgeRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const label = typeof root.label === 'string' ? root.label : ''
  const tone = isBadgeTone(root.tone) ? root.tone : 'neutral'
  const colors = toneColors(tone)
  return (
    <span data-openloop-preset="badge" data-openloop-tone={tone} style={{ ...pill, background: colors.background, color: colors.foreground }}>
      {label}
    </span>
  )
}
