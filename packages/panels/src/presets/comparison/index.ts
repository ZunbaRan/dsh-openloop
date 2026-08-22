import type { PresetModule } from '../index.ts'
import { comparisonSchema } from './schema.ts'
import { validateComparison } from './validate.ts'
import { ComparisonRender } from './Render.tsx'

export { comparisonSchema } from './schema.ts'
export { validateComparison } from './validate.ts'
export { ComparisonRender } from './Render.tsx'

export const comparisonPreset: PresetModule = {
  kind: 'comparison',
  schema: comparisonSchema,
  validate: validateComparison,
  Render: ComparisonRender,
}
