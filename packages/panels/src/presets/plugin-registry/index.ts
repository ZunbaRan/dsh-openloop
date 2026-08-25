import type { PresetModule } from '../index.ts'
import { pluginRegistrySchema } from './schema.ts'
import { validatePluginRegistry } from './validate.ts'
import { PluginRegistryRender } from './Render.tsx'

export { pluginRegistrySchema } from './schema.ts'
export { validatePluginRegistry } from './validate.ts'
export { PluginRegistryRender } from './Render.tsx'

export const pluginRegistryPreset: PresetModule = {
  kind: 'plugin-registry',
  schema: pluginRegistrySchema,
  validate: validatePluginRegistry,
  Render: PluginRegistryRender,
}
