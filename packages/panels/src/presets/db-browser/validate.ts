/**
 * db-browser 校验（fail-closed）：共享 title 规则 + collection ≤40 + perPage 5–100。
 */
import {
  asRecord,
  error,
  validateLocalPresetProps,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

export function validateDbBrowser(props: unknown): PresetValidation {
  const base = validateLocalPresetProps('db-browser', props)
  if (!base.ok) return base
  const root = asRecord(props)
  if (root === null) return validationFail([error('$', 'db-browser props 必须是 JSON 对象')])
  const errors: PresetError[] = []
  if (root.collection !== undefined && (typeof root.collection !== 'string' || root.collection.length > 40)) {
    errors.push(error('collection', 'collection 必须是 ≤40 字符的字符串'))
  }
  if (root.browserId !== undefined && (typeof root.browserId !== 'string' || root.browserId.length > 40)) {
    errors.push(error('browserId', 'browserId 必须是 ≤40 字符的字符串'))
  }
  if (root.perPage !== undefined) {
    const v = root.perPage
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 5 || v > 100) {
      errors.push(error('perPage', 'perPage 必须是 5–100 的整数'))
    }
  }
  return errors.length > 0 ? validationFail(errors) : validationOk()
}
