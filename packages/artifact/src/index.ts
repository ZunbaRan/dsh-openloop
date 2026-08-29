import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-fs'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { artifactSkillProvider } from './skill.ts'
import { hash, HTML_ARTIFACT_TOOL, slug, validateArtifact, type ArtifactRuntime } from './contract.ts'

export * from './contract.ts'
export * from './shell.ts'
export const name = 'openloop-html-artifact'
export const inject = ['tools', 'skills', 'fs']

export interface Config { maxStaticBytes: number; maxScriptBytes: number; allowScripts: boolean }
export const Config: z<Config> = z.object({
  maxStaticBytes: z.natural().default(1_000_000),
  maxScriptBytes: z.natural().default(600_000),
  allowScripts: z.boolean().default(true),
})

export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(defineTool({
    name: HTML_ARTIFACT_TOOL,
    description: 'Render a completely free HTML page (multi-panel explorer, simulation, custom topology, fullscreen app). Choose static by default, scripts for local computation, network when live API data is needed (openloop.fetch). Routing: use panel for structured dashboards (preset widgets, API data binding, auto refresh) and for flow/timeline/comparison diagrams (panel preset kinds); use show_widget for one small temporary card. Load the openloop-html-artifact skill first.',
    parameters: {
      title: { type: 'string', required: true, description: 'Short artifact title.' },
      runtime: { type: 'string', enum: ['static', 'scripts', 'network'], required: true, description: 'static rejects scripts; scripts = local JS (canvas/eval/wasm, offline); network = scripts + openloop.fetch bridge for API data (https-only JSON, SSRF-guarded).' },
      html: { type: 'string', required: true, description: 'Self-contained body HTML with optional style; no document skeleton or remote assets.' },
    },
    output: {
      schema: {
        type: 'object', additionalProperties: false,
        properties: {
          version: { type: 'integer', const: 1, required: true }, title: { type: 'string', required: true },
          runtime: { type: 'string', enum: ['static', 'scripts', 'network'], required: true }, html: { type: 'string', required: true },
          path: { type: 'string', required: true }, sizeBytes: { type: 'integer', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `Rendered ${value.runtime} HTML artifact: ${value.title} (${value.sizeBytes} bytes; workspace copy at ${value.path}).` }],
      presentationMeta: (_args, value) => ({ kind: 'openloop.html-artifact', version: 1, title: value.title, runtime: value.runtime, html: value.html, path: value.path }),
    },
    async execute(args, exec) {
      const title = args.title.trim()
      if (!title) throw new Error('html_artifact title must not be empty')
      if (title.length > 120) throw new Error('html_artifact title must be at most 120 characters')
      const runtime = args.runtime as ArtifactRuntime
      if (runtime === 'scripts' && !config.allowScripts) throw new Error('scripted HTML artifacts are disabled by deployment policy')
      const sizeBytes = validateArtifact(args.html, runtime, runtime === 'static' ? config.maxStaticBytes : config.maxScriptBytes)
      const sandboxPolicy = ctx.get('sandboxPolicy')?.resolve({ ...(exec.agent ? { session: exec.agent.session } : {}) })
      const cwd = sandboxPolicy?.workspaceRoot ?? exec.agent?.session.header.cwd
      const target = await ctx.fs.resolve(`artifacts/${slug(title)}-${hash(`${runtime}\0${args.html}`)}.html`, { ...(cwd ? { cwd } : {}), signal: exec.signal })
      await ctx.fs.writeText(target, args.html, undefined, exec.signal, sandboxPolicy)
      return { version: 1 as const, title, runtime, html: args.html, path: target.displayPath, sizeBytes }
    },
    presentCall: () => ({ card: 'generic', title: 'HTML Artifact · building', kind: 'other' }),
    presentResult: (_args, result) => result.isError ? undefined : ({ card: 'generic', title: 'HTML Artifact' }),
  }))
  ctx.skills.registerProvider(() => artifactSkillProvider)
}
