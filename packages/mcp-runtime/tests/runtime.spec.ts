import { describe, expect, it } from 'vitest'
import {
  McpAppGateway,
  McpRuntime,
  type McpConnection,
  type McpConnectionFactory,
  type McpUiBinding,
} from '../src/index.ts'

type ResourceResponse = Awaited<ReturnType<McpConnection['readResource']>>

const binding: McpUiBinding = {
  serverId: 'fixture',
  toolName: 'mcp_app_tool',
  resourceUri: 'ui://fixture/app.html',
}

function fakeFactory(overrides: Partial<{
  read: (uri: string) => Promise<ResourceResponse>
  toolMeta: Record<string, unknown>
}> = {}) {
  let connections = 0
  const factory: McpConnectionFactory = {
    async connect(_config, options): Promise<McpConnection> {
      connections += 1
      return {
        async listTools() {
          return {
            tools: [{
              name: 'mcp_app_tool',
              description: 'fixture',
              inputSchema: { type: 'object', properties: {} },
              _meta: overrides.toolMeta ?? { ui: { resourceUri: binding.resourceUri }, original: true },
            }],
          }
        },
        async callTool() {
          return {
            content: [{ type: 'text', text: 'fallback' }],
            structuredContent: { ok: true },
            _meta: { preserved: true },
          }
        },
        async readResource(uri) {
          return await (overrides.read?.(uri) ?? Promise.resolve({
            contents: [{
              uri,
              mimeType: 'text/html;profile=mcp-app',
              text: '<div>fixture</div>',
              _meta: { resource: true },
            }],
          })) as ResourceResponse
        },
        async close() {},
      }
    },
  }
  return { factory, connectionCount: () => connections }
}

