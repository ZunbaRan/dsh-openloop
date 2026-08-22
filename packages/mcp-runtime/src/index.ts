import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import { Service } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'
import { StdioClientTransport, type StdioServerParameters } from '@modelcontextprotocol/client/stdio'
import type {
  CallToolResult,
  ClientCapabilities,
  ReadResourceResult,
  Tool,
} from '@modelcontextprotocol/client'
import {
  asJsonObject,
  appContentSecurityPolicy,
  McpRuntimeError,
  validateAppMetadata,
  validateAppResource,
  validateUiBinding,
  type RawMcpResourceContents,
} from './validation.ts'
import type {
  JsonObject,
  McpCallResult,
  McpAppResource,
  McpAppResourceReference,
  McpConnection,
  McpConnectionFactory,
  McpConnectionFactoryOptions,
  McpRuntimeConfig,
  McpRuntimeStatus,
  McpServerConfig,
  McpToolRecord,
  McpUiBinding,
} from './types.ts'

export * from './types.ts'
export * from './validation.ts'

const DEFAULT_CLIENT_NAME = 'OpenLoop DSH MCP Host'
const DEFAULT_CLIENT_VERSION = '0.1.0'
const DEFAULT_REQUEST_TIMEOUT = 60_000

function requestOptions(signal: AbortSignal | undefined, timeout: number): { signal?: AbortSignal; timeout: number } {
  return signal ? { signal, timeout } : { timeout }
}

class SdkMcpConnection implements McpConnection {
  constructor(private readonly client: Client, private readonly timeout: number) {}

  async listTools(signal?: AbortSignal): Promise<{ readonly tools: readonly Tool[] }> {
    const result = await this.client.listTools({}, requestOptions(signal, this.timeout))
    return { tools: result.tools }
  }

  async callTool(name: string, args: JsonObject, signal?: AbortSignal): Promise<CallToolResult> {
    const result = await this.client.callTool({ name, arguments: args }, requestOptions(signal, this.timeout))
    if (!Array.isArray((result as { content?: unknown }).content)) {
      throw new McpRuntimeError('CONNECTION', 'Task-based MCP tool results are not supported by this runtime adapter')
    }
    return result as CallToolResult
  }

  async readResource(uri: string, signal?: AbortSignal): Promise<ReadResourceResult> {
    return await this.client.readResource({ uri }, requestOptions(signal, this.timeout))
  }

  async close(): Promise<void> {
    await this.client.close()
  }
}

function sdkCapabilities(): ClientCapabilities {
  return {
    extensions: {
      // This is the stable extension-capability seam used by the supported
      // 2025-era SDK. A future protocol adapter can negotiate newer names here
      // without changing the runtime API.
      'io.modelcontextprotocol/ui': {},
    },
  }
}

function makeTransport(config: McpServerConfig): StdioClientTransport | StreamableHTTPClientTransport {
  if (config.transport.kind === 'stdio') {
    const params: StdioServerParameters = {
      command: config.transport.command,
      ...(config.transport.args ? { args: [...config.transport.args] } : {}),
      ...(config.transport.env ? { env: { ...config.transport.env } } : {}),
      ...(config.transport.cwd ? { cwd: config.transport.cwd } : {}),
      stderr: 'pipe',
    }
    return new StdioClientTransport(params)
  }
  return new StreamableHTTPClientTransport(new URL(config.transport.url), {
    ...(config.transport.headers ? { requestInit: { headers: { ...config.transport.headers } } } : {}),
  })
}

export const defaultMcpConnectionFactory: McpConnectionFactory = {
  async connect(config, options): Promise<McpConnection> {
    const transport = makeTransport(config)
    const client = new Client(
      { name: options.clientName, version: options.clientVersion },
      {
        capabilities: sdkCapabilities(),
        versionNegotiation: {
          mode: config.protocol === '2026-07-28'
            ? { pin: '2026-07-28' }
            : config.protocol ?? 'auto',
        },
        listChanged: {
          tools: {
            onChanged: () => options.onToolsChanged(),
          },
        },
        enforceStrictCapabilities: false,
      },
    )
    try {
      await client.connect(transport as unknown as Parameters<Client['connect']>[0], { timeout: options.requestTimeoutMs })
      return new SdkMcpConnection(client, options.requestTimeoutMs)
    } catch (error) {
      await transport.close().catch(() => undefined)
      throw error
    }
  },
}

