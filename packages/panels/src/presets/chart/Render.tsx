/**
 * chart 渲染器（多 variant 单 kind）。
 * 参照 DeclarativeInteractiveView.DeclarativeChart：手绘 SVG 零图表库，
 * chart-1..8 分类色；bar 分组柱 0 基、line 折线+点（area 可填充）、
 * donut 多环（≤4）+ 比例标注 + hover tooltip（组件内 state）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import { useState, type CSSProperties, type ReactElement } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title } from '../style.ts'

const CHART_COLORS = [
  'var(--openloop-chart-1)',
  'var(--openloop-chart-2)',
  'var(--openloop-chart-3)',
  'var(--openloop-chart-4)',
  'var(--openloop-chart-5)',
  'var(--openloop-chart-6)',
  'var(--openloop-chart-7)',
  'var(--openloop-chart-8)',
]

const WIDTH = 680
const HEIGHT = 260
const MARGIN = { top: 16, right: 18, bottom: 42, left: 48 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom

const containerStyle: CSSProperties = { ...panel, padding: '12px 14px', minWidth: 0 }

const titleStyle: CSSProperties = { ...title, marginBottom: 10 }

const legendStyle: CSSProperties = {
  marginTop: 10,
  display: 'flex',
  flexWrap: 'wrap',
  gap: '4px 16px',
}

const legendButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-muted-foreground)',
}

const tooltipStyle: CSSProperties = {
  position: 'absolute',
  zIndex: 10,
  minWidth: 112,
  transform: 'translate(-50%, -100%)',
  borderRadius: 'var(--openloop-radius-md)',
  border: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface)',
  padding: '6px 10px',
  boxShadow: 'var(--openloop-shadow-1)',
  pointerEvents: 'none',
}

interface ChartSeries {
  key: string
  label: string | undefined
}

interface TooltipState {
  x: number
  y: number
  label: string
  series: string
  value: string
}

function compactTick(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

function displayLabel(value: unknown): string {
  return String(value ?? '')
}

function parseSeries(raw: unknown): ChartSeries[] {
  return (Array.isArray(raw) ? raw : [])
    .map(asRecord)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .map((entry) => ({
      key: typeof entry.key === 'string' ? entry.key : '',
      label: typeof entry.label === 'string' ? entry.label : undefined,
    }))
    .filter((entry) => entry.key.length > 0)
}

export function ChartRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const variant = root.variant === 'line' || root.variant === 'donut' ? root.variant : 'bar'
  const xKey = typeof root.xKey === 'string' && root.xKey.length > 0 ? root.xKey : 'label'
  const legendVisible = root.legend !== false
  const referenceLine = typeof root.referenceLine === 'number' && Number.isFinite(root.referenceLine) ? root.referenceLine : undefined
  const withArea = root.area === true

  const rows = (Array.isArray(root.data) ? root.data : [])
    .map(asRecord)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
  const allSeries = parseSeries(root.series)

  const [hiddenKeys, setHiddenKeys] = useState<string[]>([])
  const hidden = new Set(hiddenKeys)
  const series = allSeries.filter((entry) => !hidden.has(entry.key))
  const toggleSeries = (key: string) => {
    setHiddenKeys((current) => (current.includes(key) ? current.filter((k) => k !== key) : [...current, key]))
  }

  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const legend = allSeries.length > 1 && legendVisible ? (
    <div style={legendStyle}>
      {allSeries.map((item, index) => {
        const isHidden = hidden.has(item.key)
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => toggleSeries(item.key)}
            aria-pressed={!isHidden}
            style={{ ...legendButtonStyle, ...(isHidden ? { opacity: 0.4, textDecoration: 'line-through' } : null) }}
          >
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: CHART_COLORS[index % CHART_COLORS.length], flexShrink: 0 }} />
            {item.label ?? item.key}
          </button>
        )
      })}
    </div>
  ) : null

  const empty = (
    <div data-openloop-preset="chart" data-openloop-variant={variant} data-openloop-count="0" style={containerStyle}>
      {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
      <div style={meta}>暂无数据</div>
    </div>
  )

  if (rows.length === 0 || series.length === 0) return empty

  if (variant === 'donut') {
    const donutSeries = series.slice(0, 4)
    const ringWidth = 16
    const ringGap = 4
    const outerRadius = 76
    const totalOf = (seriesItem: ChartSeries): number =>
      rows.reduce((sum, row) => sum + Math.max(0, Number(row[seriesItem.key]) || 0), 0)
    const firstSeries = donutSeries[0]
    if (!firstSeries) return empty
    const firstTotal = totalOf(firstSeries)
    const singleRing = donutSeries.length === 1
    return (
      <div data-openloop-preset="chart" data-openloop-variant="donut" data-openloop-count={String(rows.length)} style={containerStyle}>
        {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
        <div
          style={{ position: 'relative', maxWidth: 240, margin: '0 auto' }}
          onPointerLeave={() => setTooltip(null)}
        >
          <svg viewBox="0 0 220 220" style={{ display: 'block', width: '100%', height: 'auto' }} role="group" aria-label={panelTitle ?? 'donut chart'}>
            {donutSeries.map((item, ringIndex) => {
              const radius = outerRadius - ringIndex * (ringWidth + ringGap)
              const parts = rows
                .map((row) => ({
                  label: displayLabel(row[xKey]),
                  value: Math.max(0, Number(row[item.key]) || 0),
                }))
                .filter((part) => part.value > 0)
              const total = parts.reduce((sum, part) => sum + part.value, 0)
              let offset = 0
              return (
                <g key={item.key}>
                  <circle cx="110" cy="110" r={radius} fill="none" stroke="var(--openloop-surface-muted)" strokeWidth={ringWidth} aria-hidden="true" />
                  {parts.map((part) => {
                    const fraction = total > 0 ? part.value / total : 0
                    const start = offset
                    offset += fraction
                    const angle = (start + fraction / 2) * Math.PI * 2 - Math.PI / 2
                    const showProportion = singleRing && fraction >= 0.05
                    const tooltipState: TooltipState = {
                      x: 110 + Math.cos(angle) * radius,
                      y: 110 + Math.sin(angle) * radius,
                      label: part.label,
                      series: item.label ?? item.key,
                      value: `${compactTick(part.value)} · ${new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(fraction)}`,
                    }
                    return (
                      <g key={`${item.key}:${part.label}`}>
                        <circle
                          cx="110"
                          cy="110"
                          r={radius}
                          fill="none"
                          pathLength="100"
                          stroke={CHART_COLORS[ringIndex % CHART_COLORS.length]}
                          strokeWidth={ringWidth}
                          strokeDasharray={`${fraction * 100} ${100 - fraction * 100}`}
                          strokeDashoffset={-start * 100}
                          transform="rotate(-90 110 110)"
                          role="graphics-symbol"
                          aria-label={`${part.label} · ${item.label ?? item.key}: ${tooltipState.value}`}
                          onPointerEnter={() => setTooltip(tooltipState)}
                          onFocus={() => setTooltip(tooltipState)}
                          onBlur={() => setTooltip(null)}
                        />
                        {showProportion ? (
                          <text
                            x={110 + Math.cos(angle) * radius * 0.62}
                            y={110 + Math.sin(angle) * radius * 0.62}
                            textAnchor="middle"
                            fontSize="10"
                            fill="var(--openloop-foreground)"
                          >
                            {new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 0 }).format(fraction)}
                          </text>
                        ) : null}
                      </g>
                    )
                  })}
                </g>
              )
            })}
            <text x="110" y="104" textAnchor="middle" fontSize="11" fill="var(--openloop-muted-foreground)">{firstSeries.label ?? firstSeries.key}</text>
            <text x="110" y="130" textAnchor="middle" fontSize="18" fontWeight={650} fill="var(--openloop-foreground)" style={{ fontVariantNumeric: 'tabular-nums' }}>{compactTick(firstTotal)}</text>
          </svg>
          {tooltip ? (
            <div role="tooltip" style={{ ...tooltipStyle, left: `${(tooltip.x / 220) * 100}%`, top: `${(tooltip.y / 220) * 100}%` }}>
              <div style={meta}>{tooltip.label}</div>
              <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 12, lineHeight: 1.5, color: 'var(--openloop-foreground)' }}>
                <span>{tooltip.series}</span>
                <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{tooltip.value}</span>
              </div>
            </div>
          ) : null}
        </div>
        {legend}
      </div>
    )
  }

  // bar / line：共享 0 基值域
  const values = rows.flatMap((row) => series.map((item) => Number(row[item.key])).filter(Number.isFinite))
  if (values.length === 0) return empty

  const minValue = Math.min(0, ...values)
  const maxValue = Math.max(0, ...values)
  const extent = maxValue - minValue || 1
  const xAt = (index: number): number => MARGIN.left + ((index + 0.5) / rows.length) * PLOT_WIDTH
  const yAt = (value: number): number => MARGIN.top + ((maxValue - value) / extent) * PLOT_HEIGHT
  const baseline = yAt(0)
  const labelEvery = Math.max(1, Math.ceil(rows.length / 8))

  const bars: ReactElement[] = []
  if (variant === 'bar') {
    rows.forEach((row, rowIndex) => {
      const groupWidth = (PLOT_WIDTH / rows.length) * 0.72
      const barWidth = Math.max(1, groupWidth / series.length - 2)
      series.forEach((item, seriesIndex) => {
        const value = Number(row[item.key])
        if (!Number.isFinite(value)) return
        const y = yAt(value)
        bars.push(
          <rect
            key={`${rowIndex}:${item.key}`}
            x={xAt(rowIndex) - groupWidth / 2 + seriesIndex * (barWidth + 2)}
            y={Math.min(y, baseline)}
            width={barWidth}
            height={Math.max(1, Math.abs(baseline - y))}
            rx="3"
            fill={CHART_COLORS[seriesIndex % CHART_COLORS.length]}
            role="graphics-symbol"
            aria-label={`${displayLabel(row[xKey])} · ${item.label ?? item.key}: ${compactTick(value)}`}
          />,
        )
      })
    })
  }

  const lines: ReactElement[] = []
  if (variant === 'line') {
    series.forEach((item) => {
      const points = rows.flatMap((row, rowIndex) => {
        const value = Number(row[item.key])
        return Number.isFinite(value) ? [{ x: xAt(rowIndex), y: yAt(value), label: displayLabel(row[xKey]), value }] : []
      })
      if (points.length === 0) return
      const lastPoint = points[points.length - 1]
      const firstPoint = points[0]
      if (!lastPoint || !firstPoint) return
      const linePath = points.map(({ x, y }, index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
      const color = CHART_COLORS[series.indexOf(item) % CHART_COLORS.length]
      const elements: ReactElement[] = []
      if (withArea) {
        elements.push(
          <path
            key="area"
            d={`${linePath} L ${lastPoint.x.toFixed(2)} ${baseline.toFixed(2)} L ${firstPoint.x.toFixed(2)} ${baseline.toFixed(2)} Z`}
            fill={color}
            opacity="0.14"
          />,
        )
      }
      elements.push(
        <path
          key="line"
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />,
      )
      points.forEach(({ x, y, label, value }, pointIndex) => {
        elements.push(
          <circle
            key={`dot:${pointIndex}`}
            cx={x}
            cy={y}
            r={points.length <= 16 ? 3.5 : 2.5}
            fill={points.length <= 16 ? 'var(--openloop-surface)' : 'transparent'}
            stroke={color}
            strokeWidth={points.length <= 16 ? 2 : 0}
            role="graphics-symbol"
            aria-label={`${label} · ${item.label ?? item.key}: ${compactTick(value)}`}
          />,
        )
      })
      lines.push(<g key={item.key}>{elements}</g>)
    })
  }

  const referenceY = referenceLine !== undefined ? yAt(referenceLine) : undefined
  const showReference = referenceY !== undefined && Number.isFinite(referenceY) && referenceY >= MARGIN.top && referenceY <= MARGIN.top + PLOT_HEIGHT

  return (
    <div data-openloop-preset="chart" data-openloop-variant={variant} data-openloop-count={String(rows.length)} style={containerStyle}>
      {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ display: 'block', width: '100%', height: 'auto' }} role="group" aria-label={panelTitle ?? `${variant} chart`}>
        {Array.from({ length: 5 }, (_, index) => {
          const ratio = index / 4
          const y = MARGIN.top + ratio * PLOT_HEIGHT
          const value = maxValue - ratio * extent
          return (
            <g key={`grid:${index}`}>
              <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} stroke="var(--openloop-border)" strokeOpacity="0.35" strokeDasharray="3 4" />
              <text x={MARGIN.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="var(--openloop-muted-foreground)">{compactTick(value)}</text>
            </g>
          )
        })}
        {showReference && referenceY !== undefined ? (
          <line
            x1={MARGIN.left}
            x2={WIDTH - MARGIN.right}
            y1={referenceY}
            y2={referenceY}
            stroke="var(--openloop-primary-tint)"
            strokeWidth="1.5"
            strokeDasharray="6 4"
            aria-hidden="true"
          />
        ) : null}
        {variant === 'bar' ? bars : lines}
        {rows.map((row, index) =>
          index === 0 || index === rows.length - 1 || index % labelEvery === 0 ? (
            <text key={`label:${index}`} x={xAt(index)} y={HEIGHT - 14} textAnchor="middle" fontSize="10" fill="var(--openloop-muted-foreground)">
              {displayLabel(row[xKey]).slice(0, 14)}
            </text>
          ) : null,
        )}
      </svg>
      {legend}
    </div>
  )
}
