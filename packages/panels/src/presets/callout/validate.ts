/**
 * callout 校验（fail-closed）。
 * - description 必填 ≤240 字符
 * - title ≤80 字符
 * - tone 限 info/success/warning/error
 */
import {
  asRecord,
  error,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const TONES = ['info', 'success', 'warning', 'error'] as const

export function validateCallout(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'callout props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.tone !== undefined && !(TONES as readonly string[]).includes(String(root.tone))) {
    errors.push(error('tone', 'tone 必须是 info / success / warning / error 之一'))
  }

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (typeof root.description !== 'string' || root.description.length < 1) {
    errors.push(error('description', 'description 必填，必须是字符串'))
  } else if (root.description.length > 240) {
    errors.push(error('description', `description 长度不得超过 240 字符，当前 ${root.description.length}`))
  }

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
