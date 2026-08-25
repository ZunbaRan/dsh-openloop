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

export function registerAppRoutes(ctx: Context, webServer: WebServer, backend: AppBackend): () => void {
  const handler = (req: IncomingMessage, res: ServerResponse): void => {
    void handle(req, res, backend).catch(error => {
      json(res, 500, { error: error instanceof Error ? error.message : String(error) })
    })
  }
  return webServer.register({ kind: 'prefix', path: APP_ROUTE, handler })
}

async function handle(req: IncomingMessage, res: ServerResponse, backend: AppBackend): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://loopback.invalid')
  const sub = url.pathname.slice(APP_ROUTE.length).replace(/^\/+|\/+$/g, '')
  const method = req.method ?? 'GET'

  // 状态：不等待 ready（诊断端点——启动失败也要能答）
  if (sub === 'status' && method === 'GET') {
    json(res, 200, backend.status())
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
