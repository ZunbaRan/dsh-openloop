/**
 * heatmap 校验（fail-closed）。
 * - matrix 必填 1–10 行 × 1–10 列，各行等长，元素全部为有限数字
 * - rowLabels / colLabels 长度与行列一致，元素为 ≤40 字符字符串
 */
import {
  asRecord,
  error,
  isFiniteNumber,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const MAX_DIMENSION = 10
const MAX_LABEL = 40

export function validateHeatmap(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'heatmap props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (!Array.isArray(root.matrix)) {
    errors.push(error('matrix', 'matrix 必填，必须是 1–10 行的数值矩阵'))
    return validationFail(errors)
  }
  const matrix: unknown[] = root.matrix
  if (matrix.length < 1 || matrix.length > MAX_DIMENSION) {
    errors.push(error('matrix', `matrix 行数必须为 1–${MAX_DIMENSION}，当前 ${matrix.length}`))
  }

  let columnCount: number | undefined
  matrix.forEach((rawRow, rowIndex) => {
    const path = `matrix[${rowIndex}]`
    if (!Array.isArray(rawRow)) {
      errors.push(error(path, 'matrix 每一项必须是数组（一行数据）'))
      return
    }
    if (rawRow.length < 1 || rawRow.length > MAX_DIMENSION) {
      errors.push(error(path, `每行列数必须为 1–${MAX_DIMENSION}，当前 ${rawRow.length}`))
    }
    if (columnCount === undefined) {
      columnCount = rawRow.length
    } else if (rawRow.length !== columnCount) {
      errors.push(error(path, `各行必须等长，首行列数为 ${columnCount}，当前 ${rawRow.length}`))
    }
    rawRow.forEach((cell, colIndex) => {
      if (!isFiniteNumber(cell)) {
        errors.push(error(`${path}[${colIndex}]`, `单元格必须是有限数字，当前 ${JSON.stringify(cell)}`))
      }
    })
  })

  const checkLabels = (path: string, raw: unknown, expected: number): void => {
    if (!Array.isArray(raw)) {
      errors.push(error(path, `${path} 必须是字符串数组`))
      return
    }
    if (raw.length !== expected) {
      errors.push(error(path, `${path} 长度必须为 ${expected}（与矩阵行/列数一致），当前 ${raw.length}`))
    }
    raw.forEach((entry, index) => {
      if (typeof entry !== 'string') {
        errors.push(error(`${path}[${index}]`, '标签必须是字符串'))
      } else if (entry.length > MAX_LABEL) {
        errors.push(error(`${path}[${index}]`, `标签长度不得超过 ${MAX_LABEL} 字符，当前 ${entry.length}`))
      }
    })
  }

  if (root.rowLabels !== undefined) {
    checkLabels('rowLabels', root.rowLabels, matrix.length)
  }
  if (root.colLabels !== undefined && columnCount !== undefined) {
    checkLabels('colLabels', root.colLabels, columnCount)
  }

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
