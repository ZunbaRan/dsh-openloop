import type { PresetModule } from '../index.ts'
import { sparklineSchema } from './schema.ts'
import { validateSparkline } from './validate.ts'
import { SparklineRender } from './Render.tsx'

export { sparklineSchema } from './schema.ts'
export { validateSparkline } from './validate.ts'
export { SparklineRender } from './Render.tsx'

export const sparklinePreset: PresetModule = {
  kind: 'sparkline',
  schema: sparklineSchema,
  validate: validateSparkline,
  Render: SparklineRender,
}
