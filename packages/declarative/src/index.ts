import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { declarativeSkillProvider } from './skill.ts'
import { OUTPUT_SCHEMA, VISUALIZE_PARAMETERS, VISUALIZE_UI_TOOL, type SurfaceMode } from './document.ts'
import { parseDocumentInput } from './validation.ts'

export * from './document.ts'
export const name = 'openloop-visual-declarative'
export const inject = ['tools', 'skills']

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: VISUALIZE_UI_TOOL,
    description: 'Deprecated: prefer the panel tool (its preset kinds include flow, timeline, and comparison) or html_artifact. Renders one polished native Flow, Timeline, or Comparison in the conversation from bounded JSON, executing no generated code. Load the openloop-visual-declarative skill before the first call.',
    parameters: VISUALIZE_PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      render: (_args, value) => [{ type: 'text', text: `Rendered native ${value.document.kind} visualization: ${value.document.title}.` }],
      presentationMeta: (_args, value) => ({ kind: 'openloop.declarative', ...value }),
    },
    async execute(args) {
      const document = parseDocumentInput(args.document)
      return { version: 1 as const, mode: (args.mode ?? 'inline') as SurfaceMode, document }
    },
    presentCall: () => ({ card: 'generic', title: 'OpenLoop Visual · rendering', kind: 'other' }),
    presentResult(_args, result) {
      if (result.isError) return undefined
      const meta = result.meta as { document?: { title?: unknown } } | undefined
      return { card: 'generic', title: typeof meta?.document?.title === 'string' ? meta.document.title : 'OpenLoop Visual' }
    },
  }))
  ctx.skills.registerProvider(() => declarativeSkillProvider)
}
