/**
 * gauge 校验（fail-closed）。
 * - value 必填有限数字且 0–100
 * - tone 枚举 success/warning/error/info
 * - title/label/detail/unit 长度约束
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

const TONES = ['success', 'warning', 'error', 'info'] as const

function checkLength(path: string, value: unknown, max: number, name: string, errors: PresetError[]): void {
  if (typeof value !== 'string') {
    errors.push(error(path, `${name} 必须是字符串`))
  } else if (value.length > max) {
    errors.push(error(path, `${name} 长度不得超过 ${max} 字符，当前 ${value.length}`))
  }
}

export function validateGauge(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'gauge props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined) checkLength('title', root.title, 80, 'title', errors)
  if (root.label !== undefined) checkLength('label', root.label, 40, 'label', errors)
  if (root.detail !== undefined) checkLength('detail', root.detail, 80, 'detail', errors)
  if (root.unit !== undefined) checkLength('unit', root.unit, 8, 'unit', errors)

  if (root.tone !== undefined && !(TONES as readonly string[]).includes(String(root.tone))) {
    errors.push(error('tone', 'tone 必须是 success / warning / error / info 之一'))
  }

  if (!isFiniteNumber(root.value)) {
    errors.push(error('value', 'value 必填，必须是 0–100 的有限数字'))
  } else if (root.value < 0 || root.value > 100) {
    errors.push(error('value', `value 必须在 0–100 之间，当前 ${root.value}`))
  }

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
