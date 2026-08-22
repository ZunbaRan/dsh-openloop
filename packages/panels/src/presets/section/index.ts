import type { PresetModule } from '../index.ts'
import { sectionSchema } from './schema.ts'
import { validateSection } from './validate.ts'
import { SectionRender } from './Render.tsx'

export { sectionSchema } from './schema.ts'
export { validateSection } from './validate.ts'
export { SectionRender } from './Render.tsx'

export const sectionPreset: PresetModule = {
  kind: 'section',
  schema: sectionSchema,
  validate: validateSection,
  Render: SectionRender,
}
