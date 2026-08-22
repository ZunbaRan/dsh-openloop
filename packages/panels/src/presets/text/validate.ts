/**
 * text 校验（fail-closed）：text 必填 1–5000；size/tone/align 枚举。
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

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const
const TONES = ['default', 'muted', 'subtle', 'strong'] as const
const ALIGNS = ['left', 'center', 'right'] as const

export function validateText(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'text props 必须是 JSON 对象')])

  const errors: PresetError[] = []
  if (!isNonEmptyString(root.text)) {
    errors.push(error('text', 'text 必填，必须是非空字符串（1–5000 字符）'))
  } else if (root.text.length > 5000) {
    errors.push(error('text', `text 长度不得超过 5000 字符，当前 ${root.text.length}`))
  }
  if (root.size !== undefined && !(SIZES as readonly string[]).includes(String(root.size))) {
    errors.push(error('size', 'size 必须是 xs / sm / md / lg / xl 之一'))
  }
  if (root.tone !== undefined && !(TONES as readonly string[]).includes(String(root.tone))) {
    errors.push(error('tone', 'tone 必须是 default / muted / subtle / strong 之一'))
  }
  if (root.align !== undefined && !(ALIGNS as readonly string[]).includes(String(root.align))) {
    errors.push(error('align', 'align 必须是 left / center / right 之一'))
  }
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
