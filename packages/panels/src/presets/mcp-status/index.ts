import type { PresetModule } from '../index.ts'
import { mcpStatusSchema } from './schema.ts'
import { validateMcpStatus } from './validate.ts'
import { McpStatusRender } from './Render.tsx'

export { mcpStatusSchema } from './schema.ts'
export { validateMcpStatus } from './validate.ts'
export { McpStatusRender } from './Render.tsx'

export const mcpStatusPreset: PresetModule = {
  kind: 'mcp-status',
  schema: mcpStatusSchema,
  validate: validateMcpStatus,
  Render: McpStatusRender,
}
