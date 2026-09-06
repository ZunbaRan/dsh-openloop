/**
 * 标注审计端点（M2 T2.5 → M4 重写：适配 0.1.2 webServer API）。
 *
 * 职责边界：仅记审计日志（尽力而为）——注入编排全在 client，本端点零副作用。
 * 端点纪律（panels 0.1.7 事故教训 + 评审核对结论）：
 * - ctx.effect 包裹拿 disposer
 * - webServer 不入静态 inject（headless 无 HTTP 服务会炸插件）——运行时嵌套注入
 * - Origin/Referer 同源校验 + body schema 硬校验 + 每 canvasId 速率限制
 * - 0.1.2 API：ws.register({kind, path, handler}) 原生 Node handler（同 read.ts）
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'

interface AnnotateBody {
  canvasId?: unknown
  revision?: unknown
  targets?: unknown
  note?: unknown
}

interface WebServerLike {
  register?: (route: { kind: 'exact' | 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }) => () => void
}

const RATE_LIMIT_PER_MINUTE = 60

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

export function setupAnnotateAudit(ctx: Context, opts: { origin: () => string; writeLog: (line: string) => void }): void {
  // 运行时注入（headless 无 webServer 时静默跳过——标注功能不受影响）
  const injectFn = (ctx as unknown as { inject?: (names: string[], fn: (ws: WebServerLike | undefined) => void) => void }).inject
  if (typeof injectFn !== 'function') return
  ctx.effect(() => {
    let disposed = false
    injectFn.call(ctx, ['webServer'], (routeCtx: unknown) => {
      // 回调参数是 ctx，服务挂属性上（app 包先例；直接当服务用是 0.1.1 旧形态）
      const ws = (routeCtx as { webServer?: WebServerLike } | undefined)?.webServer
      if (disposed || ws === undefined || typeof ws.register !== 'function') return
      const hits = new Map<string, number[]>()
      const rateLimited = (key: string): boolean => {
        const now = Date.now()
        const window = (hits.get(key) ?? []).filter(t => now - t < 60_000)
        if (window.length >= RATE_LIMIT_PER_MINUTE) return true
        window.push(now)
        hits.set(key, window)
        return false
      }
      ws.register({
        kind: 'exact',
        path: '/qoder-canvas/annotate',
        handler: async (req, res) => {
          // 同源校验（read.ts 同款：动态 host 对比，POST 无 origin 拒绝）
          const h = (k: string): string => {
            const v = req.headers[k]
            return typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? '') : ''
          }
          const origin = h('origin')
          const host = h('host')
          let allowed = false
          if (origin.length > 0) {
            try { allowed = new URL(origin).host === host } catch { allowed = false }
          }
          if (!allowed) { json(res, 403, { error: 'forbidden origin' }); return }
          let body: AnnotateBody | null = null
          try {
            body = JSON.parse(await readBody(req)) as AnnotateBody
          } catch {
            json(res, 400, { error: 'invalid json body' })
            return
          }
          // schema 硬校验
          if (typeof body?.canvasId !== 'string' || !/^cv_[a-z0-9]{8}$/.test(body.canvasId)
            || typeof body?.note !== 'string' || body.note.length === 0 || body.note.length > 2000
            || !Array.isArray(body?.targets) || body.targets.length > 32
            || !body.targets.every(t => typeof t === 'string' && t.length <= 32)) {
            json(res, 400, { error: 'invalid annotation payload' })
            return
          }
          if (rateLimited(body.canvasId)) { json(res, 429, { error: 'rate limited' }); return }
          const line = JSON.stringify({ at: new Date().toISOString(), canvasId: body.canvasId, revision: typeof body.revision === 'number' ? body.revision : null, targets: body.targets, note: body.note })
          try { opts.writeLog(line) } catch { /* 审计尽力而为 */ }
          json(res, 200, { ok: true })
        },
      })
    })
    return () => { disposed = true }
  })
}
