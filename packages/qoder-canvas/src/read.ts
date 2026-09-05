/**
 * 画布真身拉取端点（S4，QODER_CANVAS_SIDEBAR §4）。
 *
 * GET /qoder-canvas/canvas/:id —— 从 storage 读该 canvasId 最新快照（真身），
 * 工作台用它替代「入口卡片快照传递」获得最新版（Agent 续编后可刷新）。
 * 端点纪律同 annotate.ts：webServer 运行时注入（headless 静默降级）+ Origin 校验。
 */
import type { Context } from '@deepseek-ai/cordis'
import type { CanvasStorage } from './storage.ts'

interface WebServerLike {
  get?: (path: string, handler: (ctx: { request: { origin?: string; referer?: string }; params: Record<string, string> }) => Promise<{ status: number; body: unknown } | void>) => unknown
}

export function setupCanvasReadEndpoint(ctx: Context, opts: { storageFor: (workspaceKey: string) => CanvasStorage; origin: () => string }): void {
  const injectFn = (ctx as unknown as { inject?: (names: string[], fn: (ws: WebServerLike | undefined) => void) => void }).inject
  if (typeof injectFn !== 'function') return
  ctx.effect(() => {
    let disposed = false
    injectFn.call(ctx, ['webServer'], (ws: WebServerLike | undefined) => {
      if (disposed || ws === undefined || typeof ws.get !== 'function') return
      ws.get('/qoder-canvas/canvas/:id', async (req) => {
        const origin = req.request.origin ?? ''
        const referer = req.request.referer ?? ''
        const allowed = origin === opts.origin() || (origin.length === 0 && (referer.startsWith(opts.origin()) || referer.length === 0))
        if (!allowed) return { status: 403, body: { error: 'forbidden origin' } }
        const id = req.params.id
        if (typeof id !== 'string' || !/^cv_[a-z0-9]{8}$/.test(id)) return { status: 400, body: { error: 'malformed canvas id' } }
        // workspaceKey：从 query 传入（工作台知道当前 cwd；与 storage 隔离键一致）
        const wsKey = (req.params as Record<string, unknown>).workspaceKey
        const storage = opts.storageFor(typeof wsKey === 'string' && wsKey.length > 0 ? wsKey : '_no-cwd')
        const snapshot = await storage.latest(id)
        if (snapshot === null) return { status: 404, body: { error: 'canvas not found' } }
        return { status: 200, body: snapshot }
      })
    })
    return () => { disposed = true }
  })
}
