import type { PresetModule } from '../index.ts'
import { textSchema } from './schema.ts'
import { validateText } from './validate.ts'
import { TextRender } from './Render.tsx'

export { textSchema } from './schema.ts'
export { validateText } from './validate.ts'
export { TextRender } from './Render.tsx'

export const textPreset: PresetModule = {
  kind: 'text',
  schema: textSchema,
  validate: validateText,
  Render: TextRender,
}
