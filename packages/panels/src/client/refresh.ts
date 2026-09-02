/**
 * client 侧刷新通道与错误数据判定（§10 数据对接）。
 *
 * - `isErrorData`：判定 resolved[widgetId] 是否为 `{ __error: string }` 失败快照
 *   （server datasource 失败语义约定；`__error` 为保留键）。
 * - `normalizeRefreshPolicy`：RefreshPolicy 归一化（onLoad/manual 缺省 true；
 *   intervalMs 最小 10_000，低于此值视为无定时；非 api 数据源不启用任何刷新）。
 * - `requestWidgetRefresh`：POST /openloop/panels/refresh（server src/refresh.ts），
 *   成功 → { ok: true, data }；HTTP 非 2xx / 业务失败 / 网络错误 → { ok: false, error }。
 *
 * 类型刻意不依赖 DOM（结构类型描述 fetch），保证该文件可被纯 Node 单测直接 import
 * （同 bridge.ts 约定；tests 在 server tsconfig 下 typecheck，无 dom lib）。
 */
import type { RefreshPolicy, WidgetDataBinding } from '../contract.ts'

/** 与 server src/refresh.ts 的 PANELS_REFRESH_ROUTE 一致（client 同源相对路径） */
export const PANELS_REFRESH_PATH = '/openloop/panels/refresh'

/** §10：intervalMs 最小 10s（server validation 已 fail-closed，client 归一化属纵深防御） */
export const MIN_REFRESH_INTERVAL_MS = 10_000

/**
 * 判定数据快照是否为失败形态 `{ __error: string }`（§10 失败语义）。
 * 仅 hasOwnProperty + 字符串类型判定；数组/null/非对象/`__error` 非字符串一律 false
 * （datasource 约定：widget 数据含同名键但非字符串时按成功数据处理）。
 */
export function isErrorData(value: unknown): value is { __error: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.prototype.hasOwnProperty.call(record, '__error') && typeof record.__error === 'string'
}

/** RefreshPolicy 归一化结果（非 api 数据源恒全关） */
export interface NormalizedRefreshPolicy {
  /** 面板打开时重新拉取（§10，缺省 true） */
  onLoad: boolean
  /** 渲染手动刷新按钮（缺省 true，有 api 数据时） */
  manual: boolean
  /** 定时刷新间隔；< 10_000 或非有限数视为无定时 */
  intervalMs?: number
}

/** 归一化 RefreshPolicy（§10）；hasApiData=false 时一切刷新关闭 */
export function normalizeRefreshPolicy(policy: RefreshPolicy | undefined, hasApiData: boolean): NormalizedRefreshPolicy {
  if (!hasApiData) return { onLoad: false, manual: false }
  const raw = policy?.intervalMs
  const intervalMs = typeof raw === 'number' && Number.isFinite(raw) && raw >= MIN_REFRESH_INTERVAL_MS ? raw : undefined
  return {
    onLoad: policy?.onLoad ?? true,
    manual: policy?.manual ?? true,
    ...(intervalMs !== undefined ? { intervalMs } : {}),
  }
}

/** 刷新结果（与 server RefreshPayload 同构，client 侧消费形态） */
export type RefreshOutcome = { ok: true; data: unknown } | { ok: false; error: string }

/** 结构类型描述 fetch 响应（避免 DOM Response 依赖） */
export interface RefreshFetchResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

/** 结构类型描述 fetch（注入 seam：测试传 mock，不真联网） */
export type RefreshFetchFn = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string },
) => Promise<RefreshFetchResponse>

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** 从响应载荷提取 error 字段（非字符串返回 undefined） */
function payloadError(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null) return undefined
  const error = (payload as Record<string, unknown>).error
  return typeof error === 'string' ? error : undefined
}

/**
 * 调用刷新通道重新解析单个 widget 的 api 数据（§10）。
 * 成功 → { ok: true, data }；任何失败（网络/非 JSON 响应/HTTP 非 2xx/业务 ok:false）
 * → { ok: false, error }，由调用方按 §10 失败语义处理（保留旧快照 + stale / 错误占位）。
 * params（联动 v1）：关联事件映射来的参数值，server 侧替换 binding 的 {{param}} 模板。
 */
export async function requestWidgetRefresh(
  widgetId: string,
  binding: WidgetDataBinding,
  fetchFn?: RefreshFetchFn,
  params?: Record<string, unknown>,
): Promise<RefreshOutcome> {
  const doFetch: RefreshFetchFn = fetchFn ?? (fetch as unknown as RefreshFetchFn)
  let response: RefreshFetchResponse
  try {
    response = await doFetch(PANELS_REFRESH_PATH, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ widgetId, data: binding, ...(params !== undefined ? { params } : {}) }),
    })
  } catch (error) {
    return { ok: false, error: `refresh request failed: ${errorMessage(error)}` }
  }
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return { ok: false, error: `refresh route response (HTTP ${response.status}) is not valid JSON` }
  }
  if (!response.ok) {
    return { ok: false, error: payloadError(payload) ?? `refresh route returned HTTP ${response.status}` }
  }
  if (typeof payload === 'object' && payload !== null && (payload as Record<string, unknown>).ok === true) {
    return { ok: true, data: (payload as Record<string, unknown>).data }
  }
  return { ok: false, error: payloadError(payload) ?? 'refresh route returned an unexpected payload' }
}
