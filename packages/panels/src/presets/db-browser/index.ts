import type { PresetModule } from '../index.ts'
import { dbBrowserSchema } from './schema.ts'
import { validateDbBrowser } from './validate.ts'
import { DbBrowserRender } from './Render.tsx'

export { dbBrowserSchema } from './schema.ts'
export { validateDbBrowser } from './validate.ts'
export { DbBrowserRender } from './Render.tsx'

export const dbBrowserPreset: PresetModule = {
  kind: 'db-browser',
  schema: dbBrowserSchema,
  validate: validateDbBrowser,
  Render: DbBrowserRender,
}
