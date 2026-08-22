/**
 * funnel 校验（fail-closed）。
 * - stages 必填数组 2–8 项；每项 label 非空 ≤40、value 有限数字、detail ≤40
 */
import {
  asRecord,
  error,
  isFiniteNumber,
  isNonEmptyString,
  validationFail,
  validationOk,
  type PresetError,
  type PresetValidation,
} from '../common.ts'

const MAX_STAGES = 8
const MIN_STAGES = 2
const MAX_LABEL = 40

export function validateFunnel(props: unknown): PresetValidation {
  const root = asRecord(props)
  if (!root) return validationFail([error('$', 'funnel props 必须是 JSON 对象')])

  const errors: PresetError[] = []

  if (root.title !== undefined && (typeof root.title !== 'string' || root.title.length > 80)) {
    errors.push(error('title', 'title 必须是 ≤80 字符的字符串'))
  }

  if (!Array.isArray(root.stages)) {
    errors.push(error('stages', 'stages 必填，必须是 2–8 项的数组'))
    return validationFail(errors)
  }
  if (root.stages.length < MIN_STAGES || root.stages.length > MAX_STAGES) {
    errors.push(error('stages', `stages 数量必须为 ${MIN_STAGES}–${MAX_STAGES}，当前 ${root.stages.length}`))
  }

  const stages: unknown[] = root.stages
  stages.forEach((raw, index) => {
    const path = `stages[${index}]`
    const stage = asRecord(raw)
    if (!stage) {
      errors.push(error(path, 'stages 每一项必须是 JSON 对象'))
      return
    }
    if (!isNonEmptyString(stage.label)) {
      errors.push(error(`${path}.label`, 'label 必填，必须是非空字符串（1–40 字符）'))
    } else if (stage.label.length > MAX_LABEL) {
      errors.push(error(`${path}.label`, `label 长度不得超过 ${MAX_LABEL} 字符，当前 ${stage.label.length}`))
    }
    if (!isFiniteNumber(stage.value)) {
      errors.push(error(`${path}.value`, `value 必填，必须是有限数字，当前 ${JSON.stringify(stage.value)}`))
    }
    if (stage.detail !== undefined && typeof stage.detail !== 'string') {
      errors.push(error(`${path}.detail`, 'detail 必须是字符串'))
    } else if (typeof stage.detail === 'string' && stage.detail.length > MAX_LABEL) {
      errors.push(error(`${path}.detail`, `detail 长度不得超过 ${MAX_LABEL} 字符，当前 ${stage.detail.length}`))
    }
  })

  return errors.length > 0 ? validationFail(errors) : validationOk()
}
