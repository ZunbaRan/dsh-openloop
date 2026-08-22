import type { PresetModule } from '../index.ts'
import { gridSchema } from './schema.ts'
import { validateGrid } from './validate.ts'
import { GridRender } from './Render.tsx'

export { gridSchema } from './schema.ts'
export { validateGrid } from './validate.ts'
export { GridRender } from './Render.tsx'

export const gridPreset: PresetModule = {
  kind: 'grid',
  schema: gridSchema,
  validate: validateGrid,
  Render: GridRender,
}