interface ServerState {
  readonly config: McpServerConfig
  connection: McpConnection | undefined
  connecting: Promise<McpConnection> | undefined
  state: McpRuntimeStatus['state']
  connectionCount: number
  error: string | undefined
  tools: readonly McpToolRecord[] | undefined
  listeners: Set<() => void>
  closing: boolean
  closePromise: Promise<void> | undefined
  closedConnections: WeakSet<McpConnection>
}

export interface McpRuntimeOptions extends McpRuntimeConfig {
  readonly connectionFactory?: McpConnectionFactory
}

export class McpRuntime {
  readonly config: Required<Pick<McpRuntimeConfig, 'clientName' | 'clientVersion' | 'maxResourceBytes' | 'requestTimeoutMs'>>
  private readonly factory: McpConnectionFactory
  private readonly servers = new Map<string, ServerState>()

  constructor(options: McpRuntimeOptions) {
    this.config = {
      clientName: options.clientName ?? DEFAULT_CLIENT_NAME,
      clientVersion: options.clientVersion ?? DEFAULT_CLIENT_VERSION,
      maxResourceBytes: options.maxResourceBytes ?? 8 * 1024 * 1024,
      requestTimeoutMs: options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT,
    }
    this.factory = options.connectionFactory ?? defaultMcpConnectionFactory
    for (const server of options.servers) {
      if (!server.id || this.servers.has(server.id)) throw new Error(`MCP server ids must be unique: ${server.id}`)
      this.servers.set(server.id, {
        config: server,
        connection: undefined,
        connecting: undefined,
        state: 'disconnected',
        connectionCount: 0,
        error: undefined,
        tools: undefined,
        listeners: new Set(),
        closing: false,
        closePromise: undefined,
        closedConnections: new WeakSet(),
      })
    }
  }

  serverIds(): readonly string[] {
    return [...this.servers.keys()]
  }

  status(serverId: string): McpRuntimeStatus {
    const state = this.getServer(serverId)
    return {
      serverId,
      state: state.state,
      connectionCount: state.connectionCount,
      ...(state.error ? { error: state.error } : {}),
    }
  }

  connectionCount(serverId: string): number {
    return this.getServer(serverId).connectionCount
  }

  onToolsChanged(serverId: string, listener: () => void): () => void {
    const state = this.getServer(serverId)
    state.listeners.add(listener)
    return () => state.listeners.delete(listener)
  }

  async start(): Promise<void> {
    await Promise.all(this.serverIds().map((serverId) => this.ensureConnection(serverId).then(() => undefined)))
  }

  async close(): Promise<void> {
    await Promise.all([...this.servers.values()].map((state) => this.closeServer(state)))
  }

  async listTools(serverId: string, signal?: AbortSignal): Promise<readonly McpToolRecord[]> {
    const state = this.getServer(serverId)
    const connection = await this.ensureConnection(serverId)
    const result = await connection.listTools(signal)
    const tools = result.tools.map((tool) => this.normalizeTool(serverId, tool))
    state.tools = tools
    return tools
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: JsonObject,
    options: { readonly signal?: AbortSignal; readonly binding?: McpUiBinding; readonly hydrateApp?: boolean } = {},
  ): Promise<McpCallResult> {
    const state = this.getServer(serverId)
    const connection = await this.ensureConnection(serverId)
    const tool = await this.findTool(state, serverId, toolName, options.signal)
    if (options.binding) this.assertBinding(tool, options.binding)
    const result = await connection.callTool(toolName, args, options.signal)
    const structuredContent = asJsonObject(result.structuredContent)
    const resultMeta = asJsonObject(result._meta)
    const canonical: McpCallResult = {
      serverId,
      toolName,
      content: result.content,
      isError: result.isError === true,
      ...(structuredContent ? { structuredContent } : {}),
      ...(resultMeta ? { _meta: resultMeta } : {}),
    }
    if (tool.ui && !canonical.isError && options.hydrateApp !== false) {
      try {
        const uiResource = await this.readAppResource(serverId, tool.ui.resourceUri, tool.ui, options.signal)
        return { ...canonical, uiResource }
      } catch {
        // The text/image fallback is the ordinary MCP contract. App hydration
        // is intentionally best effort so an invalid resource never removes it.
      }
    }
    return canonical
  }

