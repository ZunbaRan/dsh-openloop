/**
 * §10 数据对接（server 侧）。
 *
 * api source 一律由 server 模块用 Node fetch 解析（§5.2 数据流铁律），
 * 结果写入 PanelMeta.resolved[widgetId] 经 props / 沙箱桥注入 widget。
 *
 * 限额（§15 S9）：timeout 默认 10s / 上限 30s；响应体 ≤ 1MB；仅接受 JSON
 * （content-type 含 json 或体可 JSON.parse）。
 *
 * 失败语义约定（渲染端据此处理，§10「失败语义」）：
 * - resolved[widgetId] 为对象且含字符串字段 `__error` → 该项数据解析失败，
 *   渲染端应渲染错误占位（manual 刷新可用时附重试按钮）；有旧数据时保留旧快照 + stale 标记。
 * - 其余任意值为解析结果（`__error` 为保留键，widget 数据含同名键时渲染端按成功数据处理）。
 * - 单格失败不拖垮面板：resolvePanelData 以 Promise.allSettled 并行，个别失败仅写入该格。
 *
 * 纯函数（可独立测试）：parsePickPath / pickValue / normalizeTimeoutMs /
 * looksLikeJsonContentType / parseJsonResponse / readBodyBytes / buildApiUrl / validateApiUrl。
 */
import type { PanelDefinition, WidgetDataBinding } from './contract.ts'
import { recordApiUsage } from './api-usage-bridge.ts'
import { isForbiddenApiUrl } from './validation.ts'

/*
 * 传输层原子能力已抽离至 @openloop/dsh-base/server（base 重构 2026-08-22），
 * re-export 保持 panels 既有 API（测试引用）不变。
 */
import {
  normalizeTimeoutMs, looksLikeJsonContentType, parseJsonResponse, readBodyBytes,
} from '@openloop/dsh-base/server'

export { normalizeTimeoutMs, looksLikeJsonContentType, parseJsonResponse, readBodyBytes }

/** 响应体大小上限（§15 S9：1MB） */
export const MAX_RESPONSE_BYTES = 1024 * 1024

/** 超时默认值 / 上限（§5.2：默认 10_000，上限 30_000） */
export const DEFAULT_TIMEOUT_MS = 10_000
export const MAX_TIMEOUT_MS = 30_000

/** 注入 seam：测试注入 mock fetch；真机缺省用全局 fetch */
export interface ResolveWidgetDataContext {
  fetchFn?: typeof fetch
  /** 调用方中止信号（如 tool execute 的 exec.signal）；触发即中止本次请求 */
  signal?: AbortSignal
}

// ---------------------------------------------------------------------------
// 纯函数
// ---------------------------------------------------------------------------

/**
 * 解析 pick 路径（v1：仅 a.b[0].c 形态）：`a.b[0].c` → ['a', 'b', 0, 'c']。
 * 裸数字段转 number（数组索引），其余为字符串键。
 */
export function parsePickPath(pick: string): Array<string | number> {
  const segments: Array<string | number> = []
  const pattern = /[^.\[\]]+/g
  let match: RegExpExecArray | null
  while ((match = pattern.exec(pick)) !== null) {
    const raw = match[0]
    segments.push(/^\d+$/.test(raw) ? Number(raw) : raw)
  }
  return segments
}

/**
 * 按 pick 路径取值；缺路径/路径不存在返回 undefined（不抛错）。
 * 段访问用 hasOwnProperty 防护，避免命中原型链（JSON.parse 产物亦安全）。
 */
export function pickValue(data: unknown, pick?: string): unknown {
  if (!pick || pick.trim() === '') return data
  let cursor: unknown = data
  for (const segment of parsePickPath(pick)) {
    if (typeof cursor !== 'object' || cursor === null) return undefined
    if (typeof segment === 'number') {
      if (!Array.isArray(cursor)) return undefined
      cursor = cursor[segment]
    } else {
      const record = cursor as Record<string, unknown>
      if (!Object.prototype.hasOwnProperty.call(record, segment)) return undefined
      cursor = record[segment]
    }
  }
  return cursor
}




/** 拼接 query 参数到 api url（原 url 已有 query 时合并） */
export function buildApiUrl(url: string, query?: Record<string, string>): string {
  if (!query) return url
  const parsed = new URL(url)
  for (const [key, value] of Object.entries(query)) {
    parsed.searchParams.append(key, value)
  }
  return parsed.toString()
}

/**
 * api source URL 校验（§5.4 / §15 S3，fail-closed）：
 * 必须 https://，且不指向环回/内网。复用 validation.ts 的 isForbiddenApiUrl。
 */
export function validateApiUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`api source URL "${url}" is not a valid URL; pass an absolute https:// URL`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`api source URL "${url}" must use https:// (insecure http:// is rejected in v1)`)
  }
  if (isForbiddenApiUrl(url)) {
    throw new Error(`api source URL "${url}" points to a loopback/private address, which is forbidden (SSRF guard); use a public https:// endpoint`)
  }
}

