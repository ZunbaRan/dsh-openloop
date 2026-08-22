/**
 * gauge 渲染器。
 * 参照 DeclarativeAdvancedPrimitives.GaugePrimitive：SVG 圆弧（stroke-dasharray
 * 进度），chart-1 弧 + 可选 tone 阈值色；中心数值 + 下方文案。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title } from '../style.ts'

const containerStyle: CSSProperties = { ...panel, padding: '12px 14px', minWidth: 0 }

const titleStyle: CSSProperties = { ...title, marginBottom: 10 }

const labelStyle: CSSProperties = {
  ...title,
  fontSize: 13,
  marginTop: 10,
  wordBreak: 'break-word',
}

const detailStyle: CSSProperties = { ...meta, marginTop: 4, wordBreak: 'break-word' }

const rangeStyle: CSSProperties = { ...meta, marginTop: 8 }

function gaugeColor(tone: unknown): string {
  if (tone === 'success') return 'var(--openloop-success)'
  if (tone === 'warning') return 'var(--openloop-warning)'
  if (tone === 'error') return 'var(--openloop-error)'
  if (tone === 'info') return 'var(--openloop-info)'
  return 'var(--openloop-chart-1)'
}

export function GaugeRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const rawValue = typeof root.value === 'number' && Number.isFinite(root.value) ? root.value : 0
  const value = Math.max(0, Math.min(100, rawValue))
  const progress = value / 100
  const circumference = 2 * Math.PI * 52
  const unit = typeof root.unit === 'string' ? root.unit : undefined
  const label = typeof root.label === 'string' ? root.label : undefined
  const detail = typeof root.detail === 'string' ? root.detail : undefined
  const displayValue = `${Math.round(value)}${unit ? ` ${unit}` : ''}`

  return (
    <div data-openloop-preset="gauge" data-openloop-value={String(Math.round(value))} style={containerStyle}>
      {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <svg
          viewBox="0 0 132 132"
          style={{ width: 128, height: 128, flexShrink: 0 }}
          role="meter"
          aria-label={label ?? panelTitle ?? 'gauge'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(value)}
        >
          <circle cx="66" cy="66" r="52" fill="none" stroke="var(--openloop-surface-muted)" strokeWidth="12" />
          <circle
            cx="66"
            cy="66"
            r="52"
            fill="none"
            stroke={gaugeColor(root.tone)}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            transform="rotate(-90 66 66)"
          />
          <text x="66" y="62" textAnchor="middle" fontSize="18" fontWeight={650} fill="var(--openloop-foreground)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {displayValue}
          </text>
          <text x="66" y="82" textAnchor="middle" fontSize="10" fill="var(--openloop-muted-foreground)">{Math.round(progress * 100)}%</text>
        </svg>
        <div style={{ minWidth: 0, flex: 1 }}>
          {label !== undefined ? <div style={labelStyle}>{label}</div> : null}
          {detail !== undefined ? <div style={detailStyle}>{detail}</div> : null}
          <div style={rangeStyle}>0 – 100</div>
        </div>
      </div>
    </div>
  )
}
