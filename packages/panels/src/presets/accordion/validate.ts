/**
 * accordion 校验（fail-closed）。
 * - items 必填数组 1–20，每项 label 必填 1–80 字符，content ≤2000 字符
 * - defaultOpenIndex 非负整数（越界时渲染器自动收敛）
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

export function validateAccordion(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'accordion props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (root.defaultOpenIndex !== undefined) {
    if (typeof root.defaultOpenIndex !== 'number' || !Number.isInteger(root.defaultOpenIndex)) {
      errors.push(error('defaultOpenIndex', 'defaultOpenIndex 必须是非负整数'))
    } else if (root.defaultOpenIndex < 0) {
      errors.push(error('defaultOpenIndex', `defaultOpenIndex 不得为负，当前 ${root.defaultOpenIndex}`))
    }
  }

  if (!Array.isArray(root.items)) {
    errors.push(error('items', 'items 必填，必须是 1–20 项的数组'))
    return validationFail(errors)
  }
  if (root.items.length < 1 || root.items.length > 20) {
    errors.push(error('items', `items 数量必须为 1–20，当前 ${root.items.length}`))
  }

  const items: unknown[] = root.items
  items.forEach((raw, index) => {
    const path = `items[${index}]`
    const item = asRecord(raw)
    if (!item) {
      errors.push(error(path, '每一项必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(item.label)) {
      errors.push(error(`${path}.label`, 'label 必填，必须是非空字符串（1–80 字符）'))
    } else if (item.label.length > 80) {
      errors.push(error(`${path}.label`, `label 长度不得超过 80 字符，当前 ${item.label.length}`))
    }
    if (item.content !== undefined) {
      if (typeof item.content !== 'string') {
        errors.push(error(`${path}.content`, 'content 必须是字符串'))
      } else if (item.content.length > 2000) {
        errors.push(error(`${path}.content`, `content 长度不得超过 2000 字符，当前 ${item.content.length}`))
      }
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
