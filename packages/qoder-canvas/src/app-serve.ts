/**
 * app-serve：canvas iframe 的壳端点 + app.js 静态资源端点（0.12）。
 *
 * - GET /qoder-canvas/app      → 壳 HTML（挂载点 div + ESM script 引 app.js）
 * - GET /qoder-canvas/app.js   → lib/app.js（tsdown 第三 entry 产物，node 侧读盘）
 *
 * 端点纪律（read.ts 同款）：ctx.effect 包裹 disposer + 运行时注入（headless
 * 静默降级）+ Origin 动态 host 校验。app.js 定位：import.meta.url 同目录
 * （node 侧 lib/app-serve.js 与 lib/app.js 同级）。
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'

interface WebServerLike {
  register?: (route: { kind: 'exact' | 'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void> }) => () => void
}

const SHELL_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: transparent; }
  #openloop-canvas-app-root { min-height: 100vh; }
</style>
</head>
<body>
<div id="openloop-canvas-app-root"></div>
<script>
// 诊断信（0.12 排查期）：模块加载成败/运行时错误回传宿主 console
window.addEventListener('error', function (e) {
  try { parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'error', message: String(e.message || e.error), src: String(e.filename || '') + ':' + e.lineno }, '*') } catch (_) {}
}, true);
window.addEventListener('unhandledrejection', function (e) {
  try { parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'rejection', message: String(e.reason) }, '*') } catch (_) {}
});
try { parent.postMessage({ __openloopCanvasAppDiag: true, kind: 'shell-loaded' }, '*') } catch (_) {}
</script>
<script type="module" src="/qoder-canvas/app.js" onerror="try{parent.postMessage({__openloopCanvasAppDiag:true,kind:'module-error',message:'app.js failed to load (network/CORS)'},'*')}catch(_){}"></script>
</body>
</html>`

/** 定位 lib/app.js（与本文件产物同级；读失败缓存 null 只报一次） */
function locateAppBundle(): string | null {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const p = join(here, 'app.js')
    readFileSync(p) // 探测可读
    return p
  } catch {
    return null
  }
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.setHeader('Content-Type', 'application/json')
  res.statusCode = status
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

export function setupCanvasAppEndpoint(ctx: Context, opts: { origin: () => string }): void {
  const injectFn = (ctx as unknown as { inject?: (names: string[], fn: (ws: WebServerLike | undefined) => void) => void }).inject
  if (typeof injectFn !== 'function') return
  ctx.effect(() => {
    let disposed = false
    injectFn.call(ctx, ['webServer'], (routeCtx: unknown) => {
      const ws = (routeCtx as { webServer?: WebServerLike } | undefined)?.webServer
      if (disposed || ws === undefined || typeof ws.register !== 'function') return
      const allowed = (req: IncomingMessage): boolean => {
        const h = (k: string): string => {
          const v = req.headers[k]
          return typeof v === 'string' ? v : Array.isArray(v) ? (v[0] ?? '') : ''
        }
        const origin = h('origin')
        // 真机教训（0.12 根因）：sandbox iframe（opaque origin）的 Origin 头是
        // 字面量 "null"——new URL('null') 抛错被当 403，app 壳/模块全被拒
        if (origin === 'null' || origin.length === 0) return true
        const host = h('host')
        try { return new URL(origin).host === host } catch { return false }
      }
      // 壳端点
      ws.register({
        kind: 'exact',
        path: '/qoder-canvas/app',
        handler: (req, res) => {
          if (!allowed(req)) { json(res, 403, { error: 'forbidden origin' }); return }
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          res.statusCode = 200
          res.end(SHELL_HTML)
        },
      })
      // app.js 静态端点
      let appJsCache: Buffer | null = null
      let appJsMissing = false
      ws.register({
        kind: 'exact',
        path: '/qoder-canvas/app.js',
        handler: (req, res) => {
          if (!allowed(req)) { json(res, 403, { error: 'forbidden origin' }); return }
          if (appJsCache === null && !appJsMissing) {
            const p = locateAppBundle()
            if (p === null) {
              appJsMissing = true
              ctx.logger?.warn?.('qoder-canvas: lib/app.js not found — canvas iframe app unavailable (rebuild the plugin)')
            } else {
              try { appJsCache = readFileSync(p) } catch { appJsMissing = true }
            }
          }
          if (appJsCache === null) { json(res, 500, { error: 'app bundle missing' }); return }
          res.setHeader('Content-Type', 'text/javascript; charset=utf-8')
          res.setHeader('Cache-Control', 'no-store')
          // 真机教训（0.12）：sandbox iframe（opaque origin）里 <script type="module">
          // 加载是 CORS 模式请求——无此头模块加载被静默阻止（app 永不 ready）
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.statusCode = 200
          res.end(appJsCache)
        },
      })
    })
    return () => { disposed = true }
  })
}
