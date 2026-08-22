import type { PresetModule } from '../index.ts'
import { accordionSchema } from './schema.ts'
import { validateAccordion } from './validate.ts'
import { AccordionRender } from './Render.tsx'

export { accordionSchema } from './schema.ts'
export { validateAccordion } from './validate.ts'
export { AccordionRender } from './Render.tsx'

export const accordionPreset: PresetModule = {
  kind: 'accordion',
  schema: accordionSchema,
  validate: validateAccordion,
  Render: AccordionRender,
}
