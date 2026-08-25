import type { PresetModule } from '../index.ts'
import { sessionsStatsSchema } from './schema.ts'
import { validateSessionsStats } from './validate.ts'
import { SessionsStatsRender } from './Render.tsx'

export { sessionsStatsSchema } from './schema.ts'
export { validateSessionsStats } from './validate.ts'
export { SessionsStatsRender } from './Render.tsx'

export const sessionsStatsPreset: PresetModule = {
  kind: 'sessions-stats',
  schema: sessionsStatsSchema,
  validate: validateSessionsStats,
  Render: SessionsStatsRender,
}