  async readAppResource(
    serverId: string,
    resourceUri: string,
    binding?: McpUiBinding,
    signal?: AbortSignal,
  ) {
    const state = this.getServer(serverId)
    const connection = await this.ensureConnection(serverId)
    if (binding) {
      const tool = await this.findTool(state, serverId, binding.toolName, signal)
      this.assertBinding(tool, binding)
    } else {
      const tools = state.tools ?? await this.listTools(serverId, signal)
      const matches = tools.filter((tool) => tool.ui?.resourceUri === resourceUri)
      if (matches.length !== 1 || !matches[0]?.ui) {
        throw new McpRuntimeError('INVALID_BINDING', 'MCP App resource is not uniquely bound to a tool')
      }
    }
    if (!resourceUri.startsWith('ui://')) {
      throw new McpRuntimeError('RESOURCE_URI', `MCP App resources must use ui://: ${resourceUri}`)
    }
    const response = await connection.readResource(resourceUri, signal)
    return validateAppResource(serverId, resourceUri, response.contents as readonly RawMcpResourceContents[], {
      maxBytes: this.config.maxResourceBytes,
    })
  }

  private async ensureConnection(serverId: string): Promise<McpConnection> {
    const state = this.getServer(serverId)
    if (state.closing) throw new McpRuntimeError('CONNECTION', `MCP server ${serverId} is closed`)
    if (state.connection) return state.connection
    if (state.connecting) {
      try {
        const connection = await state.connecting
        if (state.closing) throw new McpRuntimeError('CONNECTION', `MCP server ${serverId} closed while connecting`)
        return connection
      } catch (error) {
        if (error instanceof McpRuntimeError) throw error
        throw new McpRuntimeError('CONNECTION', `MCP server ${serverId} connection failed`, { cause: error })
      }
    }
    state.state = 'connecting'
    const connecting = this.factory.connect(state.config, {
      clientName: this.config.clientName,
      clientVersion: this.config.clientVersion,
      requestTimeoutMs: this.config.requestTimeoutMs,
      onToolsChanged: () => {
        state.tools = undefined
        for (const listener of state.listeners) listener()
      },
    })
    state.connecting = connecting
    try {
      const connection = await connecting
      state.connection = connection
      state.connecting = undefined
      if (state.closing) {
        await this.closeConnection(state, connection)
        state.connection = undefined
        state.state = 'closed'
        throw new McpRuntimeError('CONNECTION', `MCP server ${serverId} closed while connecting`)
      }
      state.connectionCount += 1
      state.state = 'connected'
      return connection
    } catch (error) {
      state.connecting = undefined
      if (state.closing) {
        state.state = 'closed'
        throw error instanceof McpRuntimeError
          ? error
          : new McpRuntimeError('CONNECTION', `MCP server ${serverId} closed while connecting`, { cause: error })
      }
      state.state = 'error'
      state.error = error instanceof Error ? error.message : String(error)
      throw new McpRuntimeError('CONNECTION', `MCP server ${serverId} connection failed: ${state.error}`, { cause: error })
    }
  }

  private async closeServer(state: ServerState): Promise<void> {
    if (state.closePromise) return state.closePromise
    state.closing = true
    state.closePromise = (async () => {
      const pending = state.connecting
      let connection = state.connection
      if (!connection && pending) connection = await pending.catch(() => undefined)
      state.connection = undefined
      state.connecting = undefined
      state.tools = undefined
      if (connection) await this.closeConnection(state, connection)
      state.state = 'closed'
    })()
    await state.closePromise
  }

