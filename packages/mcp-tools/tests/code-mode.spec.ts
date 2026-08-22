import { Context } from '@deepseek-ai/cordis'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import { describe, expect, it } from 'vitest'
import {
  MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX,
  parseMcpAppCodeDispatchPresentation,
} from '../../mcp-apps/src/security.ts'
import { MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES } from '../src/contract.ts'
import toolsPlugin from '../src/index.ts'

describe('MCP Code Mode presentation bridge', () => {
  it('bridges a nested MCP result into the durable dispatch log only', async () => {
    const wireName = 'mcp__fixture__mcp_app_tool'
    const resourceUri = 'ui://fixture/mcp-app.html'
    const binding = { serverId: 'fixture', toolName: 'mcp_app_tool', resourceUri }
    const callResult = {
      serverId: 'fixture',
      toolName: 'mcp_app_tool',
      content: [{ type: 'text', text: 'MCP fixture fallback: nested' }],
      structuredContent: { message: 'nested', rendered: true },
      isError: false,
      _meta: { fixtureResult: true },
      uiResource: {
        serverId: 'fixture', resourceUri, mimeType: 'text/html;profile=mcp-app', html: '<div>nested</div>',
      },
    }
    const tool = {
      serverId: 'fixture',
      name: 'mcp_app_tool',
      inputSchema: { type: 'object', additionalProperties: false },
      _meta: { ui: { resourceUri }, fixtureTool: true },
      ui: binding,
    }
    let calls = 0
    const runtime = {
      serverIds: () => ['fixture'],
      listTools: async () => [tool],
      callTool: async () => { calls += 1; return callResult },
      onToolsChanged: () => () => undefined,
    }
    const events: Array<{ name: string; data: Record<string, unknown> }> = []
    const agent = { session: { append(name: string, data: Record<string, unknown>) { events.push({ name, data }) } } }

    const ctx = new Context()
    ctx.plugin({ name: 'system-prompt-test', apply(ctx) { ctx.provide('systemPrompt', { tools() {}, section() {} }) } })
    ctx.plugin({ name: 'mcp-runtime-test', apply(ctx) { ctx.provide('mcpRuntime', runtime) } })
    ctx.plugin({
      name: 'code-runtime-test',
      apply(ctx) {
        ctx.provide('codeRuntime', {
          language: 'typescript',
          async run(request: { program: string; bindings: readonly { global: string; functions: Record<string, (args: unknown) => Promise<unknown>> }[] }) {
            expect(request.program).toContain(wireName)
            const functions = request.bindings.find(({ global }) => global === 'tools')?.functions
            if (!functions) throw new Error('test code runtime did not receive the tools binding')
            const value = await functions[wireName]!({ message: 'nested' })
            return { logs: [], value }
          },
        })
      },
    })
    await ctx.plugin(ToolRuntime, { mode: 'code' })
    await ctx.plugin(toolsPlugin)

    const direct = await ctx.tools.execute({
      callId: 'direct' as never,
      name: wireName,
      arguments: { message: 'direct' },
      agent: agent as never,
      signal: new AbortController().signal,
    })
    expect(direct.isError).toBe(true)
    expect(calls).toBe(0)

    const result = await ctx.tools.execute({
      callId: 'root' as never,
      name: 'run_code',
      arguments: { code: `return await tools[${JSON.stringify(wireName)}]({ message: 'nested' })`, description: 'Call the MCP App tool' },
      agent: agent as never,
      signal: new AbortController().signal,
    })
    expect(result.isError).toBe(false)
    expect(result.value).toEqual({ logs: [], result: callResult })
    expect(JSON.stringify(result)).not.toContain(MCP_APP_CODE_DISPATCH_PRESENTATION_PREFIX)

    const dispatch = events.find(({ name }) => name === 'tool/code-dispatch')
    expect(dispatch?.data.name).toBe(wireName)
    const content = dispatch?.data.content as readonly unknown[]
    const parsed = parseMcpAppCodeDispatchPresentation(content, wireName, 'root:code:1')
    expect(parsed?.presentation.result.uiResource?.resourceUri).toBe(resourceUri)
    expect(content[0]).toEqual({ type: 'text', text: 'MCP fixture fallback: nested' })
    expect(content.at(-1)).toMatchObject({ type: 'text' })
    expect(calls).toBe(1)

    await ctx.fiber.dispose()
  })

  it('clears a reused call ID before error or oversized-result validation', async () => {
    const wireName = 'mcp__fixture__mcp_app_tool'
    const resourceUri = 'ui://fixture/mcp-app.html'
    const binding = { serverId: 'fixture', toolName: 'mcp_app_tool', resourceUri }
    const tool = {
      serverId: 'fixture',
      name: 'mcp_app_tool',
      inputSchema: { type: 'object', additionalProperties: false },
      _meta: { ui: { resourceUri }, fixtureTool: true },
      ui: binding,
    }
    const callResult = {
      serverId: 'fixture',
      toolName: 'mcp_app_tool',
      content: [{ type: 'text', text: 'fallback' }],
      isError: false,
      uiResource: { serverId: 'fixture', resourceUri, mimeType: 'text/html;profile=mcp-app', html: '<div>ok</div>' },
    }
    const runtime = {
      serverIds: () => ['fixture'],
      listTools: async () => [tool],
      callTool: async () => callResult,
      onToolsChanged: () => () => undefined,
    }
    const agent = { session: { append() {} } }
    const ctx = new Context()
    ctx.plugin({ name: 'system-prompt-test', apply(ctx) { ctx.provide('systemPrompt', { tools() {}, section() {} }) } })
    ctx.plugin({ name: 'mcp-runtime-test', apply(ctx) { ctx.provide('mcpRuntime', runtime) } })
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(toolsPlugin)

    const makeExec = (callId: string) => ({
      callId: callId as never,
      rootCallId: callId as never,
      name: wireName,
      arguments: {},
      agent: agent as never,
      parent: Symbol('code-parent') as never,
      token: Symbol('code-token') as never,
      signal: new AbortController().signal,
    })
    const makeDispatch = (callId: string) => ({
      exec: makeExec(`root-${callId}`),
      agent: agent as never,
      subCallId: callId as never,
      name: wireName,
      isError: false,
      content: [{ type: 'text', text: 'fallback' }],
    })
    const shape = (callId: string) => ctx.waterfall('tools/code-dispatch-log', makeDispatch(callId) as never, () => Promise.resolve([{ type: 'text', text: 'fallback' }]))
    const emitResult = (callId: string, result: unknown) => ctx.emit('tools/result', makeExec(callId) as never, result as never)

    const storedCallId = 'stored-success'
    emitResult(storedCallId, { isError: false, value: callResult, content: callResult.content })
    expect(parseMcpAppCodeDispatchPresentation(await shape(storedCallId), wireName, storedCallId)).toBeTruthy()

    const errorCallId = 'reused-error'
    emitResult(errorCallId, { isError: false, value: callResult, content: callResult.content })
    emitResult(errorCallId, { isError: true, error: { message: 'failed' }, content: [{ type: 'text', text: 'failed' }] })
    const errorLog = await shape(errorCallId)
    expect(parseMcpAppCodeDispatchPresentation(errorLog, wireName, errorCallId)).toBeUndefined()

    const oversizedCallId = 'reused-oversized'
    emitResult(oversizedCallId, { isError: false, value: callResult, content: callResult.content })
    emitResult(oversizedCallId, {
      isError: false,
      value: { ...callResult, uiResource: { ...callResult.uiResource, html: 'x'.repeat(MCP_CODE_DISPATCH_PRESENTATION_MAX_BYTES) } },
      content: callResult.content,
    })
    const oversizedLog = await shape(oversizedCallId)
    expect(parseMcpAppCodeDispatchPresentation(oversizedLog, wireName, oversizedCallId)).toBeUndefined()

    await ctx.fiber.dispose()
  })
})
