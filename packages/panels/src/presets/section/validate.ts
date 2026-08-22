/**
 * section 校验（fail-closed）：title 长度上限；bordered 布尔；children 深校验。
 */
import { asRecord, error, validationFail, validationOk, type PresetValidation } from '../common.ts'
import { validateChildren } from '../children.ts'

export function validateSection(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'section props 必须是 JSON 对象')])

  const errors = []
  if (root.title !== undefined) {
    if (typeof root.title !== 'string') errors.push(error('title', 'title 必须是字符串（≤120 字符）'))
    else if (root.title.length > 120) errors.push(error('title', `title 长度不得超过 120 字符，当前 ${root.title.length}`))
  }
  if (root.bordered !== undefined && typeof root.bordered !== 'boolean') {
    errors.push(error('bordered', 'bordered 必须是布尔值'))
  }
  errors.push(...validateChildren(root.children, 'children', 'section'))
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