  private async closeConnection(state: ServerState, connection: McpConnection): Promise<void> {
    if (state.closedConnections.has(connection)) return
    state.closedConnections.add(connection)
    await connection.close().catch(() => undefined)
  }

  private getServer(serverId: string): ServerState {
    const state = this.servers.get(serverId)
    if (!state) throw new McpRuntimeError('UNKNOWN_SERVER', `Unknown MCP server: ${serverId}`)
    return state
  }

  private async findTool(state: ServerState, serverId: string, toolName: string, signal?: AbortSignal): Promise<McpToolRecord> {
    const tools = state.tools ?? await this.listTools(serverId, signal)
    const tool = tools.find((candidate) => candidate.name === toolName)
    if (!tool) throw new McpRuntimeError('UNKNOWN_TOOL', `Unknown MCP tool: ${serverId}/${toolName}`)
    return tool
  }

  private normalizeTool(serverId: string, tool: Tool): McpToolRecord {
    const meta = asJsonObject(tool._meta)
    let ui: McpUiBinding | undefined
    try {
      validateAppMetadata(meta)
      ui = extractUiBinding(serverId, tool.name, meta)
    } catch {
      // A malformed UI declaration must not remove the ordinary MCP tool.
      // Keep the original metadata for diagnostics but do not create a UI binding.
      ui = undefined
    }
    return {
      serverId,
      name: tool.name,
      modelVisible: isModelVisible(meta),
      appVisible: isAppVisible(meta),
      ...(tool.description ? { description: tool.description } : {}),
      inputSchema: tool.inputSchema as JsonObject,
      ...(tool.outputSchema ? { outputSchema: tool.outputSchema as JsonObject } : {}),
      ...(meta ? { _meta: meta } : {}),
      ...(ui ? { ui } : {}),
    }
  }

  private assertBinding(tool: McpToolRecord, binding: McpUiBinding): void {
    validateUiBinding(binding, tool.serverId, tool.name)
    if (!tool.ui || tool.ui.resourceUri !== binding.resourceUri) {
      throw new McpRuntimeError('INVALID_BINDING', 'MCP App binding is not the binding advertised by the tool')
    }
  }
}

const MCP_APP_ROUTE = '/api/openloop/mcp-app'
const MCP_APP_AUTHORITY_TTL_MS = 60 * 60 * 1000
const MCP_APP_AUTHORITY_LIMIT = 64
const MCP_APP_CALL_BODY_LIMIT = 1024 * 1024

interface McpAppAuthority {
  readonly serverId: string
  readonly resourceUri: string
  readonly resource: McpAppResource
  readonly expiresAt: number
}

function readRequestBody(req: IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let bytes = 0
    req.on('data', (chunk: Buffer | string) => {
      const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      bytes += value.byteLength
      if (bytes > maxBytes) {
        reject(new McpRuntimeError('RESOURCE_TOO_LARGE', 'MCP App gateway request body is too large'))
        req.destroy()
        return
      }
      chunks.push(value)
    })
    req.once('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.once('error', reject)
  })
}

class McpAppGateway {
  private readonly authorities = new Map<string, McpAppAuthority>()

  constructor(private readonly runtime: McpRuntime, private readonly webServer: WebServer) {}

  register(ctx: Context): void {
    ctx.effect(() => this.webServer.register({
      kind: 'prefix',
      path: MCP_APP_ROUTE,
      handler: (req, res) => this.handle(req, res),
    }), 'mcp-runtime: App resource and call gateway')
    ctx.effect(() => () => this.authorities.clear(), 'mcp-runtime: App authority store')
  }

