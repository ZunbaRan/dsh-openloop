/**
 * MCP admin 路由（settings page 的服务端）：
 * - GET  /openloop/mcp/servers            列两作用域 server（含来源）
 * - PUT  /openloop/mcp/servers/:scope/:id upsert（body = mcp.json 条目形态）
 * - DELETE /openloop/mcp/servers/:scope/:id
 * - POST /openloop/mcp/servers/test       试连（body = 条目；不落盘）
 * 试连 = new McpRuntime（单 server）→ start → listTools → close。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { McpRuntime } from './index.ts'
import { listScopedServers, parseServerEntry, removeServerFromFile, scopedFilePath, upsertServerToFile } from './mcp-json.ts'

export const MCP_ADMIN_ROUTE = '/openloop/mcp/servers'

async function readBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    total += (chunk as Buffer).byteLength
    if (total > maxBytes) throw new Error('request body too large')
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.statusCode = status
  res.end(JSON.stringify(body))
}

interface AdminRouteOptions {
  dshHome?: string
  projectDir?: string
}

export function registerMcpAdminRoutes(ctx: Context, webServer: WebServer, options: AdminRouteOptions = {}): () => void {
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    void handle(req, res, options)
  }
  return webServer.register({ kind: 'prefix', path: MCP_ADMIN_ROUTE, handler })
}

async function handle(req: IncomingMessage, res: ServerResponse, options: AdminRouteOptions): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://loopback.invalid')
  const parts = url.pathname.split('/').filter(Boolean).slice(2) // ['servers', ...]
  const method = req.method ?? 'GET'

  try {
    // POST /openloop/mcp/servers/test —— 试连
    if (method === 'POST' && parts[0] === 'servers' && parts[1] === 'test') {
      const body = JSON.parse(await readBody(req)) as { id?: unknown; entry?: unknown }
      const id: string = typeof body.id === 'string' && body.id.length > 0 ? body.id : 'test'
      const config = parseServerEntry(id, body.entry)
      if (config === undefined) {
        json(res, 200, { ok: false, error: 'invalid server entry (check type/command/url)' })
        return
      }
      const runtime = new McpRuntime({ servers: [config], requestTimeoutMs: 8000 })
      try {
        await runtime.start()
        const tools = await runtime.listTools(config.id)
        json(res, 200, { ok: true, toolCount: tools.length, tools: tools.slice(0, 30).map(t => t.name) })
      } finally {
        await runtime.close()
      }
      return
    }

    // GET /openloop/mcp/servers
    if (method === 'GET' && parts.length === 1 && parts[0] === 'servers') {
      const servers = listScopedServers(options)
      json(res, 200, {
        ok: true,
        servers: servers.map(({ source, config }) => ({
          id: config.id,
          source,
          kind: config.transport.kind,
          endpoint: config.transport.kind === 'stdio' ? config.transport.command : config.transport.url,
          protocol: config.protocol ?? 'auto',
        })),
      })
      return
    }

    // PUT /openloop/mcp/servers/:scope/:id
    if (method === 'PUT' && parts[0] === 'servers' && parts.length === 3) {
      const scope = parts[1] as string
      const id = parts[2] as string
      if (scope !== 'user' && scope !== 'project') {
        json(res, 200, { ok: false, error: 'scope must be user or project' })
        return
      }
      const entry = JSON.parse(await readBody(req))
      // 先校验形态
      const probe = parseServerEntry(id, entry)
      if (probe === undefined) {
        json(res, 200, { ok: false, error: 'invalid server entry (check type/command/url)' })
        return
      }
      upsertServerToFile(scopedFilePath(scope, options), id, entry)
      json(res, 200, { ok: true, note: 'saved; restart DSH to activate' })
      return
    }

    // DELETE /openloop/mcp/servers/:scope/:id
    if (method === 'DELETE' && parts[0] === 'servers' && parts.length === 3) {
      const scope = parts[1] as string
      const id = parts[2] as string
      if (scope !== 'user' && scope !== 'project') {
        json(res, 200, { ok: false, error: 'scope must be user or project' })
        return
      }
      const removed = removeServerFromFile(scopedFilePath(scope, options), id)
      json(res, 200, removed ? { ok: true, note: 'removed; restart DSH to activate' } : { ok: false, error: 'not found' })
      return
    }

    json(res, 404, { ok: false, error: 'not found' })
  } catch (error) {
    json(res, 200, { ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}
