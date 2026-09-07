/**
 * 画布真身拉取端点（S4 → M4 重写：适配 0.1.2 webServer API）。
 *
 * - GET /qoder-canvas/canvas/:id —— 最新快照（?rev=N 读指定版本，版本选择器用）
 * - GET /qoder-canvas/list —— 工作区画布清单（注册表 _index.json；目录 UI 用）
 *
 * 0.1.2 内核教训（2026-09-06 实证）：webServer 服务的 API 是
 * `register({kind, path, handler})`（原生 Node handler），没有 ws.get 糖——
 * 0.1.1 时代的 `ws.get(path, fn)` 端点在内核迁移后全部静默失效
 * （typeof ws.get !== 'function' 直接 return）。重写为 register + prefix 路由。
 * 端点纪律不变：webServer 运行时注入（headless 静默降级）+ Origin 校验。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { CanvasStorage } from './storage.ts'

interface WebServerLike {
  register?: (route: { kind: 'exact' | 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }) => () => void
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.statusCode = status
  res.end(JSON.stringify(body))
}

export function setupCanvasReadEndpoint(ctx: Context, opts: { storageFor: (workspaceKey: string) => CanvasStorage; origin: () => string; diag?: () => unknown }): void {  const injectFn = (ctx as unknown as { inject?: (names: string[], fn: (ws: WebServerLike | undefined) => void) => void }).inject
  if (typeof injectFn !== 'function') return
  ctx.effect(() => {
    let disposed = false
    injectFn.call(ctx, ['webServer'], (routeCtx: unknown) => {
      // 回调参数是 ctx，服务挂属性上（app 包先例；直接当服务用是 0.1.1 旧形态）
      const ws = (routeCtx as { webServer?: WebServerLike } | undefined)?.webServer
      if (disposed || ws === undefined || typeof ws.register !== 'function') return
      // 同源校验：origin 头的 host 与请求 host 一致即放行（动态适配任意端口——
      // 真机教训：写死 fallback 端口在非默认端口实例上 403）。GET 无 origin 头放行。
      const allowed = (req: IncomingMessage): boolean => {
        const h = (k: string): string => {
          const v = req.headers[k]
          return typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? '') : ''
        }
        const origin = h('origin')
        if (origin.length === 0) return true
        const host = h('host')
        try { return new URL(origin).host === host } catch { return false }
      }
      // prefix 路由：/qoder-canvas/canvas/:id（+ ?rev=N / ?workspaceKey=）
      ws.register({
        kind: 'prefix',
        path: '/qoder-canvas/canvas',
        handler: async (req, res) => {
          if (!allowed(req)) { json(res, 403, { error: 'forbidden origin' }); return }
          const url = new URL(req.url ?? '/', 'http://loopback.invalid')
          const id = url.pathname.replace(/^\/qoder-canvas\/canvas\/?/, '')
          if (!/^cv_[a-z0-9]{8}$/.test(id)) { json(res, 400, { error: 'malformed canvas id' }); return }
          const wsKey = url.searchParams.get('workspaceKey')
          const storage = opts.storageFor(wsKey !== null && wsKey.length > 0 ? wsKey : '_no-cwd')
          const revRaw = url.searchParams.get('rev')
          const snapshot = revRaw !== null && /^\d+$/.test(revRaw)
            ? await storage.read(id, Number(revRaw))
            : await storage.latest(id)
          if (snapshot === null) { json(res, 404, { error: 'canvas not found' }); return }
          json(res, 200, snapshot)
        },
      })
      // exact 路由：/qoder-canvas/diag（诊断：save 失败原因等）
      ws.register({
        kind: 'exact',
        path: '/qoder-canvas/diag',
        handler: async (req, res) => {
          try {
            if (!allowed(req)) { json(res, 403, { error: 'forbidden origin' }); return }
            json(res, 200, opts.diag !== undefined ? opts.diag() : { diag: 'unavailable' })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      })
      // exact 路由：/qoder-canvas/list（工作区目录）
      ws.register({
        kind: 'exact',
        path: '/qoder-canvas/list',
        handler: async (req, res) => {
          try {
            if (!allowed(req)) { json(res, 403, { error: 'forbidden origin' }); return }
            const url = new URL(req.url ?? '/', 'http://loopback.invalid')
            const wsKey = url.searchParams.get('workspaceKey')
            const storage = opts.storageFor(wsKey !== null && wsKey.length > 0 ? wsKey : '_no-cwd')
            const items = await storage.list()
            json(res, 200, { items })
          } catch (error) {
            json(res, 500, { error: error instanceof Error ? error.message : String(error) })
          }
        },
      })
    })
    return () => { disposed = true }
  })
}
