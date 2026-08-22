/**
 * sparkline 渲染器。
 * 参照 DeclarativeAdvancedPrimitives.SparklinePrimitive：手绘 SVG polyline，
 * chart-1 着色，零第三方图表库。样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, numeric, panel } from '../style.ts'

const VIEW_W = 160
const VIEW_H = 40

const containerStyle: CSSProperties = {
  ...panel,
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minWidth: 0,
}

const textBlockStyle: CSSProperties = {
  minWidth: 0,
  flex: 1,
}

const valueStyle: CSSProperties = {
  ...numeric,
  fontSize: 18,
  lineHeight: 1.3,
  fontWeight: 650,
  color: 'var(--openloop-foreground)',
  wordBreak: 'break-word',
}

function compactTick(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function SparklineRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const label = typeof root.label === 'string' ? root.label : undefined
  const displayValue = root.value
  const showExtremes = root.extremes === true

  const values = (Array.isArray(root.series) ? root.series : [])
    .map(Number)
    .filter(Number.isFinite)
    .slice(0, 120)

  if (values.length === 0) {
    return (
      <div data-openloop-preset="sparkline" data-openloop-count="0" style={{ ...panel, padding: '12px 14px' }}>
        <div style={meta}>暂无数据</div>
      </div>
    )
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const extent = max - min || 1
  const points = values.map((value, index) => {
    const x = 4 + (index / (values.length - 1)) * (VIEW_W - 8)
    const y = VIEW_H - 5 - ((value - min) / extent) * (VIEW_H - 10)
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')

  const hasText = label !== undefined || displayValue !== undefined

  return (
    <div data-openloop-preset="sparkline" data-openloop-count={String(values.length)} style={containerStyle}>
      {hasText ? (
        <div style={textBlockStyle}>
          {label !== undefined ? <div style={meta}>{label}</div> : null}
          {displayValue !== undefined ? <div style={valueStyle}>{String(displayValue)}</div> : null}
        </div>
      ) : null}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: 140, height: 40, flexShrink: 0 }}
        role="img"
        aria-label={label ?? 'sparkline'}
      >
        <polyline
          points={points}
          fill="none"
          stroke="var(--openloop-chart-1)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showExtremes ? (
          <>
            <text x="6" y="14" fontSize="9" fill="var(--openloop-muted-foreground)">{compactTick(max)}</text>
            <text x="6" y={VIEW_H - 9} fontSize="9" fill="var(--openloop-muted-foreground)">{compactTick(min)}</text>
          </>
        ) : null}
      </svg>
    </div>
  )
}
