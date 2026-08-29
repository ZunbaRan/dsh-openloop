import { describe, expect, it } from 'vitest'
import type { PanelDefinition } from '../src/contract.ts'
import { definePanelTool } from '../src/tool.ts'

const tool = definePanelTool()

describe('live panel contract: credentials never through DSH', () => {
  it('api Authorization 明文拒绝且不引导 credentialRef', async () => {
    const panel: PanelDefinition = {
      $schema: 'openloop.panel/v1',
      id: 'hello-panel',
      title: 'Hello Panel',
      widgets: [{
        id: 'data',
        source: { type: 'preset', kind: 'metric', props: { label: '月营收', value: 48210 } },
        data: { source: { type: 'api', url: 'https://api.example.com/stats', headers: { Authorization: 'Bearer x' } } },
      }],
    }
    let message = ''
    try {
      await tool.execute({ panel }, { signal: new AbortController().signal } as never)
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }
    expect(message).toMatch(/Authorization/)
    expect(message).not.toMatch(/credentialRef/)
  })
})
