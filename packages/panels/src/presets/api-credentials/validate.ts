/**
 * api-credentials 校验（fail-closed）：共享规则（title ≤80 / autoRefreshMs）。
 */
import { validateLocalPresetProps, type PresetValidation } from '../common.ts'

export function validateApiCredentials(props: unknown): PresetValidation {
  return validateLocalPresetProps('api-credentials', props)
}
