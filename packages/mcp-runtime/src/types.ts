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

export interface McpAppResourceReference {
  readonly serverId: string
  readonly resourceUri: string
  readonly mimeType: string
  readonly resourceUrl: string
  readonly documentUrl: string
  readonly callToolUrl: string
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
