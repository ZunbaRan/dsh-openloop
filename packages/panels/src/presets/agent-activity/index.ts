import type { PresetModule } from '../index.ts'
import { agentActivitySchema } from './schema.ts'
import { validateAgentActivity } from './validate.ts'
import { AgentActivityRender } from './Render.tsx'

export { agentActivitySchema } from './schema.ts'
export { validateAgentActivity } from './validate.ts'
export { AgentActivityRender } from './Render.tsx'

export const agentActivityPreset: PresetModule = {
  kind: 'agent-activity',
  schema: agentActivitySchema,
  validate: validateAgentActivity,
  Render: AgentActivityRender,
}
