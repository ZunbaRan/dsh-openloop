/**
 * plugin-registry 校验（fail-closed）：title ≤80。
 */
import { validateLocalPresetProps, type PresetValidation } from '../common.ts'

export function validatePluginRegistry(props: unknown): PresetValidation {
  return validateLocalPresetProps('plugin-registry', props)
}
