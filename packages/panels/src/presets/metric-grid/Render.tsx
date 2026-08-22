/**
 * metric-grid 渲染器。
 * 结构参照 DeclarativeInteractiveView 的 MetricCard（hero/standard 两档）；
 * 样式 100% 来自 var(--openloop-*)，内联 style。
 * deltaTone 映射 --openloop-delta-*，与成败语义解耦。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, formatValue, isFiniteNumber } from '../common.ts'
import { displayValue, meta, micro, panel, panelHero, standardValue } from '../style.ts'

type DeltaTone = 'up' | 'down' | 'flat'

const DELTA_COLOR: Record<DeltaTone, string> = {
  up: 'var(--openloop-delta-up)',
  down: 'var(--openloop-delta-down)',
  flat: 'var(--openloop-delta-flat)',
}

const DELTA_GLYPH: Record<DeltaTone, string> = {
  up: '↑',
  down: '↓',
  flat: '—',
}

interface MetricItem {
  id: string | undefined
  label: string | undefined
  value: number | string
  format: unknown
  delta: string | undefined
  deltaTone: DeltaTone
  emphasis: 'hero' | 'standard'
}

const cardStyle: CSSProperties = {
  ...panel,
  padding: '12px 14px',
  minWidth: 0,
}

const cardHeroStyle: CSSProperties = {
  ...panelHero,
  padding: '14px 16px',
  minWidth: 0,
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
}

const labelStyle: CSSProperties = {
  ...meta,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const deltaStyle: CSSProperties = {
  ...micro,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  marginTop: 4,
  fontWeight: 500,
}

export function MetricGridRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const title = typeof root.title === 'string' ? root.title : undefined
  const columns = isFiniteNumber(root.columns)
    ? Math.max(1, Math.min(4, Math.trunc(root.columns)))
    : undefined

  const items: MetricItem[] = (Array.isArray(root.items) ? root.items : [])
    .slice(0, 6)
    .map((raw) => {
      const item = asRecord(raw) ?? {}
      const deltaTone: DeltaTone = item.deltaTone === 'up' || item.deltaTone === 'down' || item.deltaTone === 'flat'
        ? item.deltaTone
        : 'flat'
      return {
        id: typeof item.id === 'string' ? item.id : undefined,
        label: typeof item.label === 'string' ? item.label : undefined,
        value: isFiniteNumber(item.value) ? item.value : typeof item.value === 'string' ? item.value : '',
        format: item.format,
        delta: typeof item.delta === 'string' ? item.delta : undefined,
        deltaTone,
        emphasis: item.emphasis === 'hero' ? 'hero' : 'standard',
      }
    })

  // hero 焦点：显式 emphasis: hero 优先；无显式时 1–4 项网格自动取首个（对齐上游 autoHero 规则）
  const explicitHero = items.findIndex((item) => item.emphasis === 'hero')
  const heroAt = explicitHero >= 0 ? explicitHero : items.length > 0 && items.length <= 4 ? 0 : -1

  if (items.length === 0) {
    return (
      <div data-openloop-preset="metric-grid" data-openloop-count="0" style={{ ...panel, padding: '14px 16px' }}>
        <div style={meta}>暂无指标数据</div>
      </div>
    )
  }

  return (
    <div data-openloop-preset="metric-grid" data-openloop-count={String(items.length)}>
      {title !== undefined ? <div style={{ ...meta, marginBottom: 8, fontWeight: 600 }}>{title}</div> : null}
      <div style={columns ? { ...gridStyle, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : gridStyle}>
        {items.map((item, index) => {
          const isHero = index === heroAt
          const toneColor = DELTA_COLOR[item.deltaTone]
          return (
            <div
              key={item.id ?? `metric-${index}`}
              style={isHero ? cardHeroStyle : cardStyle}
              data-openloop-emphasis={isHero ? 'hero' : 'standard'}
            >
              {item.label !== undefined ? <div style={labelStyle}>{item.label}</div> : null}
              <div style={{ ...(isHero ? displayValue : standardValue), wordBreak: 'break-word' }}>
                {formatValue(item.value, item.format)}
              </div>
              {item.delta !== undefined ? (
                <div style={{ ...deltaStyle, color: toneColor }} data-openloop-delta-tone={item.deltaTone}>
                  <span aria-hidden="true">{DELTA_GLYPH[item.deltaTone]}</span>
                  {item.delta}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
