import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeEntry = resolve(root, 'packages/mcp-runtime/lib/index.js')
const fixtureEntry = resolve(root, 'fixtures/mcp-app-server/dist/server.js')

async function run(command, args) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
    child.once('error', rejectRun)
    child.once('exit', (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${command} ${args.join(' ')} exited ${code}`)))
  })
}

try { await access(runtimeEntry) } catch { await run('pnpm', ['--filter', '@openloop/dsh-mcp-runtime', 'build']) }
try { await access(fixtureEntry) } catch { await run('pnpm', ['--filter', '@openloop/dsh-mcp-app-fixture', 'build']) }

const { McpRuntime } = await import(runtimeEntry)
const appRuntime = new McpRuntime({
  servers: [{
    id: 'fixture',
    transport: { kind: 'stdio', command: process.execPath, args: [fixtureEntry] },
  }],
})

try {
  const tools = await appRuntime.listTools('fixture')
  assert.equal(tools.length, 1)
  const tool = tools[0]
  assert.ok(tool)
  assert.equal(tool.name, 'mcp_app_tool')
  assert.equal(tool.ui?.resourceUri, 'ui://fixture/mcp-app.html')
  assert.equal(tool._meta?.fixtureTool, true)

  assert.deepEqual(tool.inputSchema.properties.label, { type: 'string', description: 'Label shown by the interactive fixture.' })
  const result = await appRuntime.callTool('fixture', 'mcp_app_tool', { label: 'E2E interactive acceptance' }, { binding: tool.ui })
  assert.deepEqual(result.content, [{ type: 'text', text: 'MCP fixture fallback: E2E interactive acceptance' }])
  assert.deepEqual(result.structuredContent, { label: 'E2E interactive acceptance', rendered: true })
  assert.deepEqual(result._meta, { fixtureResult: true, connection: 'shared' })
  assert.equal(result.uiResource?.resourceUri, 'ui://fixture/mcp-app.html')
  assert.equal(result.uiResource?.mimeType, 'text/html;profile=mcp-app')
  assert.match(result.uiResource?.html ?? '', /ui\/notifications\/tool-result/)
  assert.match(result.uiResource?.html ?? '', /data-action="increment"/)
  assert.equal(appRuntime.connectionCount('fixture'), 1)

  const resource = await appRuntime.readAppResource('fixture', 'ui://fixture/mcp-app.html', tool.ui)
  assert.equal(resource._meta?.fixtureResource, true)
  await assert.rejects(() => appRuntime.readAppResource('fixture', 'https://invalid.test/app.html', tool.ui), (error) => error?.code === 'RESOURCE_URI')
  console.log(JSON.stringify({ tools: tools.map(({ name }) => name), toolCall: result.content, resource: resource.resourceUri, connectionCount: appRuntime.connectionCount('fixture') }))
} finally {
  await appRuntime.close()
}
