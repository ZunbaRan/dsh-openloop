import type { PresetModule } from '../index.ts'
import { timelineSchema } from './schema.ts'
import { validateTimeline } from './validate.ts'
import { TimelineRender } from './Render.tsx'

export { timelineSchema } from './schema.ts'
export { validateTimeline } from './validate.ts'
export { TimelineRender } from './Render.tsx'

export const timelinePreset: PresetModule = {
  kind: 'timeline',
  schema: timelineSchema,
  validate: validateTimeline,
  Render: TimelineRender,
}
