import type { PresetModule } from '../index.ts'
import { headingSchema } from './schema.ts'
import { validateHeading } from './validate.ts'
import { HeadingRender } from './Render.tsx'

export { headingSchema } from './schema.ts'
export { validateHeading } from './validate.ts'
export { HeadingRender } from './Render.tsx'

export const headingPreset: PresetModule = {
  kind: 'heading',
  schema: headingSchema,
  validate: validateHeading,
  Render: HeadingRender,
}
