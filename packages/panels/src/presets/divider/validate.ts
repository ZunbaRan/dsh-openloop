/**
 * divider 校验（fail-closed）：label 可选 1–80 字符。
 */
import { asRecord, error, validationFail, validationOk, type PresetValidation } from '../common.ts'

export function validateDivider(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'divider props 必须是 JSON 对象')])
  if (root.label !== undefined) {
    if (typeof root.label !== 'string' || root.label.length < 1) {
      return validationFail([error('label', 'label 必须是非空字符串（1–80 字符）')])
    }
    if (root.label.length > 80) {
      return validationFail([error('label', `label 长度不得超过 80 字符，当前 ${root.label.length}`)])
    }
  }
  return validationOk()
}
