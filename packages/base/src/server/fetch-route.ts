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
    const data = await safeFetchJson(url, { ...(timeoutMs !== undefined ? { timeoutMs } : {}), ...(options.allowedOrigins ? { allowedOrigins: options.allowedOrigins } : {}) })
    res.statusCode = 200
    res.end(JSON.stringify({ ok: true, status: 200, data }))
  } catch (error) {
    // 业务错误 200 + ok:false（客户端便于区分网络失败与业务失败）
    res.statusCode = 200
    res.end(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }))
  }
}
