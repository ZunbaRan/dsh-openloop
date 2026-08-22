import type { PresetModule } from '../index.ts'
import { gaugeSchema } from './schema.ts'
import { validateGauge } from './validate.ts'
import { GaugeRender } from './Render.tsx'

export { gaugeSchema } from './schema.ts'
export { validateGauge } from './validate.ts'
export { GaugeRender } from './Render.tsx'

export const gaugePreset: PresetModule = {
  kind: 'gauge',
  schema: gaugeSchema,
  validate: validateGauge,
  Render: GaugeRender,
}
