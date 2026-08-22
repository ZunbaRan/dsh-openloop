/**
 * progress 校验（fail-closed）。
 * - value 必填有限数字 ≥ 0
 * - max 若提供必须为有限数字 > 0
 * - tone 限 primary/success/warning/error/info
 */
import {
  asRecord,
  error,
  isFiniteNumber,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const TONES = ['primary', 'success', 'warning', 'error', 'info'] as const

export function validateProgress(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'progress props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.label !== undefined && (typeof root.label !== 'string' || root.label.length > 80)) {
    errors.push(error('label', 'label 必须是 ≤80 字符的字符串'))
  }

  if (!isFiniteNumber(root.value)) {
    errors.push(error('value', 'value 必填，必须是有限数字（≥0）'))
  } else if (root.value < 0) {
    errors.push(error('value', `value 不得为负，当前 ${root.value}`))
  }

  if (root.max !== undefined) {
    if (!isFiniteNumber(root.max)) {
      errors.push(error('max', 'max 必须是有限数字'))
    } else if (root.max <= 0) {
      errors.push(error('max', `max 必须大于 0，当前 ${root.max}`))
    }
  }

  if (root.tone !== undefined && !(TONES as readonly string[]).includes(String(root.tone))) {
    errors.push(error('tone', 'tone 必须是 primary / success / warning / error / info 之一'))
  }

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
