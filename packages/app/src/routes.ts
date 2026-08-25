/**
 * webServer 受控路由 /openloop/app/*（client UI 数据面；MVP 为 M3 dock 预留）：
 * - GET  /openloop/app/status    进程状态（state/version/baseUrl）
 * - GET  /openloop/app/registry  全量注册表（apps + components + apis 含 configured）——M3 dock AppRegistry 数据源
 * - GET  /openloop/app/boards    读 dock v2 state（无数据 null）
 * - PUT  /openloop/app/boards    全量保存 dock v2 state（body = state；M3 dock 持久化通道）
 *
 * headless profile 无 webServer：路由不注册（tools 通道照常可用）。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import type { AppBackend } from './backend.ts'

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

  json(res, 404, { error: `unknown app route: ${method} /openloop/app/${sub}` })
}