  reference(tool: McpToolRecord, result: McpCallResult): McpCallResult {
    const resource = result.uiResource
    if (!resource || !('html' in resource) || !tool.ui || resource.resourceUri !== tool.ui.resourceUri) return result
    this.prune()
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '')
    this.authorities.set(token, {
      serverId: tool.serverId,
      resourceUri: resource.resourceUri,
      resource,
      expiresAt: Date.now() + MCP_APP_AUTHORITY_TTL_MS,
    })
    const reference: McpAppResourceReference = {
      serverId: resource.serverId,
      resourceUri: resource.resourceUri,
      mimeType: resource.mimeType,
      resourceUrl: `${MCP_APP_ROUTE}/resource/${token}`,
      documentUrl: `${MCP_APP_ROUTE}/document/${token}`,
      callToolUrl: `${MCP_APP_ROUTE}/call/${token}`,
      ...(resource._meta ? { _meta: resource._meta } : {}),
    }
    return { ...result, uiResource: reference }
  }

  private prune(): void {
    const now = Date.now()
    for (const [token, authority] of this.authorities) {
      if (authority.expiresAt <= now) this.authorities.delete(token)
    }
    while (this.authorities.size >= MCP_APP_AUTHORITY_LIMIT) {
      const oldest = this.authorities.keys().next().value
      if (oldest === undefined) break
      this.authorities.delete(oldest)
    }
  }

  private authority(token: string): McpAppAuthority | undefined {
    const authority = this.authorities.get(token)
    if (!authority || authority.expiresAt <= Date.now()) {
      this.authorities.delete(token)
      return undefined
    }
    return authority
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    const pathname = new URL(req.url ?? '/', 'http://loopback.invalid').pathname
    if (pathname === `${MCP_APP_ROUTE}/refresh`) return this.refresh(req, res)
    const match = pathname.match(/^\/api\/openloop\/mcp-app\/(resource|document|call)\/([a-f0-9]{64})$/)
    if (!match) return this.respond(res, 404, { error: 'not_found' })
    const kind = match[1]
    const token = match[2]
    const authority = token ? this.authority(token) : undefined
    if (!authority) return this.respond(res, 404, { error: 'expired_or_unknown_authority' })
    if (kind === 'resource') {
      if (req.method !== 'GET') return this.respond(res, 405, { error: 'method_not_allowed' })
      return this.respond(res, 200, { html: authority.resource.html })
    }
    if (kind === 'document') {
      if (req.method !== 'GET') return this.respond(res, 405, { error: 'method_not_allowed' })
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.setHeader('Content-Security-Policy', appContentSecurityPolicy(authority.resource._meta))
      res.end(authority.resource.html)
      return
    }
    if (req.method !== 'POST') return this.respond(res, 405, { error: 'method_not_allowed' })
    let request: JsonObject
    try {
      request = asJsonObject(JSON.parse(await readRequestBody(req, MCP_APP_CALL_BODY_LIMIT))) ?? {}
    } catch {
      return this.respond(res, 400, { error: 'invalid_request' })
    }
    const name = request.name
    const args = asJsonObject(request.arguments) ?? {}
    if (typeof name !== 'string') return this.respond(res, 400, { error: 'invalid_tool_name' })
    const tools = await this.runtime.listTools(authority.serverId)
    const tool = tools.find((candidate) => candidate.name === name)
    if (!tool?.appVisible) {
      return this.respond(res, 403, { error: 'tool_not_visible_to_app' })
    }
    const result = await this.runtime.callTool(authority.serverId, name, args, { hydrateApp: false })
    return this.respond(res, 200, result)
  }

  private async refresh(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'POST') return this.respond(res, 405, { error: 'method_not_allowed' })
    let request: JsonObject
    try {
      request = asJsonObject(JSON.parse(await readRequestBody(req, MCP_APP_CALL_BODY_LIMIT))) ?? {}
    } catch {
      return this.respond(res, 400, { error: 'invalid_request' })
    }
    const { serverId, toolName, resourceUri } = request
    if (typeof serverId !== 'string' || typeof toolName !== 'string' || typeof resourceUri !== 'string') {
      return this.respond(res, 400, { error: 'invalid_binding' })
    }
    try {
      const tool = (await this.runtime.listTools(serverId)).find((candidate) => candidate.name === toolName)
      if (!tool?.ui || tool.ui.resourceUri !== resourceUri) return this.respond(res, 403, { error: 'invalid_binding' })
      const resource = await this.runtime.readAppResource(serverId, resourceUri, tool.ui)
      const referenced = this.reference(tool, {
        serverId,
        toolName,
        content: [],
        isError: false,
        uiResource: resource,
      })
      return this.respond(res, 200, referenced.uiResource)
    } catch {
      return this.respond(res, 404, { error: 'resource_unavailable' })
    }
  }

  private respond(res: ServerResponse, status: number, value: unknown): void {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(value))
  }
}

