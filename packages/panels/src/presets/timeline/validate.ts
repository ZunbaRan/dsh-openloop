/**
 * timeline 校验（fail-closed）。
 * 移植自 declarative document.ts validateTimeline：
 * - items 2–16，id 唯一非空，title 必填非空
 * - status 限 past / current / future
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

const STATUSES = ['past', 'current', 'future'] as const

export function validateTimeline(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'timeline props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 120)) {
    errors.push(error('title', 'title 必须是 ≤120 字符的字符串'))
  }
  if (root.description !== undefined && (typeof root.description !== 'string' || root.description.length > 360)) {
    errors.push(error('description', 'description 必须是 ≤360 字符的字符串'))
  }

  if (!Array.isArray(root.items)) {
    errors.push(error('items', 'items 必填，必须是 2–16 个条目的数组'))
    return validationFail(errors)
  }
  if (root.items.length < 2 || root.items.length > 16) {
    errors.push(error('items', `items 数量必须为 2–16，当前 ${root.items.length}`))
  }

  const seen = new Set<string>()
  const items: unknown[] = root.items
  items.forEach((raw, index) => {
    const path = `items[${index}]`
    const item = asRecord(raw)
    if (!item) {
      errors.push(error(path, '每个条目必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(item.id)) {
      errors.push(error(`${path}.id`, 'id 必填，必须是非空字符串'))
    } else if (seen.has(item.id)) {
      errors.push(error(`${path}.id`, `条目 id "${item.id}" 重复，items 内 id 必须唯一`))
    } else {
      seen.add(item.id)
    }
    if (!isNonEmptyString(item.title)) {
      errors.push(error(`${path}.title`, 'title 必填，必须是非空字符串（1–80 字符）'))
    } else if (item.title.length > 80) {
      errors.push(error(`${path}.title`, `title 长度不得超过 80 字符，当前 ${item.title.length}`))
    }
    if (item.detail !== undefined && (typeof item.detail !== 'string' || item.detail.length > 240)) {
      errors.push(error(`${path}.detail`, 'detail 必须是 ≤240 字符的字符串'))
    }
    if (item.status !== undefined && !(STATUSES as readonly string[]).includes(String(item.status))) {
      errors.push(error(`${path}.status`, 'status 必须是 past / current / future 之一'))
    }
    if (item.time !== undefined && (typeof item.time !== 'string' || item.time.length > 40)) {
      errors.push(error(`${path}.time`, 'time 必须是 ≤40 字符的字符串'))
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
