import type { PresetModule } from '../index.ts'
import { badgeSchema } from './schema.ts'
import { validateBadge } from './validate.ts'
import { BadgeRender } from './Render.tsx'

export { badgeSchema } from './schema.ts'
export { validateBadge } from './validate.ts'
export { BadgeRender } from './Render.tsx'

export const badgePreset: PresetModule = {
  kind: 'badge',
  schema: badgeSchema,
  validate: validateBadge,
  Render: BadgeRender,
}
