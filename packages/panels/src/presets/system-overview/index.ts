import type { PresetModule } from '../index.ts'
import { systemOverviewSchema } from './schema.ts'
import { validateSystemOverview } from './validate.ts'
import { SystemOverviewRender } from './Render.tsx'

export { systemOverviewSchema } from './schema.ts'
export { validateSystemOverview } from './validate.ts'
export { SystemOverviewRender } from './Render.tsx'

export const systemOverviewPreset: PresetModule = {
  kind: 'system-overview',
  schema: systemOverviewSchema,
  validate: validateSystemOverview,
  Render: SystemOverviewRender,
}
