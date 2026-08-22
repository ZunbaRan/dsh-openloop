/**
 * card 校验（fail-closed）：title/description 长度上限；children 经 validateChildren 深校验。
 */
import { asRecord, error, validationFail, validationOk, type PresetValidation } from '../common.ts'
import { validateChildren } from '../children.ts'

export function validateCard(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'card props 必须是 JSON 对象')])

  const errors = []
  if (root.title !== undefined) {
    if (typeof root.title !== 'string') errors.push(error('title', 'title 必须是字符串（≤120 字符）'))
    else if (root.title.length > 120) errors.push(error('title', `title 长度不得超过 120 字符，当前 ${root.title.length}`))
  }
  if (root.description !== undefined) {
    if (typeof root.description !== 'string') errors.push(error('description', 'description 必须是字符串（≤360 字符）'))
    else if (root.description.length > 360) errors.push(error('description', `description 长度不得超过 360 字符，当前 ${root.description.length}`))
  }
  errors.push(...validateChildren(root.children, 'children', 'card'))
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
