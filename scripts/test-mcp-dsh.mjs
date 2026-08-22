import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')

// Locate the DSH CLI: explicit override, then the npx cache (hash directory
// changes between npm versions and cache cleanups), then the global install.
// The npx cache layout keeps DSH's scoped deps flat next to the dsh package;
// other layouts resolve them below via createRequire.
function locateDshCli() {
  if (process.env.DSH_CLI_PATH) return process.env.DSH_CLI_PATH
  try {
    for (const entry of readdirSync('/Users/loloru/.npm/_npx')) {
      const candidate = join('/Users/loloru/.npm/_npx', entry, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
      if (existsSync(candidate)) return candidate
    }
  } catch { /* npx cache absent; fall through */ }
  return '/Users/loloru/.nvm/versions/node/v22.22.2/lib/node_modules/@deepseek-ai/dsh/lib/bin.js'
}

const dshCli = locateDshCli()
assert.ok(existsSync(dshCli), `DSH CLI is missing: ${dshCli}`)

const dshPackageDir = dirname(dirname(dshCli))
const dshLibDir = join(dshPackageDir, 'lib')
const dshRequire = createRequire(join(dshPackageDir, 'package.json'))

function dshModuleEntry(packageName, relativeFile) {
  try {
    return dshRequire.resolve(packageName)
  } catch {
    // Flat npx-cache layout: scoped deps sit next to the dsh package itself.
    return join(dirname(dshPackageDir), packageName.split('/')[1], relativeFile)
  }
}

const profileBootFile = readdirSync(dshLibDir).find((entry) => /^profile-boot-.*\.js$/.test(entry))
assert.ok(profileBootFile, `DSH profile boot module is missing under ${dshLibDir}`)

const profileBoot = await import(pathToFileURL(join(dshLibDir, profileBootFile)).href)
const runProfile = profileBoot.o ?? profileBoot.runProfile
assert.equal(typeof runProfile, 'function', `DSH profile boot module does not export runProfile: ${profileBootFile}`)
const { createLaunchEnvironmentSnapshot: snapshot } = await import(pathToFileURL(dshModuleEntry('@deepseek-ai/dsh-launch-environment', 'lib/index.js')).href)

const dshHome = resolve(root, '..', 'deepseek-harness-lab', '.dsh')
process.env.DSH_HOME ??= dshHome
process.env.DSH_TELEMETRY_DISABLED ??= '1'

const environment = snapshot([{
  source: 'process',
  values: Object.fromEntries(Object.entries(process.env).filter((entry) => typeof entry[1] === 'string')),
}])

let booted
try {
  booted = await runProfile({
    profile: 'web',
    patchFiles: [],
    environment,
    args: ['--port', '0'],
  })

  const ctx = booted.ctx
  const webServer = ctx.get('webServer')
  assert.ok(webServer, 'actual DSH web profile did not mount webServer')
  const gatewayProbe = await fetch(`http://${webServer.host}:${webServer.port}/api/openloop/mcp-app/unknown`)
  assert.equal(gatewayProbe.status, 404, 'MCP App gateway probe did not return 404')
  assert.deepEqual(await gatewayProbe.json(), { error: 'not_found' }, 'MCP App gateway route was not registered')
  const tools = ctx.get('tools')
  assert.ok(tools, 'actual DSH web profile did not mount dsh-tools')
  const wireName = 'mcp__fixture__mcp_app_tool'
  assert.ok(tools.get(wireName), `actual DSH tool catalog is missing ${wireName}`)

  const clientModules = ctx.get('clientModules')
  assert.ok(clientModules, 'actual DSH web profile did not mount clientModules')
  const graph = clientModules.graph()
  assert.equal(typeof graph.rev, 'string', 'composed DSH boot manifest has no revision')
  const metaEntry = graph.entries.find((entry) => entry.id === '@openloop/dsh-mcp')
  assert.ok(metaEntry, 'boot manifest is missing @openloop/dsh-mcp')
  assert.match(metaEntry.url, /^\/plugins\/@openloop\/dsh-mcp\/client\.js\?rev=/)
  assert.ok(clientModules.clientPath('@openloop/dsh-mcp'), 'meta client has no resolved bundle path')
  const ids = graph.entries.map((entry) => entry.id)
  assert.ok(ids.includes('@openloop/dsh-mcp'), `boot graph is missing @openloop/dsh-mcp: ${ids.join(', ')}`)
  assert.ok(!ids.includes('@openloop/dsh-mcp-apps'), `standalone Apps client shadowed the meta client: ${ids.join(', ')}`)

  const { createScope } = await import(pathToFileURL(dshModuleEntry('@deepseek-ai/dsh-scope', 'lib/index.js')).href)
  const { parseMcpAppCodeDispatchPresentation, MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX } = await import(pathToFileURL(join(dshHome, 'profiles', 'web', 'node_modules', '@openloop', 'dsh-mcp-apps', 'lib', 'index.js')).href)
  assert.ok(ctx.get('codeRuntime'), 'actual DSH web profile did not mount a Code Mode runtime')
  const sessions = ctx.get('sessions')
  assert.ok(sessions, 'actual DSH web profile did not mount a session store')
  const session = sessions.create(`revision3-mcp-code-${randomUUID()}`)
  session.append('turn/start', { turn: 1 })
  const agent = { session }
  const scope = createScope(ctx, agent)
  let disposeMode
  try {
    disposeMode = scope.ctx.get('tools').presentAs('code')
    const direct = await tools.execute({
      callId: 'revision3-direct', name: wireName, arguments: { label: 'direct' }, agent, signal: new AbortController().signal,
    })
    assert.equal(direct.isError, true, 'Code Mode direct MCP call was not rejected')
    const codeResult = await tools.execute({
      callId: 'revision3-root',
      name: 'run_code',
      arguments: { code: `return await tools[${JSON.stringify(wireName)}]({ label: 'code-mode' })`, description: 'Call the MCP App tool' },
      agent,
      signal: new AbortController().signal,
    })
    assert.equal(codeResult.isError, false, `Code Mode execution failed: ${JSON.stringify(codeResult)}`)
    assert.doesNotMatch(JSON.stringify(codeResult), new RegExp(MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    const dispatchEvent = session.events.findLast((event) => event.type === 'tool/code-dispatch')
    assert.ok(dispatchEvent, 'actual Code Mode execution did not append tool/code-dispatch')
    assert.equal(dispatchEvent.type, 'tool/code-dispatch')
    assert.equal(dispatchEvent.data.name, wireName)
    const parsed = parseMcpAppCodeDispatchPresentation(dispatchEvent.data.content, wireName, String(dispatchEvent.data.subCallId))
    assert.equal(parsed?.presentation.result.uiResource?.resourceUri, 'ui://fixture/mcp-app.html')
    const refreshed = await fetch(`http://${webServer.host}:${webServer.port}/api/openloop/mcp-app/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ serverId: 'fixture', toolName: 'mcp_app_tool', resourceUri: 'ui://fixture/mcp-app.html' }),
    })
    assert.equal(refreshed.status, 200, 'durable MCP App presentation could not refresh its expired authority')
    const refreshedReference = await refreshed.json()
    assert.match(refreshedReference.resourceUrl, /^\/api\/openloop\/mcp-app\/resource\/[a-f0-9]{64}$/)
    assert.match(refreshedReference.documentUrl, /^\/api\/openloop\/mcp-app\/document\/[a-f0-9]{64}$/)
    assert.match(refreshedReference.callToolUrl, /^\/api\/openloop\/mcp-app\/call\/[a-f0-9]{64}$/)
    const refreshedDocument = await fetch(`http://${webServer.host}:${webServer.port}${refreshedReference.documentUrl}`)
    assert.equal(refreshedDocument.status, 200)
    assert.match(refreshedDocument.headers.get('content-security-policy') ?? '', /default-src/)
    assert.match(await refreshedDocument.text(), /MCP App Fixture/)
    assert.equal(ctx.get('mcpRuntime').connectionCount('fixture'), 1)
  } finally {
    disposeMode?.()
    if (session.events.findLast((event) => event.type === 'turn/start')?.seq > (session.events.findLast((event) => event.type === 'turn/end')?.seq ?? -1)) {
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    }
    await scope.dispose()
  }

  console.log(JSON.stringify({
    cli: dshCli,
    tool: wireName,
    clientEntries: ids.filter((id) => id.includes('openloop/dsh-mcp')),
  }))
} finally {
  await booted?.ctx.fiber.dispose()
}
