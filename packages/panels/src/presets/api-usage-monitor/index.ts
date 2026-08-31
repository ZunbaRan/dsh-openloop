import type { PresetModule } from '../index.ts'
import { apiUsageMonitorSchema } from './schema.ts'
import { validateApiUsageMonitor } from './validate.ts'
import { ApiUsageMonitorRender } from './Render.tsx'

export { apiUsageMonitorSchema } from './schema.ts'
export { validateApiUsageMonitor } from './validate.ts'
export { ApiUsageMonitorRender } from './Render.tsx'

export const apiUsageMonitorPreset: PresetModule = {
  kind: 'api-usage-monitor',
  schema: apiUsageMonitorSchema,
  validate: validateApiUsageMonitor,
  Render: ApiUsageMonitorRender,
}
