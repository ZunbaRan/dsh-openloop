/**
 * event-log 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs / limit）。
 */
import { validateLocalPresetProps, type PresetValidation } from '../common.ts'

export function validateEventLog(props: unknown): PresetValidation {
  return validateLocalPresetProps('event-log', props)
}
