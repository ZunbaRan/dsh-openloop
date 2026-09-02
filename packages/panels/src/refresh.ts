/**
 * §10 刷新通道（server 侧）：POST /openloop/panels/refresh（exact 路由）。
 *
 * 背景：tool 是一次性调用，server 仅在 execute 时 resolvePanelData 填充
 * PanelMeta.resolved；client 侧 RefreshPolicy（onLoad/intervalMs/manual）的
 * 每次刷新需要一个新通道重新解析 api 数据，即本路由。
 *
 * 契约：
 * - 请求：POST，body JSON `{ widgetId: string, data: WidgetDataBinding }`，≤ 64KB。
 * - 响应：恒 `Content-Type: application/json; charset=utf-8` + `Cache-Control: no-store`。
 *   - 200 `{ ok: true, data }`：解析成功（data 已按 binding.pick 取值）。
 *   - 200 `{ ok: false, error }`：业务失败（网络/超时/非 JSON/超 1MB/上游非 2xx），
 *     不抛 500——client 据此走 §10 失败语义（保留旧快照 + stale / 错误占位）。
 *   - 400 `{ ok: false, error }`：请求体形状非法 / 非 api source / URL 校验失败
 *     （§5.4 fail-closed，复用 datasource.validateApiUrl → validation.isForbiddenApiUrl）。
 *   - 405 / 413：非 POST / 超 64KB。
 *
 * 注册必须包在 ctx.effect 里做生命周期回收（IMPL_NOTES §1.4，同 PanelsAssets）；
 * (kind, path) 唯一，重复注册由 webServer 抛错（组合级契约）。
 *
 * 纯函数（可独立测试）：parseRefreshBody / readRequestBody / handleRefreshRequest。
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import type { WidgetDataBinding } from './contract.ts'
import { resolveWidgetData, validateApiUrl, applyBindingParams, type ResolveWidgetDataContext } from './datasource.ts'

/** §10 刷新路由：绝对路径、无尾部斜杠（IMPL_NOTES §1.1 path 契约） */
export const PANELS_REFRESH_ROUTE = '/openloop/panels/refresh'

/** 请求体大小上限：绑定描述本就很小，64KB 足够且阻断滥用 */
export const MAX_REFRESH_BODY_BYTES = 64 * 1024

/** 成功载荷（200） */
export interface RefreshSuccessPayload {
  ok: true
  data: unknown
}

/** 失败载荷（200 业务失败 / 4xx 请求非法共用） */
export interface RefreshErrorPayload {
  ok: false
  error: string
}

export type RefreshPayload = RefreshSuccessPayload | RefreshErrorPayload

/** handleRefreshRequest 的返回：HTTP 状态 + JSON 载荷 */
export interface RefreshHandleResult {
  status: number
  payload: RefreshPayload
}

/** 请求非法（4xx）专用错误；status 默认 400，413 用于超限 */
export class RefreshRequestError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'RefreshRequestError'
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * 解析并校验刷新请求体（fail-closed）：
 * `{ widgetId: kebab-case, data: WidgetDataBinding, params?: Record<string, unknown> }`
 * 且 data.source.type 必须为 'api'（static 数据随 props 下发，没有刷新通道的
 * 意义；非 api 一律 400）。params 为联动参数（2026-09-02 v1）：值经
 * applyBindingParams 替换 binding 的 `{{param}}` 模板。
 */
export function parseRefreshBody(text: string): { widgetId: string; data: WidgetDataBinding; params?: Record<string, unknown> | undefined } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new RefreshRequestError('refresh request body must be valid JSON: {"widgetId": string, "data": WidgetDataBinding}')
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new RefreshRequestError('refresh request body must be a JSON object: {"widgetId": string, "data": WidgetDataBinding}')
  }
  const record = parsed as Record<string, unknown>
  const widgetId = record.widgetId
  if (typeof widgetId !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(widgetId)) {
    throw new RefreshRequestError('refresh request widgetId must be a kebab-case string matching the target widget id')
  }
  const data = record.data
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new RefreshRequestError(`refresh request data binding for widget "${widgetId}" must be an object`)
  }
  const source = (data as Record<string, unknown>).source
  if (typeof source !== 'object' || source === null || Array.isArray(source)) {
    throw new RefreshRequestError(`refresh request data binding for widget "${widgetId}" requires a source object`)
  }
  const sourceType = (source as Record<string, unknown>).type
  if (sourceType !== 'api') {
    throw new RefreshRequestError(`refresh request for widget "${widgetId}" only supports api data sources; got ${JSON.stringify(sourceType)}`)
  }
  let params: Record<string, unknown> | undefined
  if (record.params !== undefined) {
    if (typeof record.params !== 'object' || record.params === null || Array.isArray(record.params)) {
      throw new RefreshRequestError(`refresh request params for widget "${widgetId}" must be an object of parameter values`)
    }
    params = record.params as Record<string, unknown>
  }
  return { widgetId, data: data as WidgetDataBinding, params }
}

