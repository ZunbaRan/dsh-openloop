import type { PresetModule } from '../index.ts'
import { stackSchema } from './schema.ts'
import { validateStack } from './validate.ts'
import { StackRender } from './Render.tsx'

export { stackSchema } from './schema.ts'
export { validateStack } from './validate.ts'
export { StackRender } from './Render.tsx'

export const stackPreset: PresetModule = {
  kind: 'stack',
  schema: stackSchema,
  validate: validateStack,
  Render: StackRender,
}
