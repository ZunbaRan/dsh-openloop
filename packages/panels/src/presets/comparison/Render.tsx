/**
 * comparison 渲染器。
 * 移植自 DeclarativeCard.tsx ComparisonView：列聚焦 pill + 网格表格。
 * 改写点：
 * - 外部 Pill 组件 → 组件内 button（交互限本地 state，默认聚焦推荐列）
 * - 聚焦列用 selection/selection-foreground 对比对（8 预设明暗齐备；曾误用
 *   primary-tint 填充——它是「更亮的 primary」非背景色，暗色下对比崩坏）
 */
import { useState, type CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isNonEmptyString } from '../common.ts'
import { meta, micro, panel, title } from '../style.ts'

interface ComparisonColumn {
  id: string
  title: string
  subtitle: string | undefined
  recommended: boolean
}

interface ComparisonRow {
  label: string
  values: string[]
  emphasis: 'normal' | 'strong'
}

const headerStyle: CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--openloop-border)',
}

const bodyStyle: CSSProperties = {
  padding: 14,
  overflowX: 'auto',
}

const pillRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginBottom: 10,
}

const pillStyle: CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--openloop-radius-lg)',
  border: '1px solid var(--openloop-border)',
  background: 'var(--openloop-surface)',
  color: 'var(--openloop-foreground)',
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 500,
  cursor: 'pointer',
}

const pillActiveStyle: CSSProperties = {
  ...pillStyle,
  border: '1px solid var(--openloop-primary)',
  background: 'var(--openloop-primary)',
  color: 'var(--openloop-primary-foreground)',
  fontWeight: 600,
}

const cellBaseStyle: CSSProperties = {
  padding: '10px 12px',
  borderTop: '1px solid var(--openloop-border)',
  minWidth: 0,
  wordBreak: 'break-word',
}

export function ComparisonRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const description = typeof root.description === 'string' ? root.description : undefined

  const columns: ComparisonColumn[] = (Array.isArray(root.columns) ? root.columns : [])
    .slice(0, 4)
    .map((raw, index) => {
      const column = asRecord(raw) ?? {}
      return {
        id: isNonEmptyString(column.id) ? column.id : `column-${index}`,
        title: typeof column.title === 'string' ? column.title : `列 ${index + 1}`,
        subtitle: typeof column.subtitle === 'string' ? column.subtitle : undefined,
        recommended: column.recommended === true,
      }
    })

  const rows: ComparisonRow[] = (Array.isArray(root.rows) ? root.rows : [])
    .slice(0, 12)
    .map((raw, index) => {
      const row = asRecord(raw) ?? {}
      const values = Array.isArray(row.values) ? row.values : []
      return {
        label: typeof row.label === 'string' ? row.label : `维度 ${index + 1}`,
        values: Array.from({ length: columns.length }, (_, valueIndex) => {
          const value = values[valueIndex]
          return typeof value === 'string' ? value : ''
        }),
        emphasis: row.emphasis === 'strong' ? 'strong' : 'normal',
      }
    })

  const recommendedIndex = columns.findIndex((column) => column.recommended)
  const [focus, setFocus] = useState(recommendedIndex >= 0 ? recommendedIndex : 0)
  const focused = focus >= 0 && focus < columns.length ? focus : 0

  if (columns.length === 0 || rows.length === 0) {
    return (
      <div data-openloop-preset="comparison" data-openloop-count="0" style={{ ...panel, padding: '12px 14px' }}>
        <div style={meta}>暂无对比数据</div>
      </div>
    )
  }

  return (
    <div data-openloop-preset="comparison" data-openloop-count={String(rows.length)} style={{ ...panel, overflow: 'hidden', padding: 0 }}>
      {panelTitle !== undefined || description !== undefined ? (
        <div style={headerStyle}>
          {panelTitle !== undefined ? <div style={title}>{panelTitle}</div> : null}
          {description !== undefined ? <div style={{ ...meta, marginTop: 3 }}>{description}</div> : null}
        </div>
      ) : null}
      <div style={bodyStyle}>
        <div style={pillRowStyle} role="tablist" aria-label="聚焦对比列">
          {columns.map((column, index) => (
            <button
              key={column.id}
              type="button"
              role="tab"
              aria-selected={focused === index}
              onClick={() => setFocus(index)}
              style={focused === index ? pillActiveStyle : pillStyle}
            >
              {column.title}
              {column.recommended ? ' · 推荐' : ''}
            </button>
          ))}
        </div>
        <div
          style={{
            minWidth: 420,
            display: 'grid',
            gridTemplateColumns: `minmax(110px, .8fr) repeat(${columns.length}, minmax(110px, 1fr))`,
            border: '1px solid var(--openloop-border)',
            borderRadius: 'var(--openloop-radius-md)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: 10, background: 'var(--openloop-surface-muted)' }} />
          {columns.map((column, index) => {
            const isFocused = focused === index
            return (
              <div
                key={column.id}
                style={{
                  padding: '10px 12px',
                  background: isFocused ? 'var(--openloop-selection)' : 'var(--openloop-surface-muted)',
                  borderLeft: '1px solid var(--openloop-border)',
                }}
              >
                <div style={{ fontSize: 13, lineHeight: 1.4, fontWeight: 650, color: isFocused ? 'var(--openloop-selection-foreground)' : 'var(--openloop-foreground)' }}>
                  {column.title}
                </div>
                {column.subtitle !== undefined ? (
                  <div style={{ ...micro, marginTop: 2 }}>{column.subtitle}</div>
                ) : null}
              </div>
            )
          })}
          {rows.flatMap((row, rowIndex) => [
            <div
              key={`label-${rowIndex}`}
              style={{ ...cellBaseStyle, fontSize: 12, lineHeight: 1.5, color: 'var(--openloop-muted-foreground)', fontWeight: row.emphasis === 'strong' ? 650 : 500 }}
            >
              {row.label}
            </div>,
            ...row.values.map((value, columnIndex) => (
              <div
                key={`${rowIndex}-${columnIndex}`}
                style={{
                  ...cellBaseStyle,
                  borderLeft: '1px solid var(--openloop-border)',
                  background: focused === columnIndex ? 'var(--openloop-selection)' : undefined,
                  fontSize: 13,
                  lineHeight: 1.5,
                  fontWeight: row.emphasis === 'strong' ? 650 : 450,
                  color: focused === columnIndex ? 'var(--openloop-selection-foreground)' : 'var(--openloop-foreground)',
                }}
              >
                {value}
              </div>
            )),
          ])}
        </div>
      </div>
    </div>
  )
}
