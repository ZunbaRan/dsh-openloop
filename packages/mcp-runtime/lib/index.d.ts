import { Context, Service } from "@deepseek-ai/cordis";
import { CallToolResult, ReadResourceResult, Tool } from "@modelcontextprotocol/client";
import { WebServer } from "@deepseek-ai/dsh-host-webserver";
//#region src/types.d.ts
type JsonObject = Record<string, unknown>;
type McpTransportConfig = {
  kind: 'stdio';
  command: string;
  args?: readonly string[];
  env?: Readonly<Record<string, string>>;
  cwd?: string;
} | {
  kind: 'streamable-http';
  url: string;
  headers?: Readonly<Record<string, string>>;
};
interface McpServerConfig {
  readonly id: string;
  /**
   * MCP protocol negotiation policy. `auto` probes for MCP 2026 and falls
   * back to the legacy initialize handshake when the server is older.
   */
  readonly protocol?: 'legacy' | 'auto' | '2026-07-28';
  readonly transport: McpTransportConfig;
}
interface McpRuntimeConfig {
  readonly servers: readonly McpServerConfig[];
  readonly clientName?: string;
  readonly clientVersion?: string;
  readonly maxResourceBytes?: number;
  readonly requestTimeoutMs?: number;
}
interface McpUiBinding {
  readonly serverId: string;
  readonly toolName: string;
  readonly resourceUri: string;
  readonly visibility?: 'inline' | 'fullscreen';
  readonly _meta?: JsonObject;
}
interface McpToolRecord {
  readonly serverId: string;
  readonly name: string;
  /** False for MCP App-only tools (`_meta.ui.visibility: ["app"]`). */
  readonly modelVisible: boolean;
  /** True when the embedded App is allowed to call this tool. */
  readonly appVisible: boolean;
  readonly description?: string;
  readonly inputSchema: JsonObject;
  readonly outputSchema?: JsonObject;
  readonly _meta?: JsonObject;
  readonly ui?: McpUiBinding;
}
interface McpAppResource {
  readonly serverId: string;
  readonly resourceUri: string;
  readonly mimeType: string;
  readonly html: string;
  readonly _meta?: JsonObject;
}
interface McpAppResourceReference {
  readonly serverId: string;
  readonly resourceUri: string;
  readonly mimeType: string;
  readonly resourceUrl: string;
  readonly documentUrl: string;
  readonly callToolUrl: string;
  readonly _meta?: JsonObject;
}
interface McpCallResult {
  readonly serverId: string;
  readonly toolName: string;
  readonly content: readonly unknown[];
  readonly structuredContent?: JsonObject;
  readonly isError: boolean;
  readonly _meta?: JsonObject;
  readonly uiResource?: McpAppResource | McpAppResourceReference;
}
interface McpConnection {
  listTools(signal?: AbortSignal): Promise<{
    readonly tools: readonly Tool[];
  }>;
  callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<CallToolResult>;
  readResource(uri: string, signal?: AbortSignal): Promise<ReadResourceResult>;
  close(): Promise<void>;
}
interface McpConnectionFactoryOptions {
  readonly clientName: string;
  readonly clientVersion: string;
  readonly requestTimeoutMs: number;
  readonly onToolsChanged: () => void;
}
interface McpConnectionFactory {
  connect(config: McpServerConfig, options: McpConnectionFactoryOptions): Promise<McpConnection>;
}
interface McpRuntimeStatus {
  readonly serverId: string;
  readonly state: 'disconnected' | 'connecting' | 'connected' | 'error' | 'closed';
  readonly connectionCount: number;
  readonly error?: string;
}
interface McpResourceValidationOptions {
  readonly maxBytes?: number;
}
//#endregion
//#region src/mcp-json.d.ts
/** ${VAR} 环境变量插值（未定义变量替换为空串并 warning） */
declare function interpolateEnv(value: string): string;
/** 单条 mcp.json server 条目 → McpServerConfig；非法返回 undefined（warning 已打） */
declare function parseServerEntry(id: string, raw: unknown): McpServerConfig | undefined;
/** 读单个 mcp.json 文件 → 合法 server 列表（文件缺失/坏 JSON → 空列表 + warning） */
declare function readMcpJsonFile(path: string): McpServerConfig[];
interface ScopedMcpJsonOptions {
  /** DSH home（缺省 $DSH_HOME 或 ~/.dsh） */
  dshHome?: string;
  /** 项目目录（缺省 process.cwd()） */
  projectDir?: string;
}
/**
 * 多作用域加载与合并（user → project，按 id 后者覆盖前者）。
 * cordis config.servers 的合并在调用方完成（bundle 层最低优先级）。
 */
