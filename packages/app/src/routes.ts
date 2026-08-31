/**
 * webServer 受控路由 /openloop/app/*（client UI 数据面）：
 * - GET  /openloop/app/status    进程状态（state/version/baseUrl）
 * - GET  /openloop/app/registry  全量注册表（apps + components + apis 含 configured）
 * - GET  /openloop/app/boards    读 dock v2 state（无数据 null）
 * - PUT  /openloop/app/boards    全量保存 dock v2 state（body = state）
 * - GET  /openloop/app/pb-stats          PB 运行统计（版本/uptime/collections 计数/磁盘）
 * - GET  /openloop/app/collections       管理表清单 + 记录数（db-browser 下拉）
 * - GET  /openloop/app/collections/:name/records?page=&perPage=&q=  受控记录查询（分页+关键词）
 * - GET  /openloop/app/storage-usage     DSH_HOME 占用分解
 * - GET  /openloop/app/credentials       全部 API 资源凭据配置状态（不回显 key）
 * - GET  /openloop/app/sessions-stats    会话目录统计
 *
 * headless profile 无 webServer：路由不注册（tools 通道照常可用）。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import type { AppBackend } from './backend.ts'
import { PB_VERSION } from './pb-process.ts'
import { collectionCounts, clampPaging, isManagedCollection, listRecordsPaged } from './records.ts'
import { dirStats, sessionsStats, storageUsage } from './stats.ts'

export const APP_ROUTE = '/openloop/app'

async function readBody(req: IncomingMessage, maxBytes = 2 * 1024 * 1024): Promise<string> {
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

export interface AppRouteOptions {
  /** web profile 的活动 mcpRuntime（管理端点的热移除/热激活通道；headless 缺省） */
  getMcpRuntime?: () => import('@openloop/dsh-mcp-runtime').McpRuntimeService | undefined
  /** 事件写入通道（PB 权威 + ring 降级；0.5.0 持久化） */
  recordEvent?: (kind: 'registry' | 'backend' | 'mcp' | 'dock', level: 'info' | 'warn' | 'error', text: string) => void
  /** 事件读取通道（PB 查询；未注入回落 ring——单测） */
  listEvents?: (limit: number) => Promise<Array<{ at: number; kind: string; level: string; text: string }>>
  /** usage 写入通道（PB 合批） */
  recordUsage?: (source: string, kind: 'panel-binding' | 'mcp-call', ok: boolean, ms: number) => void
  /** usage 聚合读取（PB 窗口聚合；未注入返回空——单测） */
  readUsage?: () => Promise<{ windowMs: number; sources: Array<{ source: string; kind: string; total: number; failures: number; avgMs: number | null }> }>
}

export function registerAppRoutes(ctx: Context, webServer: WebServer, backend: AppBackend, options: AppRouteOptions = {}): () => void {
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    void handle(req, res, backend, options).catch(error => {
      json(res, 500, { error: error instanceof Error ? error.message : String(error) })
    })
  }
  return webServer.register({ kind: 'prefix', path: APP_ROUTE, handler })
}

async function handle(req: IncomingMessage, res: ServerResponse, backend: AppBackend, options: AppRouteOptions): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://loopback.invalid')
  const sub = url.pathname.slice(APP_ROUTE.length).replace(/^\/+|\/+$/g, '')
  const method = req.method ?? 'GET'

  // 状态：不等待 ready（诊断端点——启动失败也要能答）
  if (sub === 'status' && method === 'GET') {
    json(res, 200, backend.status())
    return
  }

  // invalidate：agent 写操作后的主动通知（dock 轻探 registryRev 对比，变了才拉全量）
  if (sub === 'invalidate' && method === 'POST') {
    const rev = backend.invalidateRegistry()
    json(res, 200, { ok: true, registryRev: rev })
    return
  }

  // ---- Agent 行为流水（自管理四件套；会话日志聚合，30s 缓存） ----
  if (sub === 'agent-activity' && method === 'GET') {
    const { snapshotAgentActivity } = await import('./agent-activity.ts')
    const sessionsDir = join(backend.dshHome(), 'sessions')
    json(res, 200, await snapshotAgentActivity(sessionsDir))
    return
  }

  // ---- 系统事件流（0.5.0：PB 权威读取 + ring 降级；写经 POST /events 或内部钩子） ----
  if (sub === 'events' && method === 'GET') {
    const url = new URL(req.url ?? '/', 'http://loopback.invalid')
    const limitRaw = Number(url.searchParams.get('limit') ?? '100')
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.round(limitRaw))) : 100
    if (options.listEvents !== undefined) {
      json(res, 200, { events: await options.listEvents(limit) })
    } else {
      const { ringSnapshot } = await import('./event-log.ts')
      json(res, 200, { events: ringSnapshot(limit) })
    }
    return
  }
  // 事件写入（panels/mcp-runtime 埋点桥 → 此端点；PB 合批落库）
  if (sub === 'events' && method === 'POST') {
    const body = JSON.parse(await readBody(req)) as { kind?: unknown; level?: unknown; text?: unknown }
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    if (text.length === 0) { json(res, 400, { error: 'text is required' }); return }
    const kind = body.kind === 'backend' || body.kind === 'mcp' || body.kind === 'dock' ? body.kind : 'registry'
    const level = body.level === 'warn' || body.level === 'error' ? body.level : 'info'
    options.recordEvent?.(kind, level, text.slice(0, 500))
    json(res, 200, { ok: true })
    return
  }

  // ---- api-usage 聚合（0.5.0：PB 窗口聚合权威；写经 POST /api-usage） ----
  if (sub === 'api-usage' && method === 'GET') {
    if (options.readUsage !== undefined) {
      json(res, 200, await options.readUsage())
    } else {
      json(res, 200, { windowMs: 24 * 60 * 60 * 1000, sources: [] })
    }
    return
  }
  // usage 写入（panels 数据绑定 / mcp-runtime callTool 埋点 → 此端点）
  if (sub === 'api-usage' && method === 'POST') {
    const body = JSON.parse(await readBody(req)) as { source?: unknown; kind?: unknown; ok?: unknown; ms?: unknown }
    const source = typeof body.source === 'string' ? body.source.trim() : ''
    if (source.length === 0) { json(res, 400, { error: 'source is required' }); return }
    const kind = body.kind === 'mcp-call' ? 'mcp-call' : 'panel-binding'
    options.recordUsage?.(source, kind, body.ok !== false, typeof body.ms === 'number' && Number.isFinite(body.ms) ? Math.max(0, Math.round(body.ms)) : 0)
    json(res, 200, { ok: true })
    return
  }

  // ---- app-manager 受控管理端点（0.4.0 自管理四件套；写操作全部门面化） ----
  // 断开第三方包：热移除 runtime + 保留 mcp.json 条目 + 级联清 registry 壳
  if (sub === 'manage/disconnect' && method === 'POST') {
    const body = JSON.parse(await readBody(req)) as { serverId?: unknown }
    if (typeof body.serverId !== 'string' || body.serverId.length === 0) {
      json(res, 400, { error: 'serverId is required' })
      return
    }
    const { disconnectServer } = await import('./connect.ts')
    const result = await disconnectServer({
      serverId: body.serverId,
      dshHome: backend.dshHome(),
      backend,
      mcpRuntime: options.getMcpRuntime?.(),
    })
    json(res, 200, result)
    return
  }
  // 重连：复用 mcp.json 保留条目热激活
  if (sub === 'manage/reconnect' && method === 'POST') {
    const body = JSON.parse(await readBody(req)) as { serverId?: unknown }
    if (typeof body.serverId !== 'string' || body.serverId.length === 0) {
      json(res, 400, { error: 'serverId is required' })
      return
    }
    const { reconnectServer } = await import('./connect.ts')
    const result = await reconnectServer({
      serverId: body.serverId,
      dshHome: backend.dshHome(),
      backend,
      mcpRuntime: options.getMcpRuntime?.(),
    })
    json(res, 200, result)
    return
  }
  // 删除 APP（自研/第三方通用）：级联清组件与 API 资源
  if (sub === 'manage/delete' && method === 'POST') {
    const body = JSON.parse(await readBody(req)) as { appName?: unknown }
    if (typeof body.appName !== 'string' || body.appName.length === 0) {
      json(res, 400, { error: 'appName is required' })
      return
    }
    const deleteFacade = await backend.ready()
    const result = await deleteFacade.deleteApp(body.appName)
    options.recordEvent?.('registry', 'warn', `删除 APP「${body.appName}」（级联清理 ${(result as { removedComponents?: number }).removedComponents ?? 0} 组件）`)
    backend.invalidateRegistry()
    json(res, 200, { ok: true, appName: body.appName, ...result })
    return
  }

  const facade = await backend.ready()

  if (sub === 'registry' && method === 'GET') {
    const apps = await facade.listApps()
    const details = await Promise.all(apps.map(async app => facade.getAppDetail(app.name)))
    json(res, 200, {
      apps: details.map(d => d === undefined ? null : d).filter(d => d !== null),
    })
    return
  }

  if (sub === 'boards' && method === 'GET') {
    json(res, 200, { state: await facade.loadDockState() })
    return
  }

  if (sub === 'boards' && method === 'PUT') {
    const body = JSON.parse(await readBody(req)) as unknown
    const saved = await facade.saveDockState(body)
    json(res, 200, { saved })
    return
  }

  // ---- M3+ 本地后端预设族数据端点（panels 预设经浏览器同源 fetch 消费） ----

  if (sub === 'pb-stats' && method === 'GET') {
    const pb = backend.pbClient()
    if (pb === undefined) { json(res, 503, { error: 'app backend is not running' }); return }
    const collections = await collectionCounts(pb)
    const dataDir = backend.pbDataDir()
    const dataDirBytes = dataDir !== undefined ? (await dirStats(dataDir)).bytes : 0
    const startedAt = backend.startedAt()
    json(res, 200, {
      version: PB_VERSION,
      state: 'running',
      uptimeMs: startedAt !== undefined ? Date.now() - startedAt : null,
      collections,
      dataDirBytes,
    })
    return
  }

  if (sub === 'collections' && method === 'GET') {
    const pb = backend.pbClient()
    if (pb === undefined) { json(res, 503, { error: 'app backend is not running' }); return }
    json(res, 200, { collections: await collectionCounts(pb) })
    return
  }

  if (sub.startsWith('collections/') && sub.endsWith('/records') && method === 'GET') {
    const pb = backend.pbClient()
    if (pb === undefined) { json(res, 503, { error: 'app backend is not running' }); return }
    const name = sub.slice('collections/'.length, -'/records'.length)
    if (!isManagedCollection(name)) {
      json(res, 404, { error: `unknown collection "${name}"; managed: apps, components, apis, boards, tiles, meta` })
      return
    }
    const { page, perPage } = clampPaging(url.searchParams.get('page'), url.searchParams.get('perPage'))
    const q = url.searchParams.get('q') ?? undefined
    json(res, 200, await listRecordsPaged(pb, name, page, perPage, q))
    return
  }

  if (sub === 'storage-usage' && method === 'GET') {
    json(res, 200, await storageUsage(backend.dshHome()))
    return
  }

  if (sub === 'credentials' && method === 'GET') {
    // 直接查 apis 表（跨 APP 汇总）；keySecret 剥离，configured 只报布尔
    const pb = backend.pbClient()
    if (pb === undefined) { json(res, 503, { error: 'app backend is not running' }); return }
    const params = new URLSearchParams({ page: '1', perPage: '200' })
    const res2 = await pb.request<{ items?: Array<Record<string, unknown>> }>('GET', `/api/collections/apis/records?${params.toString()}`)
    const rows = (res2?.items ?? []).map(row => ({
      rid: String(row.rid ?? ''),
      appName: String(row.appName ?? ''),
      domain: String(row.domain ?? ''),
      path: String(row.path ?? ''),
      authType: row.authType === 'key' ? 'key' : 'none',
      configured: typeof row.keySecret === 'string' && row.keySecret.length > 0,
    })).filter(row => row.rid.length > 0).sort((a, b) => a.rid.localeCompare(b.rid))
    json(res, 200, { apis: rows })
    return
  }

  if (sub === 'sessions-stats' && method === 'GET') {
    json(res, 200, await sessionsStats(backend.dshHome()))
    return
  }

  json(res, 404, { error: `unknown app route: ${method} /openloop/app/${sub}` })
}