/** 流式读取请求体，超过 maxBytes 立即中止并抛 413（不缓冲超限数据） */
export async function readRequestBody(req: IncomingMessage, maxBytes = MAX_REFRESH_BODY_BYTES): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    total += buffer.byteLength
    if (total > maxBytes) {
      req.destroy()
      throw new RefreshRequestError(`refresh request body exceeds the ${maxBytes} byte limit`, 413)
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks).toString('utf8')
}

/**
 * 刷新请求纯逻辑（可独立测试）：
 * parseRefreshBody（形状/非 api → 400）→ URL/凭据校验（§5.4 fail-closed → 400）
 * → resolveWidgetData（成功 200 ok:true；业务失败 200 ok:false）。
 * ctx 透传 fetchFn/signal 注入 seam（测试不真联网）。
 */
export async function handleRefreshRequest(bodyText: string, ctx: ResolveWidgetDataContext = {}): Promise<RefreshHandleResult> {
  const { widgetId, data, params } = parseRefreshBody(bodyText)
  // 联动参数（v1）：binding 声明了 params 模板时替换（未提供值的变量 → 空串）
  const binding = params !== undefined ? applyBindingParams(data, params) : data
  const source = binding.source as Extract<WidgetDataBinding['source'], { type: 'api' }> & { credentialRef?: unknown }
  // §5.4 / §15 S3：URL 必须 https:// 且不指向环回/内网；请求级校验失败属 400（非业务失败）
  if (source.credentialRef !== undefined) {
    throw new RefreshRequestError('api source credentialRef is a v2 feature and is not supported in v1')
  }
  try {
    validateApiUrl(source.url)
  } catch (error) {
    throw new RefreshRequestError(errorMessage(error))
  }
  if (source.headers) {
    for (const key of Object.keys(source.headers)) {
      if (key.toLowerCase() === 'authorization') {
        throw new RefreshRequestError('api source must not pass an Authorization header in plain text; v2 credentialRef will cover this')
      }
    }
  }
  try {
    const resolved = await resolveWidgetData(binding, ctx)
    return { status: 200, payload: { ok: true, data: resolved } }
  } catch (error) {
    // 业务失败（网络/超时/非 JSON/超限/上游非 2xx）：200 ok:false，client 走 §10 失败语义
    return { status: 200, payload: { ok: false, error: `panel widget "${widgetId}" refresh failed: ${errorMessage(error)}` } }
  }
}

/** §10 刷新路由注册（写法参照 assets.ts 的 PanelsAssets） */
export class PanelsRefreshRoute {
  constructor(
    private readonly webServer: WebServer,
    private readonly resolveContext: ResolveWidgetDataContext = {},
  ) {}

  register(ctx: Context): void {
    ctx.effect(
      () =>
        this.webServer.register({
          kind: 'exact',
          path: PANELS_REFRESH_ROUTE,
          handler: (req, res) => this.handle(req, res),
        }),
      'openloop-panels: refresh route',
    )
  }

  private send(res: ServerResponse, status: number, payload: RefreshPayload): void {
    const body = JSON.stringify(payload)
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Content-Length', String(Buffer.byteLength(body)))
    res.end(body)
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      this.send(res, 405, { ok: false, error: 'method not allowed; use POST with a JSON body' })
      return
    }
    try {
      const bodyText = await readRequestBody(req)
      const result = await handleRefreshRequest(bodyText, this.resolveContext)
      this.send(res, result.status, result.payload)
    } catch (error) {
      if (error instanceof RefreshRequestError) {
        this.send(res, error.status, { ok: false, error: error.message })
        return
      }
      this.send(res, 500, { ok: false, error: `refresh route internal error: ${errorMessage(error)}` })
    }
  }
}