declare function loadScopedMcpServers(options?: ScopedMcpJsonOptions): McpServerConfig[];
/** 合并：cordis config（bundle/编程，最低）← mcp.json 作用域（高） */
declare function mergeServerConfigs(base: readonly McpServerConfig[], scoped: readonly McpServerConfig[]): McpServerConfig[];
/**
 * 向指定 mcp.json upsert 一个 server（保留文件中其他条目与字段顺序）。
 * 文件不存在时创建（含目录）。
 */
declare function upsertServerToFile(path: string, id: string, raw: unknown): void;
/** 从指定 mcp.json 移除一个 server（文件/条目不存在时静默）。 */
declare function removeServerFromFile(path: string, id: string): boolean;
/** 列出两作用域文件的 server（标注来源），供 admin 路由。 */
declare function listScopedServers(options?: ScopedMcpJsonOptions): Array<{
  source: 'user' | 'project';
  config: McpServerConfig;
}>;
/** 作用域文件路径（写操作用）。 */
declare function scopedFilePath(scope: 'user' | 'project', options?: ScopedMcpJsonOptions): string;
//#endregion
//#region src/admin-routes.d.ts
declare const MCP_ADMIN_ROUTE = "/openloop/mcp/servers";
interface AdminRouteOptions {
  dshHome?: string;
  projectDir?: string;
  /** 活动 runtime 的连接状态查询（列表行实时状态点；缺省时 rows 不带 state） */
  statusOf?: (id: string) => string | undefined;
}
declare function registerMcpAdminRoutes(ctx: Context, webServer: WebServer, options?: AdminRouteOptions): () => void;
//#endregion
//#region src/validation.d.ts
declare const MCP_APP_MIME = "text/html;profile=mcp-app";
declare const MCP_APP_MAX_BYTES: number;
type McpRuntimeErrorCode = 'UNKNOWN_SERVER' | 'UNKNOWN_TOOL' | 'INVALID_BINDING' | 'INVALID_RESOURCE' | 'RESOURCE_URI' | 'RESOURCE_MIME' | 'RESOURCE_ENCODING' | 'RESOURCE_TOO_LARGE' | 'RESOURCE_POLICY' | 'CONNECTION';
declare class McpRuntimeError extends Error {
  readonly code: McpRuntimeErrorCode;
  constructor(code: McpRuntimeErrorCode, message: string, options?: ErrorOptions);
}
declare function isRecord(value: unknown): value is JsonObject;
declare function asJsonObject(value: unknown): JsonObject | undefined;
declare function isUiResourceUri(uri: string): boolean;
declare function validateUiBinding(binding: McpUiBinding, expectedServerId?: string, expectedToolName?: string): McpUiBinding;
declare function validateAppMetadata(meta: JsonObject | undefined): void;
declare function appContentSecurityPolicy(meta: JsonObject | undefined): string;
declare function validateAppHtml(html: string, maxBytes?: number): void;
interface RawMcpResourceContents {
  readonly uri?: unknown;
  readonly mimeType?: unknown;
  readonly text?: unknown;
  readonly blob?: unknown;
  readonly _meta?: unknown;
}
declare function validateAppResource(serverId: string, requestedUri: string, contents: readonly RawMcpResourceContents[], options?: McpResourceValidationOptions): McpAppResource;
//#endregion
//#region src/index.d.ts
declare const defaultMcpConnectionFactory: McpConnectionFactory;
interface McpRuntimeOptions extends McpRuntimeConfig {
  readonly connectionFactory?: McpConnectionFactory;
}
declare class McpRuntime {
  readonly config: Required<Pick<McpRuntimeConfig, 'clientName' | 'clientVersion' | 'maxResourceBytes' | 'requestTimeoutMs'>>;
  private readonly factory;
  private readonly servers;
  constructor(options: McpRuntimeOptions);
  serverIds(): readonly string[];
  status(serverId: string): McpRuntimeStatus;
  connectionCount(serverId: string): number;
  onToolsChanged(serverId: string, listener: () => void): () => void;
  private readonly serverListeners;
  /**
   * 热添加 server（方向1 connect 流程，2026-08-28）：mcp.json 落盘后不重启 web
   * 即时激活。新 server 初始 disconnected，listTools/callTool 的 ensureConnection
   * 惰性连接（与启动容错同一语义）。通知 onServersChanged 订阅方（mcp-tools
   * 补工具注册）。
   */
  addServer(config: McpServerConfig): void;
  /**
   * 热移除 server：优雅关闭连接后从运行时摘除，通知订阅方清理该 server 的工具。
   * server 不存在时静默返回 false。
   */
  removeServer(serverId: string): Promise<boolean>;
  onServersChanged(listener: () => void): () => void;
  start(): Promise<void>;
  close(): Promise<void>;
  listTools(serverId: string, signal?: AbortSignal): Promise<readonly McpToolRecord[]>;
  callTool(serverId: string, toolName: string, args: JsonObject, options?: {
    readonly signal?: AbortSignal;
    readonly binding?: McpUiBinding;
    readonly hydrateApp?: boolean;
  }): Promise<McpCallResult>;
  readAppResource(serverId: string, resourceUri: string, binding?: McpUiBinding, signal?: AbortSignal): Promise<McpAppResource>;
  private ensureConnection;
  private closeServer;
  private closeConnection;
  private getServer;
  private findTool;
  private normalizeTool;
  private assertBinding;
}
declare class McpRuntimeService extends Service<McpRuntime> {
  static inject: string[];
  readonly runtime: McpRuntime;
  private readonly appGateway;
  constructor(ctx: Context, config: McpRuntimeOptions);
  get config(): Required<Pick<McpRuntimeConfig, "clientName" | "clientVersion" | "maxResourceBytes" | "requestTimeoutMs">>;
  serverIds(): readonly string[];
  status(serverId: string): McpRuntimeStatus;
  connectionCount(serverId: string): number;
  onToolsChanged(serverId: string, listener: () => void): () => void;
  onServersChanged(listener: () => void): () => void;
  addServer(config: McpServerConfig): void;
  removeServer(serverId: string): Promise<boolean>;
  start(): Promise<void>;
  close(): Promise<void>;
  listTools(serverId: string, signal?: AbortSignal): Promise<readonly McpToolRecord[]>;
  callTool(serverId: string, toolName: string, args: JsonObject, options?: {
    readonly signal?: AbortSignal;
    readonly binding?: McpUiBinding;
    readonly hydrateApp?: boolean;
  }): Promise<McpCallResult>;
  preparePresentation(tool: McpToolRecord, result: McpCallResult): McpCallResult;
  readAppResource(serverId: string, resourceUri: string, binding?: McpUiBinding, signal?: AbortSignal): Promise<McpAppResource>;
}
declare module '@deepseek-ai/cordis' {
  interface Context {
    mcpRuntime: McpRuntimeService;
  }
}
declare const name = "openloop-dsh-mcp-runtime";
declare const inject: string[];
declare function apply(ctx: Context, config: McpRuntimeOptions): Promise<void>;
declare const _default: {
  name: string;
  inject: string[];
  apply: typeof apply;
};
//#endregion
export { JsonObject, MCP_ADMIN_ROUTE, MCP_APP_MAX_BYTES, MCP_APP_MIME, McpAppResource, McpAppResourceReference, McpCallResult, McpConnection, McpConnectionFactory, McpConnectionFactoryOptions, McpResourceValidationOptions, McpRuntime, McpRuntimeConfig, McpRuntimeError, McpRuntimeErrorCode, McpRuntimeOptions, McpRuntimeService, McpRuntimeStatus, McpServerConfig, McpToolRecord, McpTransportConfig, McpUiBinding, RawMcpResourceContents, ScopedMcpJsonOptions, appContentSecurityPolicy, apply, asJsonObject, _default as default, defaultMcpConnectionFactory, inject, interpolateEnv, isRecord, isUiResourceUri, listScopedServers, loadScopedMcpServers, mergeServerConfigs, name, parseServerEntry, readMcpJsonFile, registerMcpAdminRoutes, removeServerFromFile, scopedFilePath, upsertServerToFile, validateAppHtml, validateAppMetadata, validateAppResource, validateUiBinding };