import type { PresetModule } from '../index.ts'
import { avatarSchema } from './schema.ts'
import { validateAvatar } from './validate.ts'
import { AvatarRender } from './Render.tsx'

export { avatarSchema } from './schema.ts'
export { validateAvatar } from './validate.ts'
export { AvatarRender } from './Render.tsx'

export const avatarPreset: PresetModule = {
  kind: 'avatar',
  schema: avatarSchema,
  validate: validateAvatar,
  Render: AvatarRender,
}
