import type { PresetModule } from '../index.ts'
import { markdownSchema } from './schema.ts'
import { validateMarkdown } from './validate.ts'
import { MarkdownRender } from './Render.tsx'

export { markdownSchema } from './schema.ts'
export { validateMarkdown } from './validate.ts'
export { MarkdownRender } from './Render.tsx'
export { renderInline, renderMarkdown } from './md.tsx'

export const markdownPreset: PresetModule = {
  kind: 'markdown',
  schema: markdownSchema,
  validate: validateMarkdown,
  Render: MarkdownRender,
}
