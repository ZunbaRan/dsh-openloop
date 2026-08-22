/**
 * badge 校验（fail-closed）：label 必填 1–80；tone 六档枚举。
 */
import { asRecord, error, isNonEmptyString, validationFail, validationOk, type PresetValidation } from '../common.ts'
import { isBadgeTone } from '../style.ts'

export function validateBadge(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'badge props 必须是 JSON 对象')])
  const errors = []
  if (!isNonEmptyString(root.label)) {
    errors.push(error('label', 'label 必填，必须是非空字符串（1–80 字符）'))
  } else if (root.label.length > 80) {
    errors.push(error('label', `label 长度不得超过 80 字符，当前 ${root.label.length}`))
  }
  if (root.tone !== undefined && !isBadgeTone(root.tone)) {
    errors.push(error('tone', 'tone 必须是 neutral / primary / info / success / warning / error 之一'))
  }
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
