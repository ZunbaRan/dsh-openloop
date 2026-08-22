import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'

describe('visualize_ui DSH tool integration', () => {
  it('executes the JSON-string document emitted by the real DSH session', async () => {
    let tool: { execute(args: unknown, exec: unknown): Promise<unknown> } | undefined
    const ctx = {
      tools: { register: (value: unknown) => { tool = value as typeof tool } },
      skills: { registerProvider: () => undefined },
      settings: { register: () => ({}) },
    } as unknown as Context
    apply(ctx)

    const document = JSON.stringify({
      kind: 'flow', title: 'Test Flow',
      nodes: [{ id: 'a', label: 'Node A' }, { id: 'b', label: 'Node B' }],
      edges: [{ from: 'a', to: 'b' }],
    })
    const value = await tool!.execute(
      { document, mode: 'inline' },
      { signal: new AbortController().signal },
    ) as { version: number; mode: string; document: { kind: string; title: string } }

    expect(value).toMatchObject({ version: 1, mode: 'inline', document: { kind: 'flow', title: 'Test Flow' } })
  })
})
