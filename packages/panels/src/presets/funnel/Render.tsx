/**
 * funnel 渲染器。
 * 参照 DeclarativeAdvancedPrimitives.FunnelPrimitive：段宽按 value/最大值的比例，
 * 轨道 var(--openloop-surface-muted)；着色改用 chart-seq-1..5 渐层（值越大越深）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isFiniteNumber } from '../common.ts'
import { meta, panel, title } from '../style.ts'

const containerStyle: CSSProperties = { ...panel, padding: '12px 14px', minWidth: 0 }

const titleStyle: CSSProperties = { ...title, marginBottom: 10 }

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  minWidth: 0,
}

const labelStyle: CSSProperties = {
  ...meta,
  flexShrink: 0,
  width: 120,
  fontWeight: 500,
  color: 'var(--openloop-foreground)',
  wordBreak: 'break-word',
}

const trackStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: 28,
  overflow: 'hidden',
  borderRadius: 'var(--openloop-radius-md)',
  background: 'var(--openloop-surface-muted)',
}

const valueStyle: CSSProperties = {
  ...meta,
  flexShrink: 0,
  color: 'var(--openloop-foreground)',
  fontVariantNumeric: 'tabular-nums',
}

/** value 比例 → chart-seq-1..5（0 最浅，1 最深） */
function seqStep(ratio: number): number {
  return Math.max(1, Math.min(5, Math.ceil(Math.max(0, Math.min(1, ratio)) * 5)))
}

export function FunnelRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined

  const stages = (Array.isArray(root.stages) ? root.stages : [])
    .map(asRecord)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .flatMap((entry) => {
      const label = typeof entry.label === 'string' && entry.label.length > 0 ? entry.label : undefined
      const value = isFiniteNumber(entry.value) ? entry.value : undefined
      if (!label || value === undefined) return []
      return [{ label, value, detail: typeof entry.detail === 'string' ? entry.detail : undefined }]
    })
    .slice(0, 8)

  if (stages.length === 0) {
    return (
      <div data-openloop-preset="funnel" data-openloop-count="0" style={containerStyle}>
        {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
        <div style={meta}>暂无数据</div>
      </div>
    )
  }

  const maximum = Math.max(...stages.map((stage) => Math.max(0, stage.value)), 1)

  return (
    <div data-openloop-preset="funnel" data-openloop-count={String(stages.length)} style={containerStyle}>
      {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {stages.map((stage) => {
          const ratio = Math.max(0, stage.value) / maximum
          const width = Math.max(10, ratio * 100)
          const fill = `var(--openloop-chart-seq-${seqStep(ratio)})`
          return (
            <div key={stage.label} style={rowStyle}>
              <span style={labelStyle}>{stage.label}</span>
              <div style={trackStyle} aria-hidden="true">
                <div style={{ height: '100%', width: `${width}%`, borderRadius: 'var(--openloop-radius-md)', background: fill }} />
              </div>
              <span style={valueStyle}>{stage.value}{stage.detail !== undefined ? ` · ${stage.detail}` : ''}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
