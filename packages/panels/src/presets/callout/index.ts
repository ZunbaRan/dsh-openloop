import type { PresetModule } from '../index.ts'
import { calloutSchema } from './schema.ts'
import { validateCallout } from './validate.ts'
import { CalloutRender } from './Render.tsx'

export { calloutSchema } from './schema.ts'
export { validateCallout } from './validate.ts'
export { CalloutRender } from './Render.tsx'

export const calloutPreset: PresetModule = {
  kind: 'callout',
  schema: calloutSchema,
  validate: validateCallout,
  Render: CalloutRender,
}
