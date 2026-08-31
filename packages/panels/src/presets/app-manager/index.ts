import type { PresetModule } from '../index.ts'
import { appManagerSchema } from './schema.ts'
import { validateAppManager } from './validate.ts'
import { AppManagerRender } from './Render.tsx'

export { appManagerSchema } from './schema.ts'
export { validateAppManager } from './validate.ts'
export { AppManagerRender } from './Render.tsx'

export const appManagerPreset: PresetModule = {
  kind: 'app-manager',
  schema: appManagerSchema,
  validate: validateAppManager,
  Render: AppManagerRender,
}
