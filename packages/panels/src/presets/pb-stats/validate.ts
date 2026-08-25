/**
 * pb-stats 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs 10000–3600000）。
 */
import { validateLocalPresetProps, type PresetValidation } from '../common.ts'

export function validatePbStats(props: unknown): PresetValidation {
  return validateLocalPresetProps('pb-stats', props)
}
