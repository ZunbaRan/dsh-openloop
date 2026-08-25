import type { PresetModule } from '../index.ts'
import { apiCredentialsSchema } from './schema.ts'
import { validateApiCredentials } from './validate.ts'
import { ApiCredentialsRender } from './Render.tsx'

export { apiCredentialsSchema } from './schema.ts'
export { validateApiCredentials } from './validate.ts'
export { ApiCredentialsRender } from './Render.tsx'

export const apiCredentialsPreset: PresetModule = {
  kind: 'api-credentials',
  schema: apiCredentialsSchema,
  validate: validateApiCredentials,
  Render: ApiCredentialsRender,
}
