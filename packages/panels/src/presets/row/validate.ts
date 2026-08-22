/**
 * row 校验（fail-closed）：gap/align/wrap 枚举与范围；children 深校验。
 */
import { asRecord, error, isFiniteNumber, validationFail, validationOk, type PresetValidation } from '../common.ts'
import { validateChildren } from '../children.ts'

const ALIGNS = ['start', 'center', 'end', 'stretch'] as const

export function validateRow(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'row props 必须是 JSON 对象')])

  const errors = []
  if (root.gap !== undefined && (!isFiniteNumber(root.gap) || !Number.isInteger(root.gap) || root.gap < 0 || root.gap > 48)) {
    errors.push(error('gap', 'gap 必须是 0–48 的整数（px）'))
  }
  if (root.align !== undefined && !(ALIGNS as readonly string[]).includes(String(root.align))) {
    errors.push(error('align', 'align 必须是 start / center / end / stretch 之一'))
  }
  if (root.wrap !== undefined && typeof root.wrap !== 'boolean') {
    errors.push(error('wrap', 'wrap 必须是布尔值'))
  }
  errors.push(...validateChildren(root.children, 'children', 'row'))
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
