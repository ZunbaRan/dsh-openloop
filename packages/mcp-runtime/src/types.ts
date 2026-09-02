import type {
  CallToolResult as SdkCallToolResult,
  ReadResourceResult as SdkReadResourceResult,
  Tool as SdkTool,
} from '@modelcontextprotocol/client'

export type JsonObject = Record<string, unknown>

export type McpTransportConfig =
  | {
      kind: 'stdio'
      command: string
      args?: readonly string[]
      env?: Readonly<Record<string, string>>
      cwd?: string
    }
  | {
      kind: 'streamable-http'
      url: string
      headers?: Readonly<Record<string, string>>
    }

export interface McpServerConfig {
  readonly id: string
  /**
   * MCP protocol negotiation policy. `auto` probes for MCP 2026 and falls
   * back to the legacy initialize handshake when the server is older.
   */
  readonly protocol?: 'legacy' | 'auto' | '2026-07-28'
  readonly transport: McpTransportConfig
}

export interface McpRuntimeConfig {
  readonly servers: readonly McpServerConfig[]
  readonly clientName?: string
  readonly clientVersion?: string
  readonly maxResourceBytes?: number
  readonly requestTimeoutMs?: number
}

export interface McpUiBinding {
  readonly serverId: string
  readonly toolName: string
  readonly resourceUri: string
  readonly visibility?: 'inline' | 'fullscreen'
  readonly _meta?: JsonObject
}

export interface McpToolRecord {
  readonly serverId: string
  readonly name: string
  /** False for MCP App-only tools (`_meta.ui.visibility: ["app"]`). */
  readonly modelVisible: boolean
  /** True when the embedded App is allowed to call this tool. */
  readonly appVisible: boolean
  readonly description?: string
  readonly inputSchema: JsonObject
  readonly outputSchema?: JsonObject
  readonly _meta?: JsonObject
  readonly ui?: McpUiBinding
}

export interface McpAppResource {
  readonly serverId: string
  readonly resourceUri: string
  readonly mimeType: string
  readonly html: string
  readonly _meta?: JsonObject
}

/**
 * 最近一次真实工具调用的结果快照（预览/pin 场景自举渲染用）。
 * 经 refresh 响应下发给无工具调用上下文的宿主视图，宿主在 initialize 握手后
 * 补推 sendToolResult；App 从 structuredContent 取 checkpointId 等句柄
 * 经 callToolUrl 回环自取场景（excalidraw 模式，2026-09-03）。
 */
export interface McpAppInvocationSnapshot {
  /** 工具调用入参（excalidraw 类 App 的首帧渲染靠 toolInput.elements） */
  readonly arguments?: JsonObject
  readonly content: readonly unknown[]
  readonly isError: boolean
  readonly structuredContent?: JsonObject
  readonly _meta?: JsonObject
}

export interface McpAppResourceReference {
  readonly serverId: string
  readonly resourceUri: string
  readonly mimeType: string
  readonly resourceUrl: string
  readonly documentUrl: string
  readonly callToolUrl: string
  /** 最近一次真实调用的结果快照（仅 refresh 响应携带；工具结果引用不含） */
  readonly invocation?: McpAppInvocationSnapshot
  readonly _meta?: JsonObject
}

export interface McpCallResult {
  readonly serverId: string
  readonly toolName: string
  readonly content: readonly unknown[]
  readonly structuredContent?: JsonObject
  readonly isError: boolean
  readonly _meta?: JsonObject
  readonly uiResource?: McpAppResource | McpAppResourceReference
}

export interface McpConnection {
  listTools(signal?: AbortSignal): Promise<{ readonly tools: readonly SdkTool[] }>
  callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<SdkCallToolResult>
  readResource(uri: string, signal?: AbortSignal): Promise<SdkReadResourceResult>
  close(): Promise<void>
}

export interface McpConnectionFactoryOptions {
  readonly clientName: string
  readonly clientVersion: string
  readonly requestTimeoutMs: number
  readonly onToolsChanged: () => void
}

export interface McpConnectionFactory {
  connect(config: McpServerConfig, options: McpConnectionFactoryOptions): Promise<McpConnection>
}

export interface McpRuntimeStatus {
  readonly serverId: string
  readonly state: 'disconnected' | 'connecting' | 'connected' | 'error' | 'closed'
  readonly connectionCount: number
  readonly error?: string
}

export interface McpResourceValidationOptions {
  readonly maxBytes?: number
}
