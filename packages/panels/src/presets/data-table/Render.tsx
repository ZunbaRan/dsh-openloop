/**
 * data-table 渲染器。
 * - 数字列（align: right 或 format 数值类）右对齐 + tabular-nums
 * - 行 tone（success/error/warning）整行淡底（--openloop-{tone}-background）
 * - density comfortable/compact 控制单元格纵向 padding
 * 样式 100% 来自 var(--openloop-*)，内联 style。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, formatValue, isFiniteNumber } from '../common.ts'
import { meta, numeric, panel, title } from '../style.ts'

type RowTone = 'success' | 'error' | 'warning'

interface Column {
  key: string
  label: string | undefined
  align: 'left' | 'right'
  format: unknown
  numeric: boolean
}

const ROW_TONE_BG: Record<RowTone, string> = {
  success: 'var(--openloop-success-background)',
  error: 'var(--openloop-error-background)',
  warning: 'var(--openloop-warning-background)',
}

const containerStyle: CSSProperties = {
  ...panel,
  overflow: 'hidden',
  minWidth: 0,
}

const scrollStyle: CSSProperties = {
  overflowX: 'auto',
}

const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: 480,
  borderCollapse: 'collapse',
}

const headerCellStyle: CSSProperties = {
  padding: '9px 12px',
  fontSize: 12,
  fontWeight: 600,
  lineHeight: 1.4,
  color: 'var(--openloop-muted-foreground)',
  background: 'var(--openloop-surface-muted)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const headerCellNumericStyle: CSSProperties = {
  ...headerCellStyle,
  ...numeric,
  textAlign: 'right',
}

const cellStyle: CSSProperties = {
  padding: '9px 12px',
  fontSize: 12,
  lineHeight: 1.5,
  color: 'var(--openloop-foreground)',
  textAlign: 'left',
  wordBreak: 'break-word',
  verticalAlign: 'top',
}

const cellNumericStyle: CSSProperties = {
  ...cellStyle,
  ...numeric,
  textAlign: 'right',
  whiteSpace: 'nowrap',
}

function isNumericFormat(format: unknown): boolean {
  return typeof format === 'string' && (format === 'number' || format === 'percent' || format === 'currency-cny')
}

/** 单元格展示文本：数字列按 format 走 Intl；原始值按基础类型 text 化；对象 JSON 序列化 */
function cellText(value: unknown, format: unknown): string {
  if (value === null || value === undefined) return ''
  if (isFiniteNumber(value) && isNumericFormat(format)) {
    return formatValue(value, format)
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

/** 契约自有键（孤儿字段判定用：数据浅合并塞进来的 API 字段不算契约键） */
const OWN_KEYS = new Set(['title', 'columns', 'rows', 'density'])

/**
 * 数据驱动模式（reshape，2026-08-23）：columns 缺省时，把数据绑定浅合并进 props 的
 * 孤儿扁平字段（如 GitHub repo API 的 stargazers_count/forks_count…）自适应为
 * Field/Value 两列表。嵌套值取 JSON 摘要（≤60 字符）；字段上限 24 + 溢出行数提示。
 */
export function autoFieldRows(root: Record<string, unknown>): { columns: Column[]; rows: Array<Record<string, unknown>> } | undefined {
  const entries = Object.entries(root).filter(([key]) => !OWN_KEYS.has(key))
  if (entries.length === 0) return undefined
  const rows = entries.slice(0, 24).map(([key, value]) => {
    const display = typeof value === 'object' && value !== null
      ? JSON.stringify(value).slice(0, 60)
      : String(value)
    return { field: key, value: display }
  })
  return {
    columns: [
      { key: 'field', label: '字段', align: 'left', format: undefined, numeric: false },
      { key: 'value', label: '值', align: 'left', format: undefined, numeric: false },
    ],
    ...(entries.length > 24 ? { rows: [...rows, { field: '…', value: `(+${entries.length - 24} more fields)` }] } : { rows }),
  }
}

export function DataTableRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const panelTitle = typeof root.title === 'string' ? root.title : undefined
  const density = root.density === 'compact' ? 'compact' : 'comfortable'
  const padY = density === 'compact' ? 6 : 9

  const columns: Column[] = (Array.isArray(root.columns) ? root.columns : [])
    .slice(0, 12)
    .map((raw, index) => {
      const column = asRecord(raw) ?? {}
      const key = typeof column.key === 'string' ? column.key : `column-${index}`
      const align = column.align === 'right' ? 'right' : 'left'
      const format = column.format
      return {
        key,
        label: typeof column.label === 'string' ? column.label : undefined,
        align,
        format,
        numeric: align === 'right' || isNumericFormat(format),
      }
    })

  const auto = columns.length === 0 ? autoFieldRows(root) : undefined
  const effectiveColumns = auto ? auto.columns : columns
  const rows: Record<string, unknown>[] = auto
    ? auto.rows
    : (Array.isArray(root.rows) ? root.rows : [])
      .slice(0, 200)
      .map((raw) => asRecord(raw) ?? {})

  const headerPadding = { paddingTop: padY, paddingBottom: padY }
  const bodyPadding = { paddingTop: padY, paddingBottom: padY }

  return (
    <div data-openloop-preset="data-table" data-openloop-density={density} style={containerStyle}>
      {panelTitle !== undefined ? (
        <div style={{ ...title, ...headerPadding, paddingLeft: 12, paddingRight: 12, borderBottom: '1px solid var(--openloop-border)' }}>
          {panelTitle}
        </div>
      ) : null}
      <div style={scrollStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              {effectiveColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  data-openloop-column={column.key}
                  style={{
                    ...(column.numeric ? headerCellNumericStyle : headerCellStyle),
                    ...headerPadding,
                  }}
                >
                  {column.label ?? column.key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => {
              const tone = row.tone === 'success' || row.tone === 'error' || row.tone === 'warning' ? row.tone : undefined
              return (
                <tr
                  key={String(row.id ?? rowIndex)}
                  style={{
                    borderTop: '1px solid var(--openloop-border)',
                    ...(tone ? { background: ROW_TONE_BG[tone] } : {}),
                  }}
                  data-openloop-row-tone={tone ?? 'none'}
                  data-openloop-row-index={rowIndex}
                >
                  {effectiveColumns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        ...(column.numeric ? cellNumericStyle : cellStyle),
                        ...bodyPadding,
                      }}
                    >
                      {cellText(row[column.key], column.format)}
                    </td>
                  ))}
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(1, columns.length)} style={{ ...meta, padding: '24px 12px', textAlign: 'center' }}>
                  暂无数据
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
