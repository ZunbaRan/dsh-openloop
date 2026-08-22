import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

describe('MCP App fixture contract', () => {
  it('declares one bound tool, text fallback, and ui resource', async () => {
    const source = await readFile(new URL('../src/server.ts', import.meta.url), 'utf8')
    expect(source).toContain("const TOOL_NAME = 'mcp_app_tool'")
    expect(source).toContain("const RESOURCE_URI = 'ui://fixture/mcp-app.html'")
    expect(source).toContain("const MIME_TYPE = 'text/html;profile=mcp-app'")
    expect(source).toContain('MCP fixture fallback:')
    expect(source).toContain('ui/notifications/tool-result')
    expect(source).toContain("properties: { label:")
    expect(source).toContain('data-action="increment"')
    expect(source).toContain('structuredContent?.label')
  })
})
