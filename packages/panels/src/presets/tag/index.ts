import type { PresetModule } from '../index.ts'
import { tagSchema } from './schema.ts'
import { validateTag } from './validate.ts'
import { TagRender } from './Render.tsx'

export { tagSchema } from './schema.ts'
export { validateTag } from './validate.ts'
export { TagRender } from './Render.tsx'

export const tagPreset: PresetModule = {
  kind: 'tag',
  schema: tagSchema,
  validate: validateTag,
  Render: TagRender,
}
