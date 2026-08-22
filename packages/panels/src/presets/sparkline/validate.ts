/**
 * sparkline 校验（fail-closed）。
 * - series 必填数组 2–120，元素必须为有限数字
 * - label ≤80 字符；value 为数字或字符串；extremes 为布尔
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

export function validateSparkline(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'sparkline props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.label !== undefined && (typeof root.label !== 'string' || root.label.length > 80)) {
    errors.push(error('label', 'label 必须是 ≤80 字符的字符串'))
  }

  if (root.value !== undefined && !isFiniteNumber(root.value) && typeof root.value !== 'string') {
    errors.push(error('value', 'value 必须是数字或字符串'))
  }

  if (root.extremes !== undefined && typeof root.extremes !== 'boolean') {
    errors.push(error('extremes', 'extremes 必须是布尔值'))
  }

  if (!Array.isArray(root.series)) {
    errors.push(error('series', 'series 必填，必须是 2–120 项的数值数组'))
    return validationFail(errors)
  }
  if (root.series.length < 2 || root.series.length > 120) {
    errors.push(error('series', `series 长度必须为 2–120，当前 ${root.series.length}`))
  }

  const series: unknown[] = root.series
  series.forEach((entry, index) => {
    if (!isFiniteNumber(entry)) {
      errors.push(error(`series[${index}]`, `series[${index}] 必须是有限数字，当前 ${JSON.stringify(entry)}`))
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
