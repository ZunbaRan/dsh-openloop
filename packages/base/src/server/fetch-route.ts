/**
 * OpenLoop base · 宿主 fetch 代理路由（POST /openloop/base/fetch）。
 *
 * artifact v2 的 openloop.fetch 桥、未来 show-widget 数据通道等共用：
 * iframe 内代码断网（CSP connect-src 'none'），联网全部经本路由在服务端
 * 执行（Node fetch 无 CORS），SSRF 校验/超时/1MB/JSON-only 语义由
 * safeFetchJson 统一承担；本机源经部署级 allowLoopbackOrigins 白名单放行。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { safeFetchJson, normalizeTimeoutMs } from './net.ts'

export const BASE_FETCH_ROUTE = '/openloop/base/fetch'
const MAX_BODY_BYTES = 8 * 1024

/**
 * 解析同源相对路径：url 以 '/' 开头即相对——只能指向当前所在 server（无法指到
 * 内网其他地址，SSRF 面为零），用请求的 Host 头补全成绝对 URL 以便 Node fetch 使用。
 * host 缺失/非法时原样返回（后续 safeFetchJson 会以绝对性校验兜底拒绝）。
 */
export function resolveFetchTarget(url: string, host: unknown): string {
  if (!url.startsWith('/') || typeof host !== 'string' || host.length === 0) return url
  try {
    return new URL(url, `http://${host}`).href
  } catch {
    return url
  }
}

/**
 * 自身 origin 白名单：把请求的 Host 头对应的 http origin 并入 allowedOrigins，
 * 使同源相对路径请求跳过 https-only/SSRF 静态校验（自身 server 的来源天然可信）。
 * 外部 https 端点仍走原 SSRF 防护，不受影响。
 */
export function ownOriginAllowlist(host: unknown, allowedOrigins: readonly string[] = []): readonly string[] {
  if (typeof host !== 'string' || host.length === 0) return allowedOrigins
  try {
    const origin = new URL(`http://${host}`).origin
    return [...allowedOrigins, origin]
  } catch {
    return allowedOrigins
  }
}

export interface BaseFetchRouteOptions {
  /** 部署级本机源白名单（如 'http://127.0.0.1:9090'）；命中即跳过 https/SSRF 拒绝 */
  allowedOrigins?: readonly string[]
}

/** 请求体解析（限 8KB；仅 {url, timeoutMs?} 形态） */
export function parseFetchRequestBody(raw: string): { url: string; timeoutMs?: number } {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('request body must be JSON')
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('request body must be a JSON object')
  const record = parsed as Record<string, unknown>
  if (typeof record.url !== 'string' || record.url.length === 0) throw new Error('request body requires a non-empty "url" string')
  const timeoutMs = record.timeoutMs === undefined ? undefined : normalizeTimeoutMs(Number(record.timeoutMs))
  return { url: record.url, ...(timeoutMs !== undefined ? { timeoutMs } : {}) }
}

/** 路由注册（ctx.effect 生命周期回收由调用方包裹） */
/** 返回路由 disposer（供 ctx.effect 生命周期回收） */
export function registerBaseFetchRoute(_ctx: Context, webServer: WebServer, options: BaseFetchRouteOptions = {}): () => void {
  return webServer.register({
    kind: 'exact',
    path: BASE_FETCH_ROUTE,
    handler: (req: IncomingMessage, res: ServerResponse) => {
      void handle(req, res, options)
    },
  })
}

async function handle(req: IncomingMessage, res: ServerResponse, options: BaseFetchRouteOptions): Promise<void> {
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end(JSON.stringify({ ok: false, error: 'POST only' }))
    return
  }
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    total += (chunk as Buffer).byteLength
    if (total > MAX_BODY_BYTES) {
      res.statusCode = 413
      res.end(JSON.stringify({ ok: false, error: 'request body too large' }))
      return
    }
    chunks.push(chunk as Buffer)
  }
  try {
    const { url, timeoutMs } = parseFetchRequestBody(Buffer.concat(chunks).toString('utf8'))
    // 同源相对路径（url 以 '/' 开头）补全为绝对 URL，并把自身 origin 并入白名单：
    // 内置 artifact 组件调自家 /openloop/app/* 时不再被 SSRF/https-only 静态校验拒绝。
    const target = resolveFetchTarget(url, req.headers.host)
    const allowedOrigins = ownOriginAllowlist(req.headers.host, options.allowedOrigins)
    const data = await safeFetchJson(target, {
      ...(timeoutMs !== undefined ? { timeoutMs } : {}),
      ...(allowedOrigins.length > 0 ? { allowedOrigins } : {}),
    })
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true, status: 200, data }))
  } catch (error) {
    // 业务错误 200 + ok:false（客户端便于区分网络失败与业务失败）
    res.statusCode = 200
    res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  }
}
