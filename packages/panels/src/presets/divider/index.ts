import type { PresetModule } from '../index.ts'
import { dividerSchema } from './schema.ts'
import { validateDivider } from './validate.ts'
import { DividerRender } from './Render.tsx'

export { dividerSchema } from './schema.ts'
export { validateDivider } from './validate.ts'
export { DividerRender } from './Render.tsx'

export const dividerPreset: PresetModule = {
  kind: 'divider',
  schema: dividerSchema,
  validate: validateDivider,
  Render: DividerRender,
}
