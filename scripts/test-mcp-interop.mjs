import assert from 'node:assert/strict'
import { McpRuntime } from '../packages/mcp-runtime/lib/index.js'

const tldrawUrl = process.env.TLDRAW_MCP_URL ?? 'http://127.0.0.1:39513/mcp'
const runtime = new McpRuntime({
  requestTimeoutMs: 30_000,
  servers: [
    { id: 'tldraw', protocol: '2026-07-28', transport: { kind: 'streamable-http', url: tldrawUrl } },
    { id: 'excalidraw', protocol: 'legacy', transport: { kind: 'streamable-http', url: 'https://mcp.excalidraw.com' } },
    { id: 'sequential_thinking', protocol: 'legacy', transport: { kind: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] } },
  ],
})

try {
  const tldrawTools = await runtime.listTools('tldraw')
  assert.equal(tldrawTools.filter(({ modelVisible }) => modelVisible).length, 10)
  assert.equal(tldrawTools.filter(({ appVisible }) => appVisible).length, 15)
  const tldrawTool = tldrawTools.find(({ name }) => name === 'tldraw_create_view')
  assert.ok(tldrawTool?.ui)
  const tldraw = await runtime.callTool('tldraw', tldrawTool.name, {
    canvasId: 'dsh-real-interop-acceptance',
    createIfMissing: true,
    idempotencyKey: 'dsh-real-interop-acceptance-v1',
    elements: [{ id: 'acceptance-box', kind: 'geo', shape: 'rectangle', x: 80, y: 80, width: 320, height: 160, text: 'DSH ↔ tldraw MCP 2026', style: { color: 'blue', fill: 'semi' } }],
  }, { binding: tldrawTool.ui })
  assert.equal(tldraw.isError, false)
  assert.ok(tldraw.uiResource && 'html' in tldraw.uiResource)
  assert.ok(Buffer.byteLength(tldraw.uiResource.html) > 4_000_000)

  const excalidrawTools = await runtime.listTools('excalidraw')
  assert.deepEqual(excalidrawTools.filter(({ modelVisible }) => modelVisible).map(({ name }) => name), ['read_me', 'create_view'])
  assert.deepEqual(excalidrawTools.filter(({ appVisible }) => appVisible).map(({ name }) => name), ['export_to_excalidraw', 'save_checkpoint', 'read_checkpoint'])
  const excalidrawTool = excalidrawTools.find(({ name }) => name === 'create_view')
  assert.ok(excalidrawTool?.ui)
  const excalidraw = await runtime.callTool('excalidraw', excalidrawTool.name, {
    elements: JSON.stringify([{ id: 'acceptance', type: 'rectangle', x: 80, y: 80, width: 320, height: 160, strokeColor: '#1e40af', backgroundColor: '#dbeafe', fillStyle: 'solid' }]),
  }, { binding: excalidrawTool.ui })
  assert.equal(excalidraw.isError, false)
  assert.ok(excalidraw.uiResource && 'html' in excalidraw.uiResource)
  assert.ok(Buffer.byteLength(excalidraw.uiResource.html) > 400_000)

  const sequentialTools = await runtime.listTools('sequential_thinking')
  assert.deepEqual(sequentialTools.map(({ name, ui }) => ({ name, ui })), [{ name: 'sequentialthinking', ui: undefined }])
  const sequential = await runtime.callTool('sequential_thinking', 'sequentialthinking', {
    thought: 'Verify that an ordinary MCP tool remains text-only beside MCP Apps.',
    nextThoughtNeeded: false,
    thoughtNumber: 1,
    totalThoughts: 1,
  })
  assert.equal(sequential.isError, false)
  assert.equal(sequential.uiResource, undefined)
  assert.ok(sequential.content.some((part) => typeof part === 'object' && part !== null && part.type === 'text'))

  console.log(JSON.stringify({
    tldraw: { tools: tldrawTools.length, appBytes: Buffer.byteLength(tldraw.uiResource.html) },
    excalidraw: { tools: excalidrawTools.length, appBytes: Buffer.byteLength(excalidraw.uiResource.html) },
    sequentialThinking: { tools: sequentialTools.length, textOnly: true },
  }))
} finally {
  await runtime.close()
}
