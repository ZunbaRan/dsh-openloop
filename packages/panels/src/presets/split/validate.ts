/**
 * split 校验（fail-closed）：children 必填 1–2 项；gutter 整数 0–48；children 深校验。
 */
import { asRecord, error, isFiniteNumber, validationFail, validationOk, type PresetValidation } from '../common.ts'
import { validateChildren } from '../children.ts'

export function validateSplit(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'split props 必须是 JSON 对象')])

  const errors = []
  if (!Array.isArray(root.children)) {
    return validationFail([error('children', 'children 必填，必须是 1–2 个子 widget 的数组（两栏）')])
  }
  if (root.children.length < 1 || root.children.length > 2) {
    errors.push(error('children', `children 数量必须为 1–2（两栏），当前 ${root.children.length}`))
  }
  if (root.gutter !== undefined && (!isFiniteNumber(root.gutter) || !Number.isInteger(root.gutter) || root.gutter < 0 || root.gutter > 48)) {
    errors.push(error('gutter', 'gutter 必须是 0–48 的整数（px）'))
  }
  errors.push(...validateChildren(root.children, 'children', 'split'))
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
