import type { PresetModule } from '../index.ts'
import { storageUsageSchema } from './schema.ts'
import { validateStorageUsage } from './validate.ts'
import { StorageUsageRender } from './Render.tsx'

export { storageUsageSchema } from './schema.ts'
export { validateStorageUsage } from './validate.ts'
export { StorageUsageRender } from './Render.tsx'

export const storageUsagePreset: PresetModule = {
  kind: 'storage-usage',
  schema: storageUsageSchema,
  validate: validateStorageUsage,
  Render: StorageUsageRender,
}
