import type { Context } from '@deepseek-ai/cordis'
import type { CodeDispatchLog, JsonSchemaNode, ToolDefinition, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type { McpRuntimeService, McpToolRecord } from '@openloop/dsh-mcp-runtime'
import { isRecord, McpRuntimeError } from '@openloop/dsh-mcp-runtime'
import { codeDispatchPresentationBlock, mcpToolName, textFallback, toPresentation } from './contract.ts'

export * from './contract.ts'

export const name = 'openloop-dsh-mcp-tools'
export const inject = ['mcpRuntime', 'tools']

/**
 * Server 不可用（连不上 / listTools 探测失败）。可用性对齐 runtime.start() 的既有语义
 * （2026-08-23）：连接失败停在 server 粒度——跳过该 server 的工具注册，不阻断其它
 * server，也不让 apply 失败。runtime 保持 error/disconnected 状态，onToolsChanged
 * 惰性重连后自愈。MCP server 是可选外设，不是宿主的硬依赖。
 */
function isServerUnavailable(error: unknown): boolean {
  if (error instanceof McpRuntimeError) return error.code === 'CONNECTION'
  // connection.listTools 阶段的原始网络/探测错误（SDK 超时、ECONNREFUSED 等）未被 runtime 包装。
  return true
}

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

function presentationResult(runtime: McpRuntimeService, tool: McpToolRecord, result: Parameters<McpRuntimeService['preparePresentation']>[1], args?: Parameters<McpRuntimeService['preparePresentation']>[2]) {
  return typeof runtime.preparePresentation === 'function' ? runtime.preparePresentation(tool, result, args) : result
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
      presentationMeta: (args, value) => {
        const result = isRecord(value) ? value : {}
        // args 透传：gateway 记录最近一次调用快照供预览/pin 补推（excalidraw 首帧靠 toolInput.elements）
        return toPresentation(tool, callName, presentationResult(runtime, tool, result as never, isRecord(args) ? args : undefined)) as never
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
    const presented = presentationResult(this.runtime, tool, value as never, isRecord(exec.arguments) ? exec.arguments : undefined)
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
    let tools: readonly McpToolRecord[]
    try {
      tools = await runtime.listTools(serverId)
    } catch (error) {
      if (isServerUnavailable(error)) return
      throw error
    }
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
    // 按 server 隔离：一个 server 的注册异常不阻断其它 server 的工具注册。
    // 连接类失败已在 refreshServer 内吞掉；剩下的 rejected 是插件自身 bug，仍让 apply 失败。
    const results = await Promise.allSettled(runtime.serverIds().map((serverId) => refreshServer(serverId)))
    for (const result of results) {
      if (result.status === 'rejected') throw result.reason
    }
  }

  /**
   * server 集合动态同步（方向1 connect 热激活，2026-08-28）：新 server 补订
   * onToolsChanged 并（热添加时）立即 best-effort 注册工具；被移除的 server
   * 退订并清掉其已注册工具。与启动容错同语义——连接失败停在 server 粒度。
   * 启动期 refreshNew=false 只建订阅，工具注册由随后的 refreshAll 统一负责。
   */
  const toolSubscriptions = new Map<string, () => void>()
  const dropServerTools = (serverId: string): void => {
    const prefix = `${MCP_TOOL_PREFIX_FOR_SERVER(serverId)}__`
    for (const [callName, current] of registered) {
      if (!callName.startsWith(prefix)) continue
      codePresentations.dropTool(callName)
      current.dispose()
      registered.delete(callName)
    }
  }
  const syncServerSubscriptions = (refreshNew: boolean): void => {
    if (disposed) return
    const live = new Set(runtime.serverIds())
    for (const serverId of live) {
      if (toolSubscriptions.has(serverId)) continue
      toolSubscriptions.set(serverId, runtime.onToolsChanged(serverId, () => {
        void refreshServer(serverId).catch((error) => {
          console.warn(`[openloop-dsh-mcp-tools] tool refresh failed for ${serverId}: ${error instanceof Error ? error.message : String(error)}`)
        })
      }))
      if (refreshNew) {
        void refreshServer(serverId).catch((error) => {
          console.warn(`[openloop-dsh-mcp-tools] initial tool refresh failed for ${serverId}: ${error instanceof Error ? error.message : String(error)}`)
        })
      }
    }
    for (const [serverId, dispose] of toolSubscriptions) {
      if (live.has(serverId)) continue
      dispose()
      toolSubscriptions.delete(serverId)
      dropServerTools(serverId)
    }
  }
  const disposeServersChanged = runtime.onServersChanged(() => { syncServerSubscriptions(true) })
  syncServerSubscriptions(false)

  const disposeResultObserver = ctx.on('tools/result', (exec, result) => {
    const tool = registered.get(exec.name)?.tool
    if (tool) codePresentations.capture(exec, result, tool)
  })
  const disposeCodeDispatchLog = ctx.on('tools/code-dispatch-log', async (dispatch, next) => {
    const block = codePresentations.take(dispatch)
    const content = await next()
    return block ? [...content, block] : content
  })
  ctx.effect(() => () => {
    disposed = true
    disposeResultObserver()
    disposeCodeDispatchLog()
    codePresentations.clear()
    disposeServersChanged()
    for (const dispose of toolSubscriptions.values()) dispose()
    toolSubscriptions.clear()
    for (const current of registered.values()) current.dispose()
    registered.clear()
  }, 'mcp-tools-registry')
  await refreshAll()
}

export default { name, inject, apply }
