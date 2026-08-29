import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { SHOW_WIDGET_TOOL, validateWidget } from './contract.ts'
import { widgetSkillProvider } from './skill.ts'

export * from './contract.ts'
export * from './shell.ts'
export const name = 'openloop-show-widget'
export const inject = ['tools', 'skills']

export interface Config { maxFragmentBytes: number }
export const Config: z<Config> = z.object({ maxFragmentBytes: z.natural().default(300_000) })

export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(defineTool({
    name: SHOW_WIDGET_TOOL,
    description: 'Render a small, self-contained interactive HTML fragment inline. Use for one focused simulator, calculator, or free-form explanation that fits a single card; the fragment is offline (network APIs are blocked, no live API data). Routing: use panel for multi-widget dashboards and for flow/timeline/comparison diagrams (panel preset kinds); use html_artifact for a large multi-panel page or anything needing live API data. Load the openloop-show-widget skill first.',
    parameters: {
      title: { type: 'string', required: true, description: 'Short user-facing title.' },
      fragment: { type: 'string', required: true, description: 'Inline HTML fragment with optional inline style/script; no document skeleton or remote assets.' },
    },
    output: {
      schema: { type: 'object', additionalProperties: false, properties: { version: { type: 'integer', const: 1, required: true }, title: { type: 'string', required: true }, fragment: { type: 'string', required: true }, sizeBytes: { type: 'integer', required: true } } },
      render: (_args, value) => [{ type: 'text', text: `Rendered widget: ${value.title} (${value.sizeBytes} bytes).` }],
      presentationMeta: (_args, value) => ({ kind: 'openloop.widget', version: 1, title: value.title, fragment: value.fragment }),
    },
    async execute(args) {
      const title = args.title.trim()
      if (!title) throw new Error('show_widget title must not be empty')
      if (title.length > 120) throw new Error('show_widget title must be at most 120 characters')
      const sizeBytes = validateWidget(args.fragment, config.maxFragmentBytes)
      return { version: 1 as const, title, fragment: args.fragment, sizeBytes }
    },
    presentCall: () => ({ card: 'generic', title: 'Widget · composing', kind: 'other' }),
    presentResult: (_args, result) => result.isError ? undefined : ({ card: 'generic', title: 'Widget' }),
  }))
  ctx.skills.registerProvider(() => widgetSkillProvider)
}
