import { describe, expect, it } from 'vitest'
import type { WidgetDataBinding } from '../src/contract.ts'
import {
  isErrorData,
  MIN_REFRESH_INTERVAL_MS,
  normalizeRefreshPolicy,
  PANELS_REFRESH_PATH,
  requestWidgetRefresh,
  type RefreshFetchFn,
} from '../src/client/refresh.ts'

const apiBinding: WidgetDataBinding = {
  source: { type: 'api', url: 'https://api.example.com/metrics' },
}

describe('isErrorData（§10 失败快照判定）', () => {
  it('{ __error: string } → true', () => {
    expect(isErrorData({ __error: 'boom' })).toBe(true)
    expect(isErrorData({ __error: 'boom', other: 1 })).toBe(true)
  })

  it('正常数据形态 → false', () => {
    expect(isErrorData(undefined)).toBe(false)
    expect(isErrorData(null)).toBe(false)
    expect(isErrorData(42)).toBe(false)
    expect(isErrorData('__error')).toBe(false)
    expect(isErrorData([1, 2])).toBe(false)
    expect(isErrorData({ total: 1 })).toBe(false)
  })

  it('__error 非字符串按成功数据处理（datasource 保留键约定）', () => {
    expect(isErrorData({ __error: 500 })).toBe(false)
    expect(isErrorData({ __error: null })).toBe(false)
    expect(isErrorData({ __error: undefined })).toBe(false)
  })

  it('原型链上的 __error 不算（hasOwnProperty 防护）', () => {
    const inherited = Object.create({ __error: 'proto' }) as unknown
    expect(isErrorData(inherited)).toBe(false)
  })
})

describe('normalizeRefreshPolicy（§10 RefreshPolicy 归一化）', () => {
  it('非 api 数据源：一切刷新关闭', () => {
    expect(normalizeRefreshPolicy({ onLoad: true, manual: true, intervalMs: 60_000 }, false)).toEqual({
      onLoad: false,
      manual: false,
    })
  })

  it('缺省：onLoad/manual 默认 true，无定时', () => {
    expect(normalizeRefreshPolicy(undefined, true)).toEqual({ onLoad: true, manual: true })
  })

  it('显式 false 覆盖默认值', () => {
    expect(normalizeRefreshPolicy({ onLoad: false, manual: false }, true)).toEqual({ onLoad: false, manual: false })
  })

  it('intervalMs ≥ 10_000 保留', () => {
    expect(normalizeRefreshPolicy({ intervalMs: MIN_REFRESH_INTERVAL_MS }, true).intervalMs).toBe(10_000)
    expect(normalizeRefreshPolicy({ intervalMs: 60_000 }, true).intervalMs).toBe(60_000)
  })

  it('intervalMs < 10_000 / 非法值视为无定时', () => {
    expect(normalizeRefreshPolicy({ intervalMs: 9_999 }, true).intervalMs).toBeUndefined()
    expect(normalizeRefreshPolicy({ intervalMs: Number.NaN }, true).intervalMs).toBeUndefined()
  })
})

describe('requestWidgetRefresh（client 刷新通道）', () => {
  it('POST /openloop/panels/refresh，body 为 { widgetId, data }', async () => {
    let seen: { url: string; body: string } | undefined
    const fetchFn: RefreshFetchFn = async (url, init) => {
      seen = { url, body: init.body }
      return { ok: true, status: 200, json: async () => ({ ok: true, data: { total: 1 } }) }
    }
    const outcome = await requestWidgetRefresh('w-1', apiBinding, fetchFn)
    expect(outcome).toEqual({ ok: true, data: { total: 1 } })
    expect(seen?.url).toBe(PANELS_REFRESH_PATH)
    expect(JSON.parse(seen?.body ?? '')).toEqual({ widgetId: 'w-1', data: apiBinding })
  })

  it('200 { ok: false, error } → 业务失败透传', async () => {
    const fetchFn: RefreshFetchFn = async () => ({ ok: true, status: 200, json: async () => ({ ok: false, error: 'upstream down' }) })
    expect(await requestWidgetRefresh('w-1', apiBinding, fetchFn)).toEqual({ ok: false, error: 'upstream down' })
  })

  it('HTTP 400 携 error 字段 → 透传 error', async () => {
    const fetchFn: RefreshFetchFn = async () => ({ ok: false, status: 400, json: async () => ({ ok: false, error: 'bad binding' }) })
    expect(await requestWidgetRefresh('w-1', apiBinding, fetchFn)).toEqual({ ok: false, error: 'bad binding' })
  })

  it('HTTP 非 2xx 无 error 字段 → 状态码兜底', async () => {
    const fetchFn: RefreshFetchFn = async () => ({ ok: false, status: 405, json: async () => ({}) })
    const outcome = await requestWidgetRefresh('w-1', apiBinding, fetchFn)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toMatch(/405/)
  })

  it('非 JSON 响应 → 失败', async () => {
    const fetchFn: RefreshFetchFn = async () => ({
      ok: true,
      status: 200,
      json: async () => Promise.reject(new Error('invalid json')),
    })
    const outcome = await requestWidgetRefresh('w-1', apiBinding, fetchFn)
    expect(outcome.ok).toBe(false)
  })

  it('网络错误 → 失败（不抛）', async () => {
    const fetchFn: RefreshFetchFn = async () => Promise.reject(new Error('connection refused'))
    const outcome = await requestWidgetRefresh('w-1', apiBinding, fetchFn)
    expect(outcome.ok).toBe(false)
    if (!outcome.ok) expect(outcome.error).toMatch(/connection refused/)
  })

  it('200 但载荷形态异常 → 失败', async () => {
    const fetchFn: RefreshFetchFn = async () => ({ ok: true, status: 200, json: async () => ['unexpected'] })
    const outcome = await requestWidgetRefresh('w-1', apiBinding, fetchFn)
    expect(outcome.ok).toBe(false)
  })
})
