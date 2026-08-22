import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'

describe('artifact plugin', () => {
  it('registers its tool and writes through the session sandbox policy', async () => {
    let tool: { execute(args: unknown, exec: unknown): Promise<unknown> } | undefined
    const writes: Array<{ path: string; policy: unknown }> = []
    const policy = { workspaceRoot: '/work' }
    const ctx = {
      tools: { register: (value: unknown) => { tool = value as typeof tool } },
      skills: { registerProvider: () => undefined },
      get: () => ({ resolve: () => policy }),
      fs: {
        resolve: async (path: string) => ({ displayPath: `/work/${path}`, path }),
        writeText: async (target: { path: string }, _html: string, _encoding: unknown, _signal: unknown, usedPolicy: unknown) => { writes.push({ path: target.path, policy: usedPolicy }) },
      },
    } as unknown as Context
    apply(ctx, { maxStaticBytes: 1000, maxScriptBytes: 1000, allowScripts: true })
    const value = await tool!.execute({ title: 'Demo', runtime: 'static', html: '<main>Demo</main>' }, { signal: new AbortController().signal, agent: { session: { header: { cwd: '/fallback' } } } }) as { path: string }
    expect(value.path).toMatch(/^\/work\/artifacts\/demo-[0-9a-f]{8}\.html$/u)
    expect(writes[0]?.policy).toBe(policy)
  })
})
