import type { PresetModule } from '../index.ts'
import { progressSchema } from './schema.ts'
import { validateProgress } from './validate.ts'
import { ProgressRender } from './Render.tsx'

export { progressSchema } from './schema.ts'
export { validateProgress } from './validate.ts'
export { ProgressRender } from './Render.tsx'

export const progressPreset: PresetModule = {
  kind: 'progress',
  schema: progressSchema,
  validate: validateProgress,
  Render: ProgressRender,
}
