import type { Context } from '@deepseek-ai/cordis'
import type { CodeDispatchLog, JsonSchemaNode, ToolDefinition, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { McpRuntimeService, McpToolRecord } from '@openloop/dsh-mcp-runtime'
import { isRecord } from '@openloop/dsh-mcp-runtime'
import { codeDispatchPresentationBlock, mcpToolName, textFallback, toPresentation } from './contract.ts'

export * from './contract.ts'

export const name = 'openloop-dsh-mcp-tools'
export const inject = ['mcpRuntime', 'tools']

function outputSchema(): JsonSchemaNode {
  return {
    type: 'object' as const,
    additionalProperties: false,
    required: ['serverId', 'toolName', 'content', 'isError'],
    properties: {
      serverId: { type: 'string' },
      toolName: { type: 'string' },
      content: { type: 'array' },
      structuredContent: { type: 'object', additionalProperties: true },
      isError: { type: 'boolean' },
      _meta: { type: 'object', additionalProperties: true },
      uiResource: { type: 'object', additionalProperties: true },
    },
  }
}

function presentationResult(runtime: McpRuntimeService, tool: McpToolRecord, result: Parameters<McpRuntimeService['preparePresentation']>[1]) {
  return typeof runtime.preparePresentation === 'function' ? runtime.preparePresentation(tool, result) : result
}

function makeDefinition(runtime: McpRuntimeService, tool: McpToolRecord): ToolDefinition {
  const callName = mcpToolName(tool.serverId, tool.name)
  return {
    name: callName,
    description: tool.description ?? `Call the ${tool.name} MCP tool on ${tool.serverId}.`,
    parameters: tool.inputSchema,
    output: {
      schema: outputSchema(),
      render: (_args, value) => {
        const result = isRecord(value) ? value : {}
        const content = Array.isArray(result['content']) ? result['content'] : []
        return [{ type: 'text', text: textFallback(content) }]
      },
      presentationMeta: (_args, value) => {
        const result = isRecord(value) ? value : {}
        return toPresentation(tool, callName, presentationResult(runtime, tool, result as never)) as never
      },
    },
    async execute(args, exec) {
      const result = await runtime.callTool(tool.serverId, tool.name, isRecord(args) ? args : {}, { signal: exec.signal })
      return result
    },
    presentCall: () => ({ card: 'generic', title: `MCP · ${tool.name}`, kind: 'other' }),
    presentResult: (_args, result) => result.isError ? undefined : ({ card: 'generic', title: `MCP · ${tool.name}` }),
  }
}

interface PendingCodePresentation {
  readonly agent: NonNullable<ToolExecution['agent']>
  readonly callName: string
  readonly block: Extract<CodeDispatchLog['content'][number], { type: 'text' }>
}

class CodeDispatchPresentationBridge {
  private static readonly MAX_PENDING = 128
  private readonly pending = new Map<string, PendingCodePresentation>()

  constructor(private readonly runtime: McpRuntimeService) {}

  capture(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>, tool: McpToolRecord): void {
    const callId = String(exec.callId)
    this.pending.delete(callId)
    if (exec.parent === undefined || exec.agent === undefined || result.isError || !('value' in result)) return
    const value = result.value
    if (!isRecord(value)
      || value.serverId !== tool.serverId
      || value.toolName !== tool.name
      || value.isError !== false
      || !Array.isArray(value.content)
      || !isRecord(value.uiResource)) return

    const callName = mcpToolName(tool.serverId, tool.name)
    const presented = presentationResult(this.runtime, tool, value as never)
    const block = codeDispatchPresentationBlock(String(exec.callId), toPresentation(tool, callName, presented))
    if (!block) return
    while (this.pending.size >= CodeDispatchPresentationBridge.MAX_PENDING) {
      const oldest = this.pending.keys().next().value
      if (oldest === undefined) break
      this.pending.delete(oldest)
    }
    this.pending.set(callId, { agent: exec.agent, callName, block })
  }

  take(dispatch: Readonly<CodeDispatchLog>): Extract<CodeDispatchLog['content'][number], { type: 'text' }> | undefined {
    const callId = String(dispatch.subCallId)
    const pending = this.pending.get(callId)
    this.pending.delete(callId)
    if (!pending || pending.agent !== dispatch.agent || pending.callName !== dispatch.name) return undefined
    return pending.block
  }

  dropTool(callName: string): void {
    for (const [callId, pending] of this.pending) {
      if (pending.callName === callName) this.pending.delete(callId)
    }
  }

  clear(): void {
    this.pending.clear()
  }
}

export async function apply(ctx: Context): Promise<void> {
  const runtime = ctx.mcpRuntime
  const registered = new Map<string, { dispose: () => void; fingerprint: string; tool: McpToolRecord }>()
  const codePresentations = new CodeDispatchPresentationBridge(runtime)
  let disposed = false

  const fingerprint = (tool: McpToolRecord) => JSON.stringify(tool)
  const refreshServer = async (serverId: string): Promise<void> => {
    const tools = await runtime.listTools(serverId)
    const wanted = new Set<string>()
    for (const tool of tools) {
      if (tool.modelVisible === false) continue
      const callName = mcpToolName(tool.serverId, tool.name)
      wanted.add(callName)
      const nextFingerprint = fingerprint(tool)
      const current = registered.get(callName)
      if (current?.fingerprint === nextFingerprint) continue
      codePresentations.dropTool(callName)
      current?.dispose()
      registered.set(callName, { dispose: ctx.tools.register(makeDefinition(runtime, tool)), fingerprint: nextFingerprint, tool })
    }
    for (const [callName, current] of registered) {
      if (callName.startsWith(`${MCP_TOOL_PREFIX_FOR_SERVER(serverId)}__`) && !wanted.has(callName)) {
        codePresentations.dropTool(callName)
        current.dispose()
        registered.delete(callName)
      }
    }
  }

  const MCP_TOOL_PREFIX_FOR_SERVER = (serverId: string) => `mcp__${serverId}`
  const refreshAll = async (): Promise<void> => {
    if (disposed) return
    await Promise.all(runtime.serverIds().map((serverId) => refreshServer(serverId)))
  }

  const disposeResultObserver = ctx.on('tools/result', (exec, result) => {
    const tool = registered.get(exec.name)?.tool
    if (tool) codePresentations.capture(exec, result, tool)
  })
  const disposeCodeDispatchLog = ctx.on('tools/code-dispatch-log', async (dispatch, next) => {
    const block = codePresentations.take(dispatch)
    const content = await next()
    return block ? [...content, block] : content
  })
  const subscriptions = runtime.serverIds().map((serverId) => runtime.onToolsChanged(serverId, () => { void refreshServer(serverId) }))
  ctx.effect(() => () => {
    disposed = true
    disposeResultObserver()
    disposeCodeDispatchLog()
    codePresentations.clear()
    for (const dispose of subscriptions) dispose()
    for (const current of registered.values()) current.dispose()
    registered.clear()
  }, 'mcp-tools-registry')
  await refreshAll()
}

export default { name, inject, apply }
