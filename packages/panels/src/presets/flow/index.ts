import type { PresetModule } from '../index.ts'
import { flowSchema } from './schema.ts'
import { validateFlow } from './validate.ts'
import { FlowRender } from './Render.tsx'

export { flowSchema } from './schema.ts'
export { validateFlow } from './validate.ts'
export { FlowRender } from './Render.tsx'

export const flowPreset: PresetModule = {
  kind: 'flow',
  schema: flowSchema,
  validate: validateFlow,
  Render: FlowRender,
}
