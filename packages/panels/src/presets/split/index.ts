import type { PresetModule } from '../index.ts'
import { splitSchema } from './schema.ts'
import { validateSplit } from './validate.ts'
import { SplitRender } from './Render.tsx'

export { splitSchema } from './schema.ts'
export { validateSplit } from './validate.ts'
export { SplitRender } from './Render.tsx'

export const splitPreset: PresetModule = {
  kind: 'split',
  schema: splitSchema,
  validate: validateSplit,
  Render: SplitRender,
}
