/**
 * metric-grid 校验（fail-closed，§6.4 约束）。
 * - items 必填数组 1–6
 * - label 1–40 字符
 * - value 为数字或字符串
 * - format / deltaTone / emphasis 均为枚举
 * - emphasis hero 至多 1 个
 */
import {
  asRecord,
  error,
  isFiniteNumber,
  isMetricFormat,
  isNonEmptyString,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const DELTA_TONES = ['up', 'down', 'flat'] as const
const EMPHASES = ['hero', 'standard'] as const
const COLUMNS = [1, 2, 3, 4] as const

export function validateMetricGrid(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'metric-grid props 必须是 JSON 对象（见 §6.4 schema 示例）')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (root.columns !== undefined && !(COLUMNS as readonly number[]).includes(root.columns as number)) {
    errors.push(error('columns', 'columns 必须是 1、2、3、4 之一'))
  }

  if (!Array.isArray(root.items)) {
    errors.push(error('items', 'items 必填，必须是 1–6 项的数组'))
    return validationFail(errors)
  }
  if (root.items.length < 1 || root.items.length > 6) {
    errors.push(error('items', `items 数量必须为 1–6，当前 ${root.items.length}`))
  }

  const list: unknown[] = root.items
  let heroCount = 0
  list.forEach((raw, index) => {
    const path = `items[${index}]`
    const item = asRecord(raw)
    if (!item) {
      errors.push(error(path, '每一项必须是 JSON 对象'))
      return
    }
    if (item.id !== undefined && !isNonEmptyString(item.id)) {
      errors.push(error(`${path}.id`, 'id 必须是非空字符串（≤40 字符，kebab-case 建议）'))
    } else if (typeof item.id === 'string' && item.id.length > 40) {
      errors.push(error(`${path}.id`, `id 长度不得超过 40 字符，当前 ${item.id.length}`))
    }
    if (item.label !== undefined && (typeof item.label !== 'string' || item.label.length < 1 || item.label.length > 40)) {
      errors.push(error(`${path}.label`, 'label 必须为 1–40 字符的字符串'))
    }
    if (item.value !== undefined && !isFiniteNumber(item.value) && typeof item.value !== 'string') {
      errors.push(error(`${path}.value`, 'value 必须是数字或字符串'))
    }
    if (item.format !== undefined && !isMetricFormat(item.format)) {
      errors.push(error(`${path}.format`, 'format 必须是 currency-cny（或别名 currency）/ number / percent / text 之一'))
    }
    if (item.delta !== undefined && (typeof item.delta !== 'string' || item.delta.length > 24)) {
      errors.push(error(`${path}.delta`, 'delta 必须是 ≤24 字符的字符串（如 +12.4%）'))
    }
    if (item.deltaTone !== undefined && !(DELTA_TONES as readonly string[]).includes(String(item.deltaTone))) {
      errors.push(error(`${path}.deltaTone`, 'deltaTone 必须是 up / down / flat 之一'))
    }
    if (item.emphasis !== undefined && !(EMPHASES as readonly string[]).includes(String(item.emphasis))) {
      errors.push(error(`${path}.emphasis`, 'emphasis 必须是 hero / standard 之一'))
    }
    if (item.emphasis === 'hero') heroCount += 1
  })

  if (heroCount > 1) {
    errors.push(error('items', `emphasis: hero 至多 1 个（整组焦点唯一），当前 ${heroCount} 个`))
  }

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
