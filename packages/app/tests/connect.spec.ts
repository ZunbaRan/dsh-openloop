/**
 * connect_server 单测（方向 1 v2，2026-08-29）：
 * fake mcpRuntime + FakePb + tmp dshHome——零真网络、零真 PocketBase。
 * 覆盖：落盘/热激活/引用条目落库、headless 降级、连接失败容忍（容错契约）、
 * 重复 connect 重连语义、非法 entry 的 Agent 向错误消息。
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { McpRuntimeService, McpServerConfig, McpToolRecord } from '@openloop/dsh-mcp-runtime'
import { connectServer, disconnectServer, reconnectServer } from '../src/connect.ts'
import { createAppFacade } from '../src/facade.ts'
import { initCollections } from '../src/schema.ts'
import type { AppBackend } from '../src/backend.ts'
import { FakePb } from './fake-pb.ts'

interface FakeRuntimeOptions {
  tools?: ReadonlyArray<Partial<McpToolRecord> & { name: string }>
  failListTools?: boolean
}

function fakeRuntime(options: FakeRuntimeOptions = {}) {
  const servers = new Map<string, McpServerConfig>()
  const events: string[] = []
  const runtime = {
    serverIds: () => [...servers.keys()],
    addServer: (config: McpServerConfig) => {
      servers.set(config.id, config)
      events.push(`add:${config.id}`)
    },
    removeServer: async (serverId: string) => {
      events.push(`remove:${serverId}`)
      return servers.delete(serverId)
    },
    listTools: async (serverId: string): Promise<readonly McpToolRecord[]> => {
      if (options.failListTools) throw new Error('MCP server connection failed')
      return (options.tools ?? []).map(tool => ({
        serverId,
        name: tool.name,
        modelVisible: tool.modelVisible ?? true,
        appVisible: tool.appVisible ?? false,
        ...(tool.description !== undefined ? { description: tool.description } : {}),
        inputSchema: tool.inputSchema ?? { type: 'object' },
        ...(tool.ui !== undefined ? { ui: tool.ui } : {}),
      }))
    },
    onToolsChanged: () => () => undefined,
    onServersChanged: () => () => undefined,
  }
  return { runtime: runtime as unknown as McpRuntimeService, events }
}

async function fakeBackend(pb: FakePb, dshHome: string): Promise<AppBackend> {
  await initCollections(pb as never)
  const facade = createAppFacade(pb as never)
  let registryRev = 0
  return {
    ready: async () => facade,
    dshHome: () => dshHome,
    invalidateRegistry: () => ++registryRev,
  } as unknown as AppBackend
}

const UI_TOOL = {
  name: 'tldraw_create_view',
  description: 'Create a collaborative canvas view',
  ui: { serverId: 'tldraw', toolName: 'tldraw_create_view', resourceUri: 'ui://openchamber/interop-tldraw-contract-v5.0.2' },
}
const PLAIN_TOOL = { name: 'tldraw_list_canvases', description: 'List canvases' }

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

function tmpDshHome(): string {
  const dir = mkdtempSync(join(tmpdir(), 'openloop-connect-'))
  dirs.push(dir)
  return dir
}

describe('connect_server (direction-1 v2)', () => {
  it('connects a third-party pack: mcp.json, hot-activation, app shell, and reference components', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const { runtime, events } = fakeRuntime({ tools: [UI_TOOL, PLAIN_TOOL] })
    const result = await connectServer({
      serverId: 'tldraw',
      entry: { type: 'http', url: 'http://127.0.0.1:39512/mcp' },
      dshHome,
      backend: await fakeBackend(pb, dshHome),
      mcpRuntime: runtime,
    })

    expect(result.ok).toBe(true)
    expect(result.activated).toBe(true)
    expect(result.state).toBe('connected')
    expect(result.toolCount).toBe(2)

    // mcp.json 落盘（原文 upsert）
    const saved = JSON.parse(readFileSync(join(dshHome, 'mcp.json'), 'utf8')) as { servers: Record<string, unknown> }
    expect(saved.servers['tldraw']).toEqual({ type: 'http', url: 'http://127.0.0.1:39512/mcp' })

    // 热激活（addServer 被调）
    expect(events).toEqual(['add:tldraw'])

    // app 壳 + 引用条目（rid 下划线转连字符；entry 不复制内容）
    const facade = createAppFacade(pb as never)
    const detail = await facade.getAppDetail('tldraw')
    expect(detail?.app.kind).toBe('thirdparty')
    expect(detail?.components).toHaveLength(1)
    expect(detail?.components[0]?.kind).toBe('mcp-app')
    expect(detail?.components[0]?.rid).toBe('tldraw:tldraw-create-view')
    expect(detail?.components[0]?.entry).toEqual({
      serverId: 'tldraw',
      toolName: 'tldraw_create_view',
      resourceUri: 'ui://openchamber/interop-tldraw-contract-v5.0.2',
    })
    // 摘要里的 resourceUri 供 Agent pin
    expect(result.components).toEqual([{ rid: 'tldraw:tldraw-create-view', title: 'Create a collaborative canvas view', resourceUri: 'ui://openchamber/interop-tldraw-contract-v5.0.2' }])
  })

  it('degrades to save-only on headless profiles (no MCP runtime)', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const result = await connectServer({
      serverId: 'excalidraw',
      entry: { type: 'http', url: 'https://mcp.excalidraw.com' },
      dshHome,
      backend: await fakeBackend(pb, dshHome),
      mcpRuntime: undefined,
    })

    expect(result.ok).toBe(true)
    expect(result.activated).toBe(false)
    expect(result.state).toBe('saved')
    expect(String(result.note)).toContain('restart DSH')
    expect(result.toolCount).toBe(0)
    // mcp.json 仍落盘（重启后由 runtime 读取）
    const saved = JSON.parse(readFileSync(join(dshHome, 'mcp.json'), 'utf8')) as { servers: Record<string, unknown> }
    expect(saved.servers['excalidraw']).toEqual({ type: 'http', url: 'https://mcp.excalidraw.com' })
  })

  it('tolerates an unreachable server: state disconnected, connect still succeeds (boot-tolerance contract)', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const { runtime } = fakeRuntime({ failListTools: true })
    const result = await connectServer({
      serverId: 'tldraw',
      entry: { type: 'http', url: 'http://127.0.0.1:39512/mcp' },
      dshHome,
      backend: await fakeBackend(pb, dshHome),
      mcpRuntime: runtime,
    })

    expect(result.ok).toBe(true)
    expect(result.state).toBe('disconnected')
    expect(String(result.note)).toContain('lazy reconnect')
    expect(result.toolCount).toBe(0)
  })

  it('re-connects an existing server: removeServer then addServer (upsert semantics)', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const { runtime, events } = fakeRuntime({ tools: [UI_TOOL] })
    // 预置同 id server（模拟旧配置在线；再次 connect = 重连语义：先摘旧再挂新）
    runtime.addServer({ id: 'tldraw', transport: { kind: 'streamable-http', url: 'http://old.example/mcp' } })

    const result = await connectServer({
      serverId: 'tldraw',
      entry: { type: 'http', url: 'http://127.0.0.1:39512/mcp' },
      dshHome,
      backend: await fakeBackend(pb, dshHome),
      mcpRuntime: runtime,
    })
    expect(result.state).toBe('connected')
    expect(events).toEqual(['add:tldraw', 'remove:tldraw', 'add:tldraw'])
  })

  it('rejects an invalid entry with an Agent-facing message (expected shape + actual)', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const { runtime } = fakeRuntime()
    await expect(connectServer({
      serverId: 'broken',
      entry: { type: 'http' },
      dshHome,
      backend: await fakeBackend(pb, dshHome),
      mcpRuntime: runtime,
    })).rejects.toThrow(/invalid MCP server entry.*"type": "http"/s)
  })

  it('disconnect removes the registry shell + hot-removes the server, keeps the mcp.json entry', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const { runtime, events } = fakeRuntime({ tools: [UI_TOOL] })
    const backend = await fakeBackend(pb, dshHome)
    await connectServer({ serverId: 'tldraw', entry: { type: 'http', url: 'http://127.0.0.1:39512/mcp' }, dshHome, backend, mcpRuntime: runtime })

    const result = await disconnectServer({ serverId: 'tldraw', dshHome, backend, mcpRuntime: runtime })

    expect(result.ok).toBe(true)
    expect(result.runtimeRemoved).toBe(true)
    expect(result.removedComponents).toBe(1)
    // 热移除事件 + registry 壳已删
    expect(events).toContain('remove:tldraw')
    const facade = createAppFacade(pb as never)
    expect(await facade.getAppDetail('tldraw')).toBeUndefined()
    // mcp.json 条目保留（重连用）
    const saved = JSON.parse(readFileSync(join(dshHome, 'mcp.json'), 'utf8')) as { servers: Record<string, unknown> }
    expect(saved.servers['tldraw']).toEqual({ type: 'http', url: 'http://127.0.0.1:39512/mcp' })
    // 未注册的 server 报 Agent 向错误
    await expect(disconnectServer({ serverId: 'ghost', dshHome, backend, mcpRuntime: runtime })).rejects.toThrow(/not registered/)
  })

  it('reconnect re-activates from the kept mcp.json entry', async () => {
    const dshHome = tmpDshHome()
    const pb = new FakePb()
    const { runtime } = fakeRuntime({ tools: [UI_TOOL] })
    const backend = await fakeBackend(pb, dshHome)
    await connectServer({ serverId: 'tldraw', entry: { type: 'http', url: 'http://127.0.0.1:39512/mcp' }, dshHome, backend, mcpRuntime: runtime })
    await disconnectServer({ serverId: 'tldraw', dshHome, backend, mcpRuntime: runtime })

    const result = await reconnectServer({ serverId: 'tldraw', dshHome, backend, mcpRuntime: runtime })
    expect(result.state).toBe('connected')
    expect(result.uiResourceCount).toBe(1)
    // 条目缺失时报 Agent 向错误
    await expect(reconnectServer({ serverId: 'never-was', dshHome, backend, mcpRuntime: runtime })).rejects.toThrow(/no mcp.json entry/)
  })
})
