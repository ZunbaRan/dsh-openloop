import type { PresetModule } from '../index.ts'
import { chartSchema } from './schema.ts'
import { validateChart } from './validate.ts'
import { ChartRender } from './Render.tsx'

export { chartSchema } from './schema.ts'
export { validateChart } from './validate.ts'
export { ChartRender } from './Render.tsx'

export const chartPreset: PresetModule = {
  kind: 'chart',
  schema: chartSchema,
  validate: validateChart,
  Render: ChartRender,
}
