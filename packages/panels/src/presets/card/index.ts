import type { PresetModule } from '../index.ts'
import { cardSchema } from './schema.ts'
import { validateCard } from './validate.ts'
import { CardRender } from './Render.tsx'

export { cardSchema } from './schema.ts'
export { validateCard } from './validate.ts'
export { CardRender } from './Render.tsx'

export const cardPreset: PresetModule = {
  kind: 'card',
  schema: cardSchema,
  validate: validateCard,
  Render: CardRender,
}
