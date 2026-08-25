import type { PresetModule } from '../index.ts'
import { pbStatsSchema } from './schema.ts'
import { validatePbStats } from './validate.ts'
import { PbStatsRender } from './Render.tsx'

export { pbStatsSchema } from './schema.ts'
export { validatePbStats } from './validate.ts'
export { PbStatsRender } from './Render.tsx'

export const pbStatsPreset: PresetModule = {
  kind: 'pb-stats',
  schema: pbStatsSchema,
  validate: validatePbStats,
  Render: PbStatsRender,
}
