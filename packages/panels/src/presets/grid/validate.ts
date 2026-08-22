/**
 * grid 校验（fail-closed）：columns 整数 1–6；gap 整数 0–48；children 深校验。
 */
import { asRecord, error, isFiniteNumber, validationFail, validationOk, type PresetValidation } from '../common.ts'
import { validateChildren } from '../children.ts'

export function validateGrid(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'grid props 必须是 JSON 对象')])

  const errors = []
  if (root.columns !== undefined) {
    if (!isFiniteNumber(root.columns) || !Number.isInteger(root.columns) || root.columns < 1 || root.columns > 6) {
      errors.push(error('columns', 'columns 必须是 1–6 的整数'))
    }
  }
  if (root.gap !== undefined && (!isFiniteNumber(root.gap) || !Number.isInteger(root.gap) || root.gap < 0 || root.gap > 48)) {
    errors.push(error('gap', 'gap 必须是 0–48 的整数（px）'))
  }
  errors.push(...validateChildren(root.children, 'children', 'grid'))
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
