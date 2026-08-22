import { describe, expect, it } from 'vitest'
import { mcpToolName, textFallback } from '../src/contract.ts'

describe('MCP tool contract', () => {
  it('keeps the ordinary DSH wire name', () => {
    expect(mcpToolName('server', 'tool')).toBe('mcp__server__tool')
  })

  it('renders text while preserving non-text content as a diagnostic fallback', () => {
    expect(textFallback([
      { type: 'text', text: 'hello' },
      { type: 'image', mimeType: 'image/png' },
    ])).toContain('hello')
    expect(textFallback([{ type: 'image', mimeType: 'image/png' }])).toContain('image/png')
  })
})
