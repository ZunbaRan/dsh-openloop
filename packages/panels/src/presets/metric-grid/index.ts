import type { PresetModule } from '../index.ts'
import { metricGridSchema } from './schema.ts'
import { validateMetricGrid } from './validate.ts'
import { MetricGridRender } from './Render.tsx'

export { metricGridSchema } from './schema.ts'
export { validateMetricGrid } from './validate.ts'
export { MetricGridRender } from './Render.tsx'

export const metricGridPreset: PresetModule = {
  kind: 'metric-grid',
  schema: metricGridSchema,
  validate: validateMetricGrid,
  Render: MetricGridRender,
}
