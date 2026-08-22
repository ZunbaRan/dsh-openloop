/**
 * heatmap 渲染器。
 * 参照 DeclarativeAdvancedPrimitives.HeatmapPrimitive：HTML table + 每格色块。
 * 差异：值域映射 chart-seq-1..5 深浅（而非单色 opacity），深格自动换 surface 前景。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord } from '../common.ts'
import { meta, panel, title } from '../style.ts'

const containerStyle: CSSProperties = { ...panel, padding: '12px 14px', minWidth: 0, overflow: 'hidden' }

const titleStyle: CSSProperties = { ...title, marginBottom: 10 }

const scrollStyle: CSSProperties = { overflowX: 'auto' }

const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: 320,
  borderCollapse: 'separate',
  borderSpacing: '3px',
}

const cornerStyle: CSSProperties = { width: 88 }

const labelCellStyle: CSSProperties = {
  ...meta,
  padding: '0 8px 2px 0',
  textAlign: 'center',
  fontWeight: 500,
  color: 'var(--openloop-muted-foreground)',
}

const rowLabelStyle: CSSProperties = {
  ...labelCellStyle,
  textAlign: 'right',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 88,
}

const cellStyle: CSSProperties = {
  minWidth: 40,
  height: 30,
  padding: '4px 6px',
  textAlign: 'center',
  borderRadius: 'var(--openloop-radius-sm)',
  fontSize: 11,
  lineHeight: 1.4,
  fontVariantNumeric: 'tabular-nums',
  color: 'var(--openloop-foreground)',
}

function compactTick(value: number): string {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

/** 值域比例 → chart-seq-1..5（低值浅、高值深） */
function seqStep(intensity: number): number {
  return Math.max(1, Math.min(5, Math.ceil(Math.max(0, Math.min(1, intensity)) * 5)))
}

export function HeatmapRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined

  const matrix = (Array.isArray(root.matrix) ? root.matrix : [])
    .map((rawRow) => (Array.isArray(rawRow) ? rawRow.map(Number).filter(Number.isFinite) : []))
    .filter((row) => row.length > 0)
    .slice(0, 10)
    .map((row) => row.slice(0, 10))

  const rowLabels = Array.isArray(root.rowLabels) ? root.rowLabels.filter((entry): entry is string => typeof entry === 'string').slice(0, 10) : []
  const colLabels = Array.isArray(root.colLabels) ? root.colLabels.filter((entry): entry is string => typeof entry === 'string').slice(0, 10) : []

  if (matrix.length === 0) {
    return (
      <div data-openloop-preset="heatmap" data-openloop-count="0" style={containerStyle}>
        {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
        <div style={meta}>暂无数据</div>
      </div>
    )
  }

  const allValues = matrix.flat()
  const minimum = Math.min(...allValues)
  const maximum = Math.max(...allValues)
  const extent = maximum - minimum

  return (
    <div data-openloop-preset="heatmap" data-openloop-count={String(allValues.length)} style={containerStyle}>
      {panelTitle !== undefined ? <div style={titleStyle}>{panelTitle}</div> : null}
      <div style={scrollStyle}>
        <table style={tableStyle}>
          {colLabels.length > 0 ? (
            <thead>
              <tr>
                <th style={cornerStyle} aria-hidden="true" />
                {colLabels.map((label, colIndex) => (
                  <th key={`col:${colIndex}`} style={labelCellStyle} scope="col">{label}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {matrix.map((row, rowIndex) => (
              <tr key={`row:${rowIndex}`}>
                {rowLabels.length > 0 ? (
                  <th style={rowLabelStyle} scope="row">{rowLabels[rowIndex] ?? `R${rowIndex + 1}`}</th>
                ) : null}
                {row.map((value, colIndex) => {
                  const intensity = extent > 0 ? (value - minimum) / extent : 0.5
                  const step = seqStep(intensity)
                  const background = `var(--openloop-chart-seq-${step})`
                  const color = step >= 4 ? 'var(--openloop-surface)' : 'var(--openloop-foreground)'
                  const rowLabel = rowLabels.length > 0 ? rowLabels[rowIndex] ?? '' : `R${rowIndex + 1}`
                  const colLabel = colLabels.length > 0 ? colLabels[colIndex] ?? '' : `C${colIndex + 1}`
                  return (
                    <td
                      key={`cell:${colIndex}`}
                      style={{ ...cellStyle, background, color }}
                      title={`${rowLabel} · ${colLabel}: ${value}`}
                    >
                      {compactTick(value)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
