import type { PresetModule } from '../index.ts'
import { funnelSchema } from './schema.ts'
import { validateFunnel } from './validate.ts'
import { FunnelRender } from './Render.tsx'

export { funnelSchema } from './schema.ts'
export { validateFunnel } from './validate.ts'
export { FunnelRender } from './Render.tsx'

export const funnelPreset: PresetModule = {
  kind: 'funnel',
  schema: funnelSchema,
  validate: validateFunnel,
  Render: FunnelRender,
}
