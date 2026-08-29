import { Readable } from 'node:stream'
import type { IncomingMessage } from 'node:http'
import { describe, expect, it } from 'vitest'
import type { WidgetDataBinding } from '../src/contract.ts'
import {
  handleRefreshRequest,
  MAX_REFRESH_BODY_BYTES,
  PANELS_REFRESH_ROUTE,
  parseRefreshBody,
  readRequestBody,
  RefreshRequestError,
} from '../src/refresh.ts'

// ---------------------------------------------------------------------------
// mock fetch helpers（注入 fetchFn，不真联网；与 tests/datasource.spec.ts 同手法）
// ---------------------------------------------------------------------------

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close() } })
}

function mockResponse(init: { status?: number; statusText?: string; contentType?: string; body?: string }): Response {
  const headers = new Headers()
  if (init.contentType !== undefined) headers.set('content-type', init.contentType)
  const status = init.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? '',
    headers,
    body: streamFrom(init.body ?? ''),
  } as unknown as Response
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  const fn = async (url: string, init?: RequestInit): Promise<Response> => {
    const result = handler(url, init)
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
      Promise.resolve(result).then(resolve, reject)
    })
  }
  return fn as unknown as typeof fetch
}

const apiBinding: WidgetDataBinding = {
  source: { type: 'api', url: 'https://api.example.com/metrics' },
}

function bodyOf(value: unknown): string {
  return JSON.stringify(value)
}

function fakeRequest(...chunks: string[]): IncomingMessage {
  return Readable.from(chunks.map(chunk => Buffer.from(chunk, 'utf8'))) as unknown as IncomingMessage
}

describe('PANELS_REFRESH_ROUTE', () => {
  it('exact 路由路径契约', () => {
    expect(PANELS_REFRESH_ROUTE).toBe('/openloop/panels/refresh')
  })
})

describe('parseRefreshBody', () => {
  it('合法 api 绑定解析通过', () => {
    const parsed = parseRefreshBody(bodyOf({ widgetId: 'w-1', data: apiBinding }))
    expect(parsed.widgetId).toBe('w-1')
    expect(parsed.data).toEqual(apiBinding)
  })

  it('非 JSON / 非对象 → 400', () => {
    expect(() => parseRefreshBody('not json')).toThrowError(RefreshRequestError)
    expect(() => parseRefreshBody('"just a string"')).toThrowError(RefreshRequestError)
    expect(() => parseRefreshBody('[1,2]')).toThrowError(RefreshRequestError)
    try {
      parseRefreshBody('not json')
    } catch (error) {
      expect((error as RefreshRequestError).status).toBe(400)
    }
  })

  it('widgetId 缺失/非 kebab-case → 400', () => {
    expect(() => parseRefreshBody(bodyOf({ data: apiBinding }))).toThrowError(RefreshRequestError)
    expect(() => parseRefreshBody(bodyOf({ widgetId: 'Bad_Id', data: apiBinding }))).toThrowError(RefreshRequestError)
  })

  it('非 api source（static）→ 400', () => {
    const binding = { source: { type: 'static', value: 1 } }
    expect(() => parseRefreshBody(bodyOf({ widgetId: 'w-1', data: binding }))).toThrowError(/only supports api data sources/)
  })

  it('data 缺失/缺 source → 400', () => {
    expect(() => parseRefreshBody(bodyOf({ widgetId: 'w-1' }))).toThrowError(RefreshRequestError)
    expect(() => parseRefreshBody(bodyOf({ widgetId: 'w-1', data: {} }))).toThrowError(RefreshRequestError)
  })
})

describe('readRequestBody', () => {
  it('限制内读取完整 body', async () => {
    const text = await readRequestBody(fakeRequest('{"a":', '1}'))
    expect(text).toBe('{"a":1}')
  })

  it('超 64KB → 413', async () => {
    const oversized = 'x'.repeat(MAX_REFRESH_BODY_BYTES + 1)
    await expect(readRequestBody(fakeRequest(oversized))).rejects.toMatchObject({ status: 413 })
  })

  it('恰好 64KB 放行', async () => {
    const exact = 'x'.repeat(MAX_REFRESH_BODY_BYTES)
    await expect(readRequestBody(fakeRequest(exact))).resolves.toBe(exact)
  })
})

describe('handleRefreshRequest', () => {
  it('成功：200 { ok: true, data }，pick 取值生效', async () => {
    const binding: WidgetDataBinding = { ...apiBinding, pick: 'data.total' }
    const fetchFn = mockFetch(() => mockResponse({ contentType: 'application/json', body: '{"data":{"total":42}}' }))
    const result = await handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: binding }), { fetchFn })
    expect(result.status).toBe(200)
    expect(result.payload).toEqual({ ok: true, data: 42 })
  })

  it('拒内网 URL（SSRF guard）→ 400', async () => {
    const binding: WidgetDataBinding = { source: { type: 'api', url: 'https://127.0.0.1/internal' } }
    const error = await handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: binding })).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(RefreshRequestError)
    expect((error as RefreshRequestError).status).toBe(400)
    expect((error as RefreshRequestError).message).toMatch(/loopback\/private/)
  })

  it('拒 http://（仅 https）→ 400', async () => {
    const binding: WidgetDataBinding = { source: { type: 'api', url: 'http://api.example.com/x' } }
    await expect(handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: binding }))).rejects.toMatchObject({ status: 400 })
  })

  it('credentialRef / Authorization 明文 → 400', async () => {
    // credentialRef 是 v2 保留字段（v1 类型不含）——fail-closed 拒绝，构造时放宽类型
    const withCredential = { source: { type: 'api' as const, url: apiBinding.source.type === 'api' ? apiBinding.source.url : '', credentialRef: 'prod' } }
    await expect(handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: withCredential }))).rejects.toMatchObject({ status: 400 })
    const withAuth: WidgetDataBinding = { source: { type: 'api', url: 'https://api.example.com/x', headers: { Authorization: 'Bearer t' } } }
    await expect(handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: withAuth }))).rejects.toMatchObject({ status: 400 })
  })

  it('业务失败（上游 500）→ 200 { ok: false, error }，不抛 500', async () => {
    const fetchFn = mockFetch(() => mockResponse({ status: 500, statusText: 'Internal Server Error', contentType: 'application/json', body: '{}' }))
    const result = await handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: apiBinding }), { fetchFn })
    expect(result.status).toBe(200)
    expect(result.payload.ok).toBe(false)
    if (!result.payload.ok) expect(result.payload.error).toMatch(/HTTP 500/)
  })

  it('业务失败（网络错误）→ 200 { ok: false, error }', async () => {
    const fetchFn = mockFetch(() => Promise.reject(new Error('socket hang up')))
    const result = await handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: apiBinding }), { fetchFn })
    expect(result.status).toBe(200)
    expect(result.payload).toMatchObject({ ok: false })
  })

  it('业务失败（非 JSON 响应）→ 200 { ok: false }', async () => {
    const fetchFn = mockFetch(() => mockResponse({ contentType: 'text/html', body: '<html></html>' }))
    const result = await handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: apiBinding }), { fetchFn })
    expect(result.status).toBe(200)
    expect(result.payload.ok).toBe(false)
  })

  it('请求体非 api source → 400', async () => {
    await expect(
      handleRefreshRequest(bodyOf({ widgetId: 'w-1', data: { source: { type: 'static', value: 1 } } })),
    ).rejects.toMatchObject({ status: 400 })
  })
})