// ---------------------------------------------------------------------------
// 编排函数
// ---------------------------------------------------------------------------

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 超时/外部中止合并 signal；dispose 清理定时器与监听（防长驻进程泄漏） */
function createAbortHandle(timeoutMs: number, external: AbortSignal | undefined): { signal: AbortSignal; dispose(): void } {
  const controller = new AbortController()
  if (external?.aborted) controller.abort()
  const onExternalAbort = () => controller.abort()
  if (external && !external.aborted) external.addEventListener('abort', onExternalAbort, { once: true })
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let disposed = false
  return {
    signal: controller.signal,
    dispose() {
      if (disposed) return
      disposed = true
      clearTimeout(timer)
      if (external) external.removeEventListener('abort', onExternalAbort)
    },
  }
}

/**
 * 解析单个 widget 的数据绑定（§5.2 / §10）。
 * static → 直接返回 value；api → 校验 URL → Node fetch（超时/1MB/仅 JSON）→ pick 取值。
 * 校验失败抛错（消息面向 Agent 可自修正）；网络/解析失败同样抛错，由 resolvePanelData 统一隔离。
 */
export async function resolveWidgetData(binding: WidgetDataBinding, ctx: ResolveWidgetDataContext = {}): Promise<unknown> {
  const source = binding.source
  if (source.type === 'static') return source.value
  if (source.type !== 'api') {
    const actual = (source as { type?: unknown }).type
    throw new Error(`data binding source.type must be "static" or "api"; got ${JSON.stringify(actual)}`)
  }
  validateApiUrl(source.url)
  if (source.headers) {
    for (const key of Object.keys(source.headers)) {
      if (key.toLowerCase() === 'authorization') {
        throw new Error('api source must not pass an Authorization header in plain text; panel datasources are public https-only and must not send credentials through DSH')
      }
    }
  }

  const timeoutMs = normalizeTimeoutMs(source.timeoutMs)
  const url = buildApiUrl(source.url, source.query)
  const doFetch = ctx.fetchFn ?? fetch
  const abort = createAbortHandle(timeoutMs, ctx.signal)
  // api-usage 埋点（自管理四件套；globalThis 单例，失败静默）
  const startedAt = Date.now()
  const record = (ok: boolean): void => recordApiUsage(source.url, 'panel-binding', ok, Date.now() - startedAt)
  try {
    const init: RequestInit = { method: source.method ?? 'GET', headers: {}, signal: abort.signal }
    if (source.headers) init.headers = { ...source.headers }
    if (source.method === 'POST' && source.body !== undefined) {
      init.body = JSON.stringify(source.body)
      init.headers = { 'content-type': 'application/json', ...(source.headers ?? {}) }
    }

    let response: Response
    try {
      response = await doFetch(url, init)
    } catch (error) {
      record(false)
      if (abort.signal.aborted) {
        throw new Error(`api source timed out after ${timeoutMs}ms: ${url}`)
      }
      throw new Error(`api source fetch failed: ${errorMessage(error)} (${url})`)
    }
    if (!response.ok) {
      record(false)
      const statusText = response.statusText ? ` ${response.statusText}` : ''
      throw new Error(`api source returned HTTP ${response.status}${statusText} for ${url}`)
    }

    const contentType = response.headers.get('content-type')
    const { bytes, truncated } = await readBodyBytes(response.body ?? new ReadableStream<Uint8Array>(), MAX_RESPONSE_BYTES)
    if (truncated) {
      record(false)
      throw new Error(`api source response exceeds the ${MAX_RESPONSE_BYTES} byte limit: ${url}`)
    }
    const text = new TextDecoder().decode(bytes)
    const parsed = parseJsonResponse(contentType, text)
    record(true)
    return binding.pick !== undefined ? pickValue(parsed, binding.pick) : parsed
  } finally {
    abort.dispose()
  }
}

/**
 * 解析面板全部 api widget 数据（§10）：并行 fetch（Promise.allSettled），
 * 单格失败不拖垮整体——成功写入 resolved[widgetId]，失败写入 { __error: message }
 * （约定见文件头注释；渲染端据此渲染错误占位）。
 * 面板无 api widget 时返回空对象（与 §5.3 resolved 缺省语义一致）。
 * ctx 透传给 resolveWidgetData（测试注入 fetchFn / 调用方取消 signal）。
 */
export async function resolvePanelData(panel: PanelDefinition, ctx: ResolveWidgetDataContext = {}): Promise<Record<string, unknown>> {
  const apiWidgets = panel.widgets.filter(
    (widget): widget is (typeof widget & { data: WidgetDataBinding }) => widget.data?.source.type === 'api',
  )
  if (apiWidgets.length === 0) return {}

  const settled = await Promise.allSettled(apiWidgets.map(widget => resolveWidgetData(widget.data, ctx)))
  const resolved: Record<string, unknown> = {}
  apiWidgets.forEach((widget, index) => {
    const result = settled[index]
    if (result?.status === 'fulfilled') {
      resolved[widget.id] = result.value
    } else {
      const reason = result?.status === 'rejected' ? result.reason : undefined
      resolved[widget.id] = { __error: `panel widget "${widget.id}" data resolve failed: ${errorMessage(reason)}` }
    }
  })
  return resolved
}
