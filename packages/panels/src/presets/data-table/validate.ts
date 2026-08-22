/**
 * data-table 校验（fail-closed）。
 * - columns 必填数组 1–12，每列 key 为 1–40 字符非空字符串
 * - rows 数组 0–200，每行必须是对象；行内 tone 限 success/error/warning
 * - density / align / format 均为枚举
 */
import {
  asRecord,
  error,
  isMetricFormat,
  isNonEmptyString,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const ALIGNS = ['left', 'right'] as const
const DENSITIES = ['comfortable', 'compact'] as const
const ROW_TONES = ['success', 'error', 'warning'] as const
const MAX_ROWS = 200
const MAX_COLUMNS = 12

export function validateDataTable(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'data-table props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (root.density !== undefined && !(DENSITIES as readonly string[]).includes(String(root.density))) {
    errors.push(error('density', 'density 必须是 comfortable / compact 之一'))
  }

  if (!Array.isArray(root.columns)) {
    errors.push(error('columns', 'columns 必填，必须是 1–12 项的数组'))
    return validationFail(errors)
  }
  if (root.columns.length < 1 || root.columns.length > MAX_COLUMNS) {
    errors.push(error('columns', `columns 数量必须为 1–${MAX_COLUMNS}，当前 ${root.columns.length}`))
  }

  const columns: unknown[] = root.columns
  columns.forEach((raw, index) => {
    const path = `columns[${index}]`
    const column = asRecord(raw)
    if (!column) {
      errors.push(error(path, '每一项必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(column.key)) {
      errors.push(error(`${path}.key`, 'key 必填，必须是非空字符串（1–40 字符）'))
    } else if (column.key.length > 40) {
      errors.push(error(`${path}.key`, `key 长度不得超过 40 字符，当前 ${column.key.length}`))
    }
    if (column.label !== undefined && typeof column.label !== 'string') {
      errors.push(error(`${path}.label`, 'label 必须是字符串'))
    }
    if (column.align !== undefined && !(ALIGNS as readonly string[]).includes(String(column.align))) {
      errors.push(error(`${path}.align`, 'align 必须是 left / right 之一'))
    }
    if (column.format !== undefined && !isMetricFormat(column.format)) {
      errors.push(error(`${path}.format`, 'format 必须是 currency-cny / number / percent / text 之一'))
    }
  })

  if (root.rows !== undefined && !Array.isArray(root.rows)) {
    errors.push(error('rows', 'rows 必须是数组'))
  } else if (Array.isArray(root.rows) && root.rows.length > MAX_ROWS) {
    errors.push(error('rows', `rows 数量上限 ${MAX_ROWS}，当前 ${root.rows.length}`))
  }

  if (Array.isArray(root.rows)) {
    const rows: unknown[] = root.rows
    rows.forEach((raw, index) => {
      const path = `rows[${index}]`
      const row = asRecord(raw)
      if (!row) {
        errors.push(error(path, '每一行必须是 JSON 对象'))
        return
      }
      if (row.tone !== undefined && !(ROW_TONES as readonly string[]).includes(String(row.tone))) {
        errors.push(error(`${path}.tone`, '行 tone 必须是 success / error / warning 之一'))
      }
    })
  }

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
