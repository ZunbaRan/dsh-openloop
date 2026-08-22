import assert from 'node:assert/strict'
import { access, readFile, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtimeEntry = resolve(root, 'packages/mcp-runtime/lib/index.js')
const appsEntry = resolve(root, 'packages/mcp-apps/lib/index.js')
const appsClientEntry = resolve(root, 'packages/mcp-apps/lib/client.js')
const metaClientEntry = resolve(root, 'packages/mcp/lib/client.js')

async function run(command, args) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit' })
    child.once('error', rejectRun)
    child.once('exit', (code) => code === 0 ? resolveRun() : rejectRun(new Error(`${command} ${args.join(' ')} exited ${code}`)))
  })
}

try { await access(runtimeEntry) } catch { await run('pnpm', ['--filter', '@openloop/dsh-mcp-runtime', 'build']) }
try {
  await access(appsEntry)
  await access(appsClientEntry)
} catch {
  await run('pnpm', ['--filter', '@openloop/dsh-mcp-apps', 'build'])
}
try { await access(metaClientEntry) } catch { await run('pnpm', ['--filter', '@openloop/dsh-mcp', 'build']) }

const runtimeApi = await import(runtimeEntry)
const appsApi = await import(appsEntry)
const { McpRuntime, validateAppResource, validateAppHtml, validateAppMetadata } = runtimeApi
const { buildSandboxDocument, isTrustedAppMessage, parseMcpAppPresentation } = appsApi
const appsClientBundle = await readFile(resolve(root, 'packages/mcp-apps/lib/client.js'), 'utf8')
const metaClientBundle = await readFile(resolve(root, 'packages/mcp/lib/client.js'), 'utf8')
assert.doesNotMatch(appsClientBundle, /require\(["']@modelcontextprotocol\//)
assert.doesNotMatch(metaClientBundle, /require\(["']@openloop\/dsh-mcp-apps/)
assert.match(appsClientBundle, /serverTools:\s*\{\}/)
assert.match(appsClientBundle, /callToolUrl/)
assert.match(metaClientBundle, /mcp__fixture__mcp_app_tool/)
assert.match(metaClientBundle, /mcp__tldraw__tldraw_create_view/)
assert.match(metaClientBundle, /mcp__excalidraw__create_view/)

async function sourceFiles(directory) {
  const files = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) files.push(...await sourceFiles(path))
    else if (/\.(?:d\.ts|[cm]?[jt]sx?)$/.test(entry.name)) files.push(path)
  }
  return files
}

for (const path of [...await sourceFiles(resolve(root, 'packages/mcp-apps/src')), ...[
  resolve(root, 'packages/mcp-apps/lib/index.js'),
  resolve(root, 'packages/mcp-apps/lib/index.d.ts'),
  resolve(root, 'packages/mcp-apps/lib/client.js'),
]]) {
  assert.doesNotMatch(await readFile(path, 'utf8'), /\bfixture\b/i, `fixture identity leaked into ${path}`)
}

function rejectsWithCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code)
}

const uri = 'ui://fixture/app.html'
const good = [{ uri, mimeType: 'text/html;profile=mcp-app', text: '<div>safe</div>', _meta: { ui: { permissions: {}, csp: { connectDomains: [] } } } }]
assert.equal(validateAppResource('fixture', uri, good).html, '<div>safe</div>')
rejectsWithCode(() => validateAppResource('fixture', 'https://evil.test/app.html', good), 'RESOURCE_URI')
rejectsWithCode(() => validateAppResource('fixture', uri, [{ ...good[0], mimeType: 'text/html' }]), 'RESOURCE_MIME')
rejectsWithCode(() => validateAppResource('fixture', uri, [{ ...good[0], text: '12345' }], { maxBytes: 4 }), 'RESOURCE_TOO_LARGE')
rejectsWithCode(() => validateAppResource('fixture', uri, [{ uri, mimeType: 'text/html;profile=mcp-app', blob: Buffer.alloc(8 * 1024 * 1024 + 1).toString('base64') }]), 'RESOURCE_TOO_LARGE')
rejectsWithCode(() => validateAppResource('fixture', uri, [{ uri, mimeType: 'text/html;profile=mcp-app', blob: Buffer.from([0xff]).toString('base64') }]), 'RESOURCE_ENCODING')
rejectsWithCode(() => validateAppResource('fixture', uri, [{ uri, mimeType: 'text/html;profile=mcp-app', blob: 'not-base64' }]), 'RESOURCE_ENCODING')
validateAppMetadata({ ui: { csp: { connectDomains: ['https://esm.sh'] } } })
rejectsWithCode(() => validateAppMetadata({ ui: { csp: { connectDomains: ['http://insecure.test'] } } }), 'RESOURCE_POLICY')
rejectsWithCode(() => validateAppMetadata({ ui: { csp: { connectDomains: ['https://example.test/path'] } } }), 'RESOURCE_POLICY')
validateAppHtml('<!doctype html><html><head></head><body><div>App</div></body></html>')

const source = {}
const trusted = { source, origin: 'null', data: { jsonrpc: '2.0', method: 'ping' } }
assert.equal(isTrustedAppMessage(trusted, source, 'null'), true)
assert.equal(isTrustedAppMessage({ ...trusted, source: {} }, source, 'null'), false)
assert.equal(isTrustedAppMessage({ ...trusted, origin: 'https://evil.test' }, source, 'null'), false)
assert.equal(isTrustedAppMessage({ ...trusted, data: 'not-json-rpc' }, source, 'null'), false)
assert.match(buildSandboxDocument('<div>safe</div>'), /connect-src 'none'/)
assert.match(buildSandboxDocument('<!doctype html><html><head><script>window.ready=true</script></head><body></body></html>'), /Content-Security-Policy/)

const presentation = {
  kind: 'openloop.dsh-mcp', version: 1, callName: 'mcp__fixture__mcp_app_tool', serverId: 'fixture', toolName: 'mcp_app_tool',
  binding: { serverId: 'fixture', toolName: 'mcp_app_tool', resourceUri: uri },
  result: { serverId: 'fixture', toolName: 'mcp_app_tool', content: [{ type: 'text', text: 'fallback' }], isError: false, uiResource: { serverId: 'fixture', resourceUri: uri, mimeType: 'text/html;profile=mcp-app', html: '<div>safe</div>' } },
}
assert.ok(parseMcpAppPresentation(presentation, presentation.callName))
assert.equal(parseMcpAppPresentation({ ...presentation, result: { ...presentation.result, uiResource: { ...presentation.result.uiResource, resourceUri: 'ui://other/app.html' } } }, presentation.callName), undefined)

const fakeFactory = {
  async connect() {
    return {
      async listTools() { return { tools: [{ name: 'mcp_app_tool', inputSchema: { type: 'object' }, _meta: { ui: { resourceUri: uri } } }] } },
      async callTool() { return { content: [{ type: 'text', text: 'ordinary fallback' }], isError: false } },
      async readResource() { return { contents: [{ uri, mimeType: 'text/plain', text: 'bad' }] } },
      async close() {},
    }
  },
}
const runtime = new McpRuntime({ servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }], connectionFactory: fakeFactory })
const binding = { serverId: 'fixture', toolName: 'mcp_app_tool', resourceUri: uri }
const fallback = await runtime.callTool('fixture', 'mcp_app_tool', {}, { binding })
assert.deepEqual(fallback.content, [{ type: 'text', text: 'ordinary fallback' }])
assert.equal(fallback.uiResource, undefined)
await assert.rejects(() => runtime.readAppResource('fixture', uri, { ...binding, resourceUri: 'ui://other/app.html' }), (error) => error?.code === 'INVALID_BINDING')
await runtime.close()

console.log('MCP security probes passed: resource, CSP, HTML, binding, exact source/origin, and fallback cases')
