import { describe, expect, it } from 'vitest'
import { registerMcpAppToolViews } from '../src/client/index.tsx'

describe('MCP Apps DSH registration seam', () => {
  it('registers the exact wire names supplied by the composition', () => {
    const registrations: string[] = []
    const fakeContext = {
      slots: {
        inject: (_name: string, factory: () => Iterable<unknown>) => {
          for (const _registration of factory()) {}
        },
        register: (options: { key?: string }) => {
          registrations.push(options.key ?? '')
          return () => undefined
        },
      },
    }
    registerMcpAppToolViews(fakeContext as never, ['mcp__example_server__render_tool', 'mcp__second_server__display_tool'])
    expect(registrations).toEqual(['mcp__example_server__render_tool', 'mcp__second_server__display_tool'])
  })
})
