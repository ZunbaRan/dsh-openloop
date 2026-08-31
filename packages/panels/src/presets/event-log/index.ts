import type { PresetModule } from '../index.ts'
import { eventLogSchema } from './schema.ts'
import { validateEventLog } from './validate.ts'
import { EventLogRender } from './Render.tsx'

export { eventLogSchema } from './schema.ts'
export { validateEventLog } from './validate.ts'
export { EventLogRender } from './Render.tsx'

export const eventLogPreset: PresetModule = {
  kind: 'event-log',
  schema: eventLogSchema,
  validate: validateEventLog,
  Render: EventLogRender,
}
