import type { PresetModule } from '../index.ts'
import { dataTableSchema } from './schema.ts'
import { validateDataTable } from './validate.ts'
import { DataTableRender } from './Render.tsx'

export { dataTableSchema } from './schema.ts'
export { validateDataTable } from './validate.ts'
export { DataTableRender } from './Render.tsx'

export const dataTablePreset: PresetModule = {
  kind: 'data-table',
  schema: dataTableSchema,
  validate: validateDataTable,
  Render: DataTableRender,
}
