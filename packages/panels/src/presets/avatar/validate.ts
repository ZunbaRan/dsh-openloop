/**
 * avatar 校验（fail-closed）：name 必填 1–80；size/tone 枚举。
 */
import { asRecord, error, isNonEmptyString, validationFail, validationOk, type PresetValidation } from '../common.ts'

const SIZES = ['sm', 'md', 'lg'] as const
const TONES = ['primary', 'info', 'success', 'warning', 'error'] as const

export function validateAvatar(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'avatar props 必须是 JSON 对象')])
  const errors = []
  if (!isNonEmptyString(root.name)) {
    errors.push(error('name', 'name 必填，必须是非空字符串（1–80 字符）'))
  } else if (root.name.length > 80) {
    errors.push(error('name', `name 长度不得超过 80 字符，当前 ${root.name.length}`))
  }
  if (root.size !== undefined && !(SIZES as readonly string[]).includes(String(root.size))) {
    errors.push(error('size', 'size 必须是 sm / md / lg 之一'))
  }
  if (root.tone !== undefined && !(TONES as readonly string[]).includes(String(root.tone))) {
    errors.push(error('tone', 'tone 必须是 primary / info / success / warning / error 之一'))
  }
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
