import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { McpRuntimeError } from '@openloop/dsh-mcp-runtime'
import { describe, expect, it } from 'vitest'
import toolsPlugin from '../src/index.ts'

// 可用性契约（2026-08-27）：MCP server 是可选外设。启动注册 best-effort，
// 连接失败停在 server 粒度，绝不升级成 apply 失败 / 插件树卸载 / 退进程。

interface FixtureTool {
  readonly serverId: string
  readonly name: string
  readonly modelVisible: boolean
  readonly appVisible: boolean
  readonly inputSchema: Record<string, unknown>
}

function toolOf(serverId: string, name: string): FixtureTool {
  return { serverId, name, modelVisible: true, appVisible: false, inputSchema: { type: 'object', additionalProperties: false } }
}

async function startToolsPlugin(runtime: unknown): Promise<Context> {
  const ctx = new Context()
  ctx.plugin({ name: 'system-prompt-test', apply(ctx) { ctx.provide('systemPrompt', { tools() {}, section() {} }) } })
  ctx.plugin({ name: 'mcp-runtime-test', apply(ctx) { ctx.provide('mcpRuntime', runtime) } })
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(toolsPlugin)
  return ctx
}

/** 带热添加/热移除的可变 fake runtime（server 集合动态变化，onServersChanged 通知）。 */
function mutableRuntime() {
  const servers = new Map<string, { listTools: () => Promise<unknown[]> }>()
  const serverListeners = new Set<() => void>()
  return {
    serverIds: () => [...servers.keys()],
    listTools: async (serverId: string) => servers.get(serverId)?.listTools() ?? [],
    callTool: async (serverId: string) => ({ serverId, toolName: 'draw', content: [{ type: 'text', text: 'ok' }], isError: false }),
    onToolsChanged: () => () => undefined,
    onServersChanged(listener: () => void) {
      serverListeners.add(listener)
      return () => serverListeners.delete(listener)
    },
    add(id: string, listTools: () => Promise<unknown[]>) {
      servers.set(id, { listTools })
      for (const listener of serverListeners) listener()
    },
    remove(id: string) {
      servers.delete(id)
      for (const listener of serverListeners) listener()
    },
  }
}

const agent = { session: { append() {} } }

async function call(ctx: Context, name: string) {
  return ctx.tools.execute({
    callId: `call-${name}` as never,
    name,
    arguments: {},
    agent: agent as never,
    signal: new AbortController().signal,
  })
}

describe('MCP tools startup tolerance', () => {
  it('apply() succeeds and registers tools only from reachable servers', async () => {
    const excalidrawTool = toolOf('excalidraw', 'draw')
    let calls = 0
    const runtime = {
      serverIds: () => ['tldraw', 'excalidraw'],
      listTools: async (serverId: string) => {
        if (serverId === 'tldraw') throw new McpRuntimeError('CONNECTION', 'MCP server tldraw connection failed')
        return [excalidrawTool]
      },
      callTool: async () => {
        calls += 1
        return { serverId: 'excalidraw', toolName: 'draw', content: [{ type: 'text', text: 'ok' }], isError: false }
      },
      onToolsChanged: () => () => undefined,
      onServersChanged: () => () => undefined,
    }

    const ctx = await startToolsPlugin(runtime)

    const ok = await call(ctx, 'mcp__excalidraw__draw')
    expect(ok.isError).toBe(false)
    expect(calls).toBe(1)

    const missing = await call(ctx, 'mcp__tldraw__draw')
    expect(missing.isError).toBe(true)
    expect(calls).toBe(1)

    await ctx.fiber.dispose()
  })

  it('apply() succeeds with an empty tool table when every server is unreachable', async () => {
    let calls = 0
    const runtime = {
      serverIds: () => ['tldraw', 'excalidraw'],
      listTools: async (serverId: string) => {
        // 两种形态都要吞：runtime 包装的 CONNECTION + connection.listTools 泄出的原始网络错误
        if (serverId === 'tldraw') throw new McpRuntimeError('CONNECTION', 'MCP server tldraw connection failed')
        throw new Error('fetch failed')
      },
      callTool: async () => {
        calls += 1
        return { serverId: 'excalidraw', toolName: 'draw', content: [], isError: false }
      },
      onToolsChanged: () => () => undefined,
      onServersChanged: () => () => undefined,
    }

    const ctx = await startToolsPlugin(runtime)

    const missing = await call(ctx, 'mcp__tldraw__draw')
    expect(missing.isError).toBe(true)
    const missingToo = await call(ctx, 'mcp__excalidraw__draw')
    expect(missingToo.isError).toBe(true)
    expect(calls).toBe(0)

    await ctx.fiber.dispose()
  })

  it('recovers tools via onToolsChanged after the server comes online', async () => {
    const tool = toolOf('tldraw', 'draw')
    let online = false
    let notify: (() => void) | undefined
    const runtime = {
      serverIds: () => ['tldraw'],
      listTools: async () => {
        if (!online) throw new McpRuntimeError('CONNECTION', 'MCP server tldraw connection failed')
        return [tool]
      },
      callTool: async () => ({ serverId: 'tldraw', toolName: 'draw', content: [{ type: 'text', text: 'ok' }], isError: false }),
      onToolsChanged: (_serverId: string, listener: () => void) => {
        notify = listener
        return () => undefined
      },
      onServersChanged: () => () => undefined,
    }

    const ctx = await startToolsPlugin(runtime)

    const before = await call(ctx, 'mcp__tldraw__draw')
    expect(before.isError).toBe(true)

    online = true
    notify?.()
    await new Promise((resolve) => setTimeout(resolve, 20))

    const after = await call(ctx, 'mcp__tldraw__draw')
    expect(after.isError).toBe(false)

    await ctx.fiber.dispose()
  })

  it('still lets non-connection plugin errors fail apply()', async () => {
    const runtime = {
      serverIds: () => ['tldraw'],
      listTools: async () => { throw new McpRuntimeError('UNKNOWN_SERVER', 'Unknown MCP server: tldraw') },
      callTool: async () => ({ serverId: 'tldraw', toolName: 'draw', content: [], isError: false }),
      onToolsChanged: () => () => undefined,
      onServersChanged: () => () => undefined,
    }

    const ctx = new Context()
    ctx.plugin({ name: 'system-prompt-test', apply(ctx) { ctx.provide('systemPrompt', { tools() {}, section() {} }) } })
    ctx.plugin({ name: 'mcp-runtime-test', apply(ctx) { ctx.provide('mcpRuntime', runtime) } })
    await ctx.plugin(ToolRuntime)
    await expect(ctx.plugin(toolsPlugin)).rejects.toThrow('Unknown MCP server: tldraw')

    await ctx.fiber.dispose()
  })

  it('registers tools for a hot-added server and clears them on hot-remove (no restart)', async () => {
    const runtime = mutableRuntime()
    const ctx = await startToolsPlugin(runtime)

    // 启动时无 server：工具表空，apply 成功
    const none = await call(ctx, 'mcp__late__draw')
    expect(none.isError).toBe(true)

    // 热添加：onServersChanged → 立即注册该 server 的工具
    runtime.add('late', async () => [toolOf('late', 'draw')])
    await new Promise((resolve) => setTimeout(resolve, 20))
    const ok = await call(ctx, 'mcp__late__draw')
    expect(ok.isError).toBe(false)

    // 热移除：工具随之清掉
    runtime.remove('late')
    await new Promise((resolve) => setTimeout(resolve, 20))
    const gone = await call(ctx, 'mcp__late__draw')
    expect(gone.isError).toBe(true)

    await ctx.fiber.dispose()
  })
})
