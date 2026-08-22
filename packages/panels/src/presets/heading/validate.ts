/**
 * heading 校验（fail-closed）：text 必填 1–200；level 整数 1–4；align 枚举。
 */
import { asRecord, error, isNonEmptyString, validationFail, validationOk, type PresetValidation } from '../common.ts'

export function validateHeading(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'heading props 必须是 JSON 对象')])

  const errors = []
  if (!isNonEmptyString(root.text)) {
    errors.push(error('text', 'text 必填，必须是非空字符串（1–200 字符）'))
  } else if (root.text.length > 200) {
    errors.push(error('text', `text 长度不得超过 200 字符，当前 ${root.text.length}`))
  }
  if (root.level !== undefined) {
    if (typeof root.level !== 'number' || !Number.isInteger(root.level)) {
      errors.push(error('level', 'level 必须是 1–4 的整数'))
    } else if (root.level < 1 || root.level > 4) {
      errors.push(error('level', `level 必须在 1–4 之间，当前 ${root.level}`))
    }
  }
  if (root.align !== undefined && root.align !== 'left' && root.align !== 'center' && root.align !== 'right') {
    errors.push(error('align', 'align 必须是 left / center / right 之一'))
  }
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
