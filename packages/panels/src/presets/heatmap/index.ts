import type { PresetModule } from '../index.ts'
import { heatmapSchema } from './schema.ts'
import { validateHeatmap } from './validate.ts'
import { HeatmapRender } from './Render.tsx'

export { heatmapSchema } from './schema.ts'
export { validateHeatmap } from './validate.ts'
export { HeatmapRender } from './Render.tsx'

export const heatmapPreset: PresetModule = {
  kind: 'heatmap',
  schema: heatmapSchema,
  validate: validateHeatmap,
  Render: HeatmapRender,
}