describe('McpRuntime', () => {
  it('shares one connection and preserves tool/call/resource metadata', async () => {
    const fake = fakeFactory()
    const runtime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: fake.factory,
    })
    const tools = await runtime.listTools('fixture')
    const result = await runtime.callTool('fixture', 'mcp_app_tool', {}, { binding })
    const resource = await runtime.readAppResource('fixture', binding.resourceUri, binding)

    expect(fake.connectionCount()).toBe(1)
    expect(tools[0]?._meta).toEqual({ ui: { resourceUri: binding.resourceUri }, original: true })
    expect(result._meta).toEqual({ preserved: true })
    expect(result.structuredContent).toEqual({ ok: true })
    expect(result.uiResource?._meta).toEqual({ resource: true })
    expect(resource.html).toBe('<div>fixture</div>')
    await runtime.close()
  })

  it('keeps the ordinary fallback when App hydration is invalid', async () => {
    const fake = fakeFactory({
      read: async (uri) => ({ contents: [{ uri, mimeType: 'text/plain', text: 'no app' }] }),
    })
    const runtime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: fake.factory,
    })
    const result = await runtime.callTool('fixture', 'mcp_app_tool', {}, { binding })
    expect(result.content).toEqual([{ type: 'text', text: 'fallback' }])
    expect(result.uiResource).toBeUndefined()
    await expect(runtime.readAppResource('fixture', binding.resourceUri, binding)).rejects.toMatchObject({ code: 'RESOURCE_MIME' })
    await runtime.close()
  })

  it('keeps ordinary tools when their UI metadata is malformed', async () => {
    const fake = fakeFactory({ toolMeta: { ui: { resourceUri: 'https://evil.test/app.html' }, original: true } })
    const runtime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: fake.factory,
    })
    const tools = await runtime.listTools('fixture')
    expect(tools[0]?.ui).toBeUndefined()
    expect(tools[0]?._meta).toEqual({ ui: { resourceUri: 'https://evil.test/app.html' }, original: true })
    const result = await runtime.callTool('fixture', 'mcp_app_tool', {})
    expect(result.content).toEqual([{ type: 'text', text: 'fallback' }])
    await runtime.close()
  })

  it('preserves modern model/app visibility and marks App-only tools as hidden from the model', async () => {
    const modelAndApp = fakeFactory({ toolMeta: { ui: { resourceUri: binding.resourceUri, visibility: ['model', 'app'] } } })
    const visibleRuntime = new McpRuntime({
      servers: [{ id: 'fixture', protocol: '2026-07-28', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: modelAndApp.factory,
    })
    const visible = await visibleRuntime.listTools('fixture')
    expect(visible[0]).toMatchObject({ modelVisible: true, appVisible: true, ui: { resourceUri: binding.resourceUri } })
    await visibleRuntime.close()

    const appOnly = fakeFactory({ toolMeta: { ui: { resourceUri: binding.resourceUri, visibility: ['app'] } } })
    const hiddenRuntime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: appOnly.factory,
    })
    const hidden = await hiddenRuntime.listTools('fixture')
    expect(hidden[0]).toMatchObject({ modelVisible: false, appVisible: true, ui: { resourceUri: binding.resourceUri } })
    await hiddenRuntime.close()
  })

  it('coalesces concurrent starts and closes a connection that resolves during teardown', async () => {
    let connections = 0
    let closed = 0
    let release: ((connection: McpConnection) => void) | undefined
    const connecting = new Promise<McpConnection>((resolve) => { release = resolve })
    const connection: McpConnection = {
      async listTools() { return { tools: [] } },
      async callTool() { return { content: [], isError: false } },
      async readResource() { return { contents: [] } },
      async close() { closed += 1 },
    }
    const runtime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: {
        async connect() {
          connections += 1
          return await connecting
        },
      },
    })

    const first = runtime.start()
    const second = runtime.start()
    expect(connections).toBe(1)
    const closing = runtime.close()
    release?.(connection)
    // 新契约（2026-08-23 容错修复）：start 不再向调用方传播连接失败/打断——
    // 外部 MCP server 不可达不得阻断插件树（tldraw 事故）；close 竞态下 start
    // 安静 resolve，由 close 负责生命周期收尾。
    await first
    await second
    await closing
    expect(closed).toBe(1)
    expect(runtime.status('fixture').state).toBe('closed')
  })

  it('hot-adds a server (lazy connect) and notifies onServersChanged subscribers', async () => {
    const fake = fakeFactory()
    const runtime = new McpRuntime({ servers: [], connectionFactory: fake.factory })
    expect(runtime.serverIds()).toEqual([])

    const events: string[] = []
    const unsubscribe = runtime.onServersChanged(() => events.push([...runtime.serverIds()].join(',')))

    runtime.addServer({ id: 'late', transport: { kind: 'stdio', command: 'unused' } })
    expect(events).toEqual(['late'])
    expect(runtime.status('late').state).toBe('disconnected')

    // 惰性连接：首次使用才建连（与启动容错同一语义）
    const tools = await runtime.listTools('late')
    expect(tools[0]?.name).toBe('mcp_app_tool')
    expect(fake.connectionCount()).toBe(1)

    expect(() => runtime.addServer({ id: 'late', transport: { kind: 'stdio', command: 'unused' } })).toThrow(/unique/)
    unsubscribe()
    runtime.addServer({ id: 'other', transport: { kind: 'stdio', command: 'unused' } })
    expect(events).toEqual(['late'])

    await runtime.close()
  })

  it('hot-removes a server: closes the connection, drops it, and notifies subscribers', async () => {
    const fake = fakeFactory()
    const runtime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: fake.factory,
    })
    await runtime.listTools('fixture')
    expect(fake.connectionCount()).toBe(1)

    const events: string[] = []
    runtime.onServersChanged(() => events.push([...runtime.serverIds()].join(',')))

    expect(await runtime.removeServer('fixture')).toBe(true)
    expect(events).toEqual([''])
    expect(runtime.serverIds()).toEqual([])
    await expect(runtime.listTools('fixture')).rejects.toMatchObject({ code: 'UNKNOWN_SERVER' })
    expect(await runtime.removeServer('fixture')).toBe(false)
    await runtime.close()
  })

  it('gateway records the last real invocation per binding; synthetic refresh calls never overwrite it', async () => {
    const fake = fakeFactory()
    const runtime = new McpRuntime({
      servers: [{ id: 'fixture', transport: { kind: 'stdio', command: 'unused' } }],
      connectionFactory: fake.factory,
    })
    // webServer 仅 register() 时使用；reference/lastInvocation 路径不触网
    const gateway = new McpAppGateway(runtime, undefined as never)
    const tool = (await runtime.listTools('fixture'))[0]!

    // 从未调用过：无快照
    expect(gateway.lastInvocation('fixture', binding.resourceUri)).toBeUndefined()

    // 真实调用（对话流投影路径 = preparePresentation → reference）
    const result = await runtime.callTool('fixture', 'mcp_app_tool', {}, { binding })
    const referenced = gateway.reference(tool, result)
    expect(referenced.uiResource).toMatchObject({ serverId: 'fixture', resourceUri: binding.resourceUri })
    expect(gateway.lastInvocation('fixture', binding.resourceUri)).toEqual({
      content: [{ type: 'text', text: 'fallback' }],
      isError: false,
      structuredContent: { ok: true },
      _meta: { preserved: true },
    })

    // refresh 合成调用（content:[]）不得覆盖快照
    gateway.reference(tool, {
      serverId: 'fixture',
      toolName: 'mcp_app_tool',
      content: [],
      isError: false,
      uiResource: result.uiResource!,
    }, { record: false })
    expect(gateway.lastInvocation('fixture', binding.resourceUri)?.structuredContent).toEqual({ ok: true })

    // 其他 binding 不受影响
    expect(gateway.lastInvocation('fixture', 'ui://fixture/other.html')).toBeUndefined()
    await runtime.close()
  })
})
