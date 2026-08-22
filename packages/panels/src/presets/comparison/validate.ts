/**
 * comparison 校验（fail-closed）。
 * 移植自 declarative document.ts validateComparison：
 * - columns 2–4，id 唯一，最多 1 个 recommended
 * - rows 1–12，label 必填非空，values 长度必须等于列数
 */
import {
  asRecord,
  error,
  isNonEmptyString,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

export function validateComparison(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'comparison props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 120)) {
    errors.push(error('title', 'title 必须是 ≤120 字符的字符串'))
  }
  if (root.description !== undefined && (typeof root.description !== 'string' || root.description.length > 360)) {
    errors.push(error('description', 'description 必须是 ≤360 字符的字符串'))
  }

  // columns
  if (!Array.isArray(root.columns)) {
    errors.push(error('columns', 'columns 必填，必须是 2–4 个列的数组'))
    return validationFail(errors)
  }
  if (root.columns.length < 2 || root.columns.length > 4) {
    errors.push(error('columns', `columns 数量必须为 2–4，当前 ${root.columns.length}`))
  }

  const columnIds = new Set<string>()
  let recommendedCount = 0
  const columns: unknown[] = root.columns
  columns.forEach((raw, index) => {
    const path = `columns[${index}]`
    const column = asRecord(raw)
    if (!column) {
      errors.push(error(path, '每一列必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(column.id)) {
      errors.push(error(`${path}.id`, 'id 必填，必须是非空字符串'))
    } else if (columnIds.has(column.id)) {
      errors.push(error(`${path}.id`, `列 id "${column.id}" 重复，columns 内 id 必须唯一`))
    } else {
      columnIds.add(column.id)
    }
    if (!isNonEmptyString(column.title)) {
      errors.push(error(`${path}.title`, 'title 必填，必须是非空字符串（1–60 字符）'))
    } else if (column.title.length > 60) {
      errors.push(error(`${path}.title`, `title 长度不得超过 60 字符，当前 ${column.title.length}`))
    }
    if (column.subtitle !== undefined && (typeof column.subtitle !== 'string' || column.subtitle.length > 80)) {
      errors.push(error(`${path}.subtitle`, 'subtitle 必须是 ≤80 字符的字符串'))
    }
    if (column.recommended !== undefined && typeof column.recommended !== 'boolean') {
      errors.push(error(`${path}.recommended`, 'recommended 必须是布尔值'))
    } else if (column.recommended === true) {
      recommendedCount += 1
    }
  })
  if (recommendedCount > 1) {
    errors.push(error('columns', `最多 1 个 recommended 列，当前 ${recommendedCount} 个；请只保留一个 true`))
  }

  // rows
  if (!Array.isArray(root.rows)) {
    errors.push(error('rows', 'rows 必填，必须是 1–12 个行的数组'))
    return validationFail(errors)
  }
  if (root.rows.length < 1 || root.rows.length > 12) {
    errors.push(error('rows', `rows 数量必须为 1–12，当前 ${root.rows.length}`))
  }

  const columnCount = columns.length
  const rows: unknown[] = root.rows
  rows.forEach((raw, index) => {
    const path = `rows[${index}]`
    const row = asRecord(raw)
    if (!row) {
      errors.push(error(path, '每一行必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(row.label)) {
      errors.push(error(`${path}.label`, 'label 必填，必须是非空字符串（1–60 字符）'))
    } else if (row.label.length > 60) {
      errors.push(error(`${path}.label`, `label 长度不得超过 60 字符，当前 ${row.label.length}`))
    }
    if (!Array.isArray(row.values)) {
      errors.push(error(`${path}.values`, `values 必填，必须是长度等于列数（${columnCount}）的字符串数组`))
    } else {
      if (row.values.length !== columnCount) {
        errors.push(error(`${path}.values`, `values 长度 ${row.values.length} 与列数 ${columnCount} 不一致，需提供 ${columnCount} 个值`))
      }
      row.values.forEach((value, valueIndex) => {
        if (typeof value !== 'string') {
          errors.push(error(`${path}.values[${valueIndex}]`, 'values 每一项必须是字符串'))
        } else if (value.length > 120) {
          errors.push(error(`${path}.values[${valueIndex}]`, `取值长度不得超过 120 字符，当前 ${value.length}`))
        }
      })
    }
    if (row.emphasis !== undefined && row.emphasis !== 'normal' && row.emphasis !== 'strong') {
      errors.push(error(`${path}.emphasis`, 'emphasis 必须是 normal / strong 之一'))
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
