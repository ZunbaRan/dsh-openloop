/**
 * chart 校验（fail-closed，错误消息面向 Agent 可自修正）。
 * - variant 必填枚举；data 必填 1–100 项对象；series 必填 1–6 项（donut ≤4）
 * - 每系列 key 为非空字符串 ≤40；label ≤40；xKey ≤40
 * - referenceLine 仅 bar/line 可带；area 仅 line 可带；其余字段类型约束
 */
import {
  asRecord,
  error,
  isFiniteNumber,
  isNonEmptyString,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const VARIANTS = ['bar', 'line', 'donut'] as const
const MAX_ROWS = 100
const MAX_SERIES = 6
const MAX_DONUT_SERIES = 4
const MAX_LABEL = 40

export function validateChart(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'chart props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (!(VARIANTS as readonly string[]).includes(String(root.variant))) {
    errors.push(error('variant', 'variant 必填，必须是 bar / line / donut 之一'))
  }

  if (root.legend !== undefined && typeof root.legend !== 'boolean') {
    errors.push(error('legend', 'legend 必须是布尔值'))
  }

  if (root.referenceLine !== undefined && !isFiniteNumber(root.referenceLine)) {
    errors.push(error('referenceLine', 'referenceLine 必须是有限数字'))
  } else if (root.referenceLine !== undefined && root.variant === 'donut') {
    errors.push(error('referenceLine', 'referenceLine 仅 bar / line 支持，donut 不接受参考线'))
  }

  if (root.area !== undefined && typeof root.area !== 'boolean') {
    errors.push(error('area', 'area 必须是布尔值'))
  } else if (root.area === true && root.variant !== 'line') {
    errors.push(error('area', 'area 仅 line variant 支持'))
  }

  if (root.xKey !== undefined) {
    if (!isNonEmptyString(root.xKey)) {
      errors.push(error('xKey', 'xKey 必须是非空字符串'))
    } else if (root.xKey.length > MAX_LABEL) {
      errors.push(error('xKey', `xKey 长度不得超过 ${MAX_LABEL} 字符，当前 ${root.xKey.length}`))
    }
  }

  if (!Array.isArray(root.data)) {
    errors.push(error('data', 'data 必填，必须是 1–100 项的对象数组'))
    return validationFail(errors)
  }
  if (root.data.length < 1 || root.data.length > MAX_ROWS) {
    errors.push(error('data', `data 行数必须为 1–${MAX_ROWS}，当前 ${root.data.length}`))
  }
  const rows: unknown[] = root.data
  rows.forEach((raw, index) => {
    if (!asRecord(raw)) {
      errors.push(error(`data[${index}]`, 'data 每一项必须是 JSON 对象'))
    }
  })

  if (!Array.isArray(root.series)) {
    errors.push(error('series', 'series 必填，必须是 1–6 项的数组'))
    return validationFail(errors)
  }
  const seriesMax = root.variant === 'donut' ? MAX_DONUT_SERIES : MAX_SERIES
  if (root.series.length < 1 || root.series.length > seriesMax) {
    errors.push(error('series', `series 数量必须为 1–${seriesMax}（donut ≤4），当前 ${root.series.length}`))
  }

  const series: unknown[] = root.series
  series.forEach((raw, index) => {
    const path = `series[${index}]`
    const item = asRecord(raw)
    if (!item) {
      errors.push(error(path, 'series 每一项必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(item.key)) {
      errors.push(error(`${path}.key`, 'key 必填，必须是非空字符串（1–40 字符）'))
    } else if (item.key.length > MAX_LABEL) {
      errors.push(error(`${path}.key`, `series.key 长度不得超过 ${MAX_LABEL} 字符，当前 ${item.key.length}`))
    }
    if (item.label !== undefined) {
      if (typeof item.label !== 'string') {
        errors.push(error(`${path}.label`, 'series.label 必须是字符串'))
      } else if (item.label.length > MAX_LABEL) {
        errors.push(error(`${path}.label`, `series.label 长度不得超过 ${MAX_LABEL} 字符，当前 ${item.label.length}`))
      }
    }
  })

  // 标签约束：data 行 xKey 值若是字符串须 ≤40 字符
  const xKey = isNonEmptyString(root.xKey) ? root.xKey : 'label'
  rows.forEach((raw, rowIndex) => {
    const row = asRecord(raw)
    if (!row) return
    const label = row[xKey]
    if (typeof label === 'string' && label.length > MAX_LABEL) {
      errors.push(error(`data[${rowIndex}].${xKey}`, `xKey 标签长度不得超过 ${MAX_LABEL} 字符，当前 ${label.length}`))
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
