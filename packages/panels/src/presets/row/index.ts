import type { PresetModule } from '../index.ts'
import { rowSchema } from './schema.ts'
import { validateRow } from './validate.ts'
import { RowRender } from './Render.tsx'

export { rowSchema } from './schema.ts'
export { validateRow } from './validate.ts'
export { RowRender } from './Render.tsx'

export const rowPreset: PresetModule = {
  kind: 'row',
  schema: rowSchema,
  validate: validateRow,
  Render: RowRender,
}