function extractUiBinding(serverId: string, toolName: string, meta: JsonObject | undefined): McpUiBinding | undefined {
  if (!meta) return undefined
  const ui = asJsonObject(meta.ui ?? meta['io.modelcontextprotocol/ui'])
  if (!ui || typeof ui.resourceUri !== 'string') return undefined
  if (ui.visibility !== undefined
    && ui.visibility !== 'inline'
    && ui.visibility !== 'fullscreen'
    && !(Array.isArray(ui.visibility) && ui.visibility.every((value) => value === 'model' || value === 'app'))) {
    throw new McpRuntimeError('INVALID_BINDING', 'MCP App binding visibility is not supported')
  }
  const binding: McpUiBinding = {
    serverId,
    toolName,
    resourceUri: ui.resourceUri,
    ...(ui.visibility === 'fullscreen' ? { visibility: 'fullscreen' } : {}),
    _meta: ui,
  }
  return validateUiBinding(binding, serverId, toolName)
}

function isModelVisible(meta: JsonObject | undefined): boolean {
  if (!meta) return true
  const ui = asJsonObject(meta.ui ?? meta['io.modelcontextprotocol/ui'])
  if (!ui || !Array.isArray(ui.visibility)) return true
  return ui.visibility.includes('model')
}

function isAppVisible(meta: JsonObject | undefined): boolean {
  if (!meta) return false
  const ui = asJsonObject(meta.ui ?? meta['io.modelcontextprotocol/ui'])
  return Boolean(ui && Array.isArray(ui.visibility) && ui.visibility.includes('app'))
}

export class McpRuntimeService extends Service<McpRuntime> {
  static inject = ['webServer']
  readonly runtime: McpRuntime
  private readonly appGateway: McpAppGateway | undefined

  constructor(ctx: Context, config: McpRuntimeOptions) {
    super(ctx, 'mcpRuntime')
    this.runtime = new McpRuntime(config)
    this.appGateway = new McpAppGateway(this.runtime, ctx.webServer)
    this.appGateway.register(ctx)
    ctx.effect(() => () => this.runtime.close(), 'mcp-runtime-connection')
  }

  get config() { return this.runtime.config }
  serverIds() { return this.runtime.serverIds() }
  status(serverId: string) { return this.runtime.status(serverId) }
  connectionCount(serverId: string) { return this.runtime.connectionCount(serverId) }
  onToolsChanged(serverId: string, listener: () => void) { return this.runtime.onToolsChanged(serverId, listener) }
  start() { return this.runtime.start() }
  close() { return this.runtime.close() }
  listTools(serverId: string, signal?: AbortSignal) { return this.runtime.listTools(serverId, signal) }
  callTool(serverId: string, toolName: string, args: JsonObject, options: { readonly signal?: AbortSignal; readonly binding?: McpUiBinding; readonly hydrateApp?: boolean } = {}) {
    return this.runtime.callTool(serverId, toolName, args, options)
  }
  preparePresentation(tool: McpToolRecord, result: McpCallResult) {
    return this.appGateway?.reference(tool, result) ?? result
  }
  readAppResource(serverId: string, resourceUri: string, binding?: McpUiBinding, signal?: AbortSignal) {
    return this.runtime.readAppResource(serverId, resourceUri, binding, signal)
  }
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    mcpRuntime: McpRuntimeService
  }
}

export const name = 'openloop-dsh-mcp-runtime'
export const inject = ['webServer']
export async function apply(ctx: Context, config: McpRuntimeOptions): Promise<void> {
  const service = new McpRuntimeService(ctx, config)
  await service.start()
}

export default { name, inject, apply }
