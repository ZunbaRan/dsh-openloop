/**
 * 标注审计端点（M2 T2.5，设计文档 §3.4）。
 *
 * 职责边界：仅记审计日志（尽力而为）——注入编排全在 client，本端点零副作用。
 * 端点纪律（panels 0.1.7 事故教训 + 评审核对结论）：
 * - ctx.effect 包裹拿 disposer
 * - webServer 不入静态 inject（headless 无 HTTP 服务会炸插件）——运行时嵌套注入
 * - Origin/Referer 同源校验 + body schema 硬校验 + 每 canvasId 速率限制
 */
import type { Context } from '@deepseek-ai/cordis'

interface AnnotateBody {
  canvasId?: unknown
  revision?: unknown
  targets?: unknown
  note?: unknown
}

interface WebServerLike {
  post?: (path: string, handler: (ctx: { request: { origin?: string; referer?: string; headers: Record<string, unknown> }; body: unknown }) => Promise<{ status: number; body: unknown } | void>) => unknown
}

const RATE_LIMIT_PER_MINUTE = 60

export function setupAnnotateAudit(ctx: Context, opts: { writeLog: (line: string) => void; origin: () => string }): void {
  // 运行时注入（headless 无 webServer 时静默跳过——标注功能不受影响）
  const injectFn = (ctx as unknown as { inject?: (names: string[], fn: (ws: WebServerLike | undefined) => void) => void }).inject
  if (typeof injectFn !== 'function') return
  ctx.effect(() => {
    let disposed = false
    injectFn.call(ctx, ['webServer'], (ws: WebServerLike | undefined) => {
      if (disposed || ws === undefined || typeof ws.post !== 'function') return
      const hits = new Map<string, number[]>()
      const rateLimited = (key: string): boolean => {
        const now = Date.now()
        const window = (hits.get(key) ?? []).filter(t => now - t < 60_000)
        if (window.length >= RATE_LIMIT_PER_MINUTE) return true
        window.push(now)
        hits.set(key, window)
        return false
      }
      ws.post('/qoder-canvas/annotate', async (req) => {
        const origin = req.request.origin ?? ''
        const referer = req.request.referer ?? ''
        const allowed = origin === opts.origin() || (origin.length === 0 && (referer.startsWith(opts.origin()) || referer.length === 0))
        if (!allowed) return { status: 403, body: { error: 'forbidden origin' } }
        const body = req.body as AnnotateBody
        // schema 硬校验
        if (typeof body?.canvasId !== 'string' || !/^cv_[a-z0-9]{8}$/.test(body.canvasId)
          || typeof body?.note !== 'string' || body.note.length === 0 || body.note.length > 2000
          || !Array.isArray(body?.targets) || body.targets.length > 32
          || !body.targets.every(t => typeof t === 'string' && t.length <= 32)) {
          return { status: 400, body: { error: 'invalid annotation payload' } }
        }
        if (rateLimited(body.canvasId)) return { status: 429, body: { error: 'rate limited' } }
        const line = JSON.stringify({ at: new Date().toISOString(), canvasId: body.canvasId, revision: typeof body.revision === 'number' ? body.revision : null, targets: body.targets, note: body.note })
        try { opts.writeLog(line) } catch { /* 审计尽力而为 */ }
        return { status: 200, body: { ok: true } }
      })
    })
    return () => { disposed = true }
  })
}
