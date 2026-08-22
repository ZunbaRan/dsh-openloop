import { describe, expect, it } from 'vitest'
import { apply, name } from '../src/index.ts'

describe('MCP meta bundle', () => {
  it('composes the runtime, tools, and apps plugins', async () => {
    const plugins: string[] = []
    await apply({
      plugin: async (plugin: { name: string }) => {
        plugins.push(plugin.name)
      },
    } as never)

    expect(name).toBe('openloop-dsh-mcp')
    expect(plugins).toEqual([
      'openloop-dsh-mcp-runtime',
      'openloop-dsh-mcp-apps',
      'openloop-dsh-mcp-tools',
    ])
  })
})
