import { describe, expect, it } from 'vitest'
import type { PanelDefinition, WidgetDataBinding } from '../src/contract.ts'
import {
  buildApiUrl,
  DEFAULT_TIMEOUT_MS,
  looksLikeJsonContentType,
  MAX_RESPONSE_BYTES,
  MAX_TIMEOUT_MS,
  normalizeTimeoutMs,
  parseJsonResponse,
  parsePickPath,
  pickValue,
  readBodyBytes,
  resolvePanelData,
  resolveWidgetData,
  validateApiUrl,
} from '../src/datasource.ts'

// ---------------------------------------------------------------------------
// mock fetch helpers（注入 fetchFn，不真联网）
// ---------------------------------------------------------------------------

function streamFrom(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({ start(controller) { controller.enqueue(bytes); controller.close() } })
}

function bytesStream(length: number): ReadableStream<Uint8Array> {
  return new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(length)); controller.close() } })
}

function mockResponse(init: { status?: number; statusText?: string; contentType?: string; body?: string | ReadableStream<Uint8Array> }): Response {
  const headers = new Headers()
  if (init.contentType !== undefined) headers.set('content-type', init.contentType)
  const status = init.status ?? 200
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: init.statusText ?? '',
    headers,
    body: typeof init.body === 'string' ? streamFrom(init.body) : (init.body ?? null),
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

function apiBinding(overrides: Record<string, unknown> = {}, bindingOverrides: Record<string, unknown> = {}): WidgetDataBinding {
  return { ...bindingOverrides, source: { type: 'api', url: 'https://api.example.com/v1/stats', ...overrides } } as WidgetDataBinding
}

const STATIC_BINDING: WidgetDataBinding = { source: { type: 'static', value: { ok: true, n: 3 } } }

// ---------------------------------------------------------------------------
// 纯函数：pick 路径
// ---------------------------------------------------------------------------

describe('parsePickPath（a.b[0].c 形态）', () => {
  it('点号与方括号索引混合', () => {
    expect(parsePickPath('a.b[0].c')).toEqual(['a', 'b', 0, 'c'])
    expect(parsePickPath('items[3]')).toEqual(['items', 3])
    expect(parsePickPath('a[0].b[1]')).toEqual(['a', 0, 'b', 1])
  })
  it('纯字符串键段不转数字', () => {
    expect(parsePickPath('version.v1')).toEqual(['version', 'v1'])
  })
  it('空段/边角输入不崩', () => {
    expect(parsePickPath('')).toEqual([])
    expect(parsePickPath('..')).toEqual([])
  })
})

describe('pickValue', () => {
  const data = { a: { b: [{ c: 42 }, { c: 7 }] }, top: 'yes', arr: [10, 20, 30] }

  it('深路径取值', () => {
    expect(pickValue(data, 'a.b[0].c')).toBe(42)
    expect(pickValue(data, 'a.b[1].c')).toBe(7)
    expect(pickValue(data, 'top')).toBe('yes')
    expect(pickValue(data, 'arr[2]')).toBe(30)
  })
  it('缺路径返回 undefined（不抛错）', () => {
    expect(pickValue(data, 'a.b[9].c')).toBeUndefined()
    expect(pickValue(data, 'no.such[0]')).toBeUndefined()
    expect(pickValue(data, 'a.b[0].missing')).toBeUndefined()
    expect(pickValue(data, 'top.x.y')).toBeUndefined() // 中途遇标量
  })
  it('空/缺省 pick 返回整个数据', () => {
    expect(pickValue(data, undefined)).toBe(data)
    expect(pickValue(data, '')).toBe(data)
  })
  it('数据为标量/非对象时不崩', () => {
    expect(pickValue(42, 'a')).toBeUndefined()
    expect(pickValue(null, 'a.b')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 纯函数：超时 / 大小 / JSON 判定
// ---------------------------------------------------------------------------

describe('normalizeTimeoutMs（默认 10s，上限 30s）', () => {
  it('缺省返回默认值', () => {
    expect(normalizeTimeoutMs(undefined)).toBe(DEFAULT_TIMEOUT_MS)
  })
  it('合法自定义值保留', () => {
    expect(normalizeTimeoutMs(5_000)).toBe(5_000)
    expect(normalizeTimeoutMs(MAX_TIMEOUT_MS)).toBe(MAX_TIMEOUT_MS)
  })
  it('超上限 clamp', () => {
    expect(normalizeTimeoutMs(60_000)).toBe(MAX_TIMEOUT_MS)
  })
  it('非法值回退默认', () => {
    expect(normalizeTimeoutMs(0)).toBe(DEFAULT_TIMEOUT_MS)
    expect(normalizeTimeoutMs(-1)).toBe(DEFAULT_TIMEOUT_MS)
    expect(normalizeTimeoutMs(Number.NaN)).toBe(DEFAULT_TIMEOUT_MS)
  })
})

describe('looksLikeJsonContentType', () => {
  it.each([
    ['application/json', true],
    ['application/json; charset=utf-8', true],
    ['text/json', true],
    ['text/html', false],
    ['application/octet-stream', false],
    [null, false],
    [undefined, false],
  ])('content-type %s → %s', (type, expected) => {
    expect(looksLikeJsonContentType(type)).toBe(expected)
  })
})

describe('parseJsonResponse（仅接受 JSON：content-type 含 json 或体可 JSON.parse）', () => {
  it('content-type 含 json 且体合法 → 解析成功', () => {
    expect(parseJsonResponse('application/json', '{"a":1}')).toEqual({ a: 1 })
  })
  it('content-type 非 json 但体可 JSON.parse → 解析成功', () => {
    expect(parseJsonResponse('text/plain', '[1,2,3]')).toEqual([1, 2, 3])
    expect(parseJsonResponse(undefined, '"str"')).toBe('str')
  })
  it('content-type 声称 json 但体非法 → 抛「非有效 JSON」', () => {
    expect(() => parseJsonResponse('application/json', '<html>')).toThrow(/not valid JSON/)
  })
  it('两者都非 JSON → 抛「不是 JSON 响应」', () => {
    expect(() => parseJsonResponse('text/html', '<html>')).toThrow(/not JSON/)
    expect(() => parseJsonResponse('application/octet-stream', '\u0000\u0001')).toThrow(/not JSON/)
  })
})

describe('readBodyBytes（≤1MB 上限）', () => {
  it('正常读取并合并', async () => {
    const { bytes, truncated } = await readBodyBytes(streamFrom('hello'))
    expect(truncated).toBe(false)
    expect(new TextDecoder().decode(bytes)).toBe('hello')
  })
  it('空流返回空字节', async () => {
    const { bytes, truncated } = await readBodyBytes(streamFrom(''))
    expect(truncated).toBe(false)
    expect(bytes.byteLength).toBe(0)
  })
  it('超过 1MB 标记截断', async () => {
    const { truncated } = await readBodyBytes(bytesStream(MAX_RESPONSE_BYTES + 1))
    expect(truncated).toBe(true)
  })
  it('恰好 1MB 不截断', async () => {
    const { truncated } = await readBodyBytes(bytesStream(MAX_RESPONSE_BYTES))
    expect(truncated).toBe(false)
  })
})

describe('buildApiUrl / validateApiUrl', () => {
  it('query 参数拼接与合并', () => {
    expect(buildApiUrl('https://api.example.com/x', { limit: '5', sort: 'desc' }))
      .toBe('https://api.example.com/x?limit=5&sort=desc')
    expect(buildApiUrl('https://api.example.com/x?page=2', { limit: '5' }))
      .toBe('https://api.example.com/x?page=2&limit=5')
  })
  it('非 https 拒绝', () => {
    expect(() => validateApiUrl('http://api.example.com/x')).toThrow(/https/)
  })
  it('SSRF 网段拒绝（参数化）', () => {
    expect(() => validateApiUrl('https://127.0.0.1/x')).toThrow(/loopback|private/)
    expect(() => validateApiUrl('https://10.0.0.5/x')).toThrow(/loopback|private/)
    expect(() => validateApiUrl('https://192.168.1.1/x')).toThrow(/loopback|private/)
    expect(() => validateApiUrl('https://169.254.169.254/meta')).toThrow(/loopback|private/)
    expect(() => validateApiUrl('https://localhost/x')).toThrow(/loopback|private/)
    expect(() => validateApiUrl('https://[::1]/x')).toThrow(/loopback|private/)
  })
  it('非法 URL fail-closed', () => {
    expect(() => validateApiUrl('not a url')).toThrow(/not a valid URL/)
  })
})

// ---------------------------------------------------------------------------
// resolveWidgetData
// ---------------------------------------------------------------------------

describe('resolveWidgetData：static source', () => {
  it('直接返回 value（不触发 fetch）', async () => {
    await expect(resolveWidgetData(STATIC_BINDING)).resolves.toEqual({ ok: true, n: 3 })
  })
})

describe('resolveWidgetData：api 校验（fetch 不被调用）', () => {
  const neverFetch = mockFetch(() => { throw new Error('fetch should not be called') })

  it.each([
    ['http 明文拒绝', { url: 'http://api.example.com/x' }, /https/],
    ['SSRF 环回拒绝', { url: 'https://127.0.0.1/internal' }, /loopback|private/],
    ['SSRF 私网拒绝', { url: 'https://10.1.2.3/x' }, /loopback|private/],
    ['localhost 拒绝', { url: 'https://localhost:8080/x' }, /loopback|private/],
    ['非法 URL', { url: 'not a url' }, /not a valid URL/],
    ['credentialRef v1 拒绝', { url: 'https://api.example.com/x', credentialRef: 'gh' }, /v2 feature/],
    ['Authorization 明文拒绝', { url: 'https://api.example.com/x', headers: { Authorization: 'Bearer x' } }, /Authorization/],
  ])('%s', async (_name, overrides, pattern) => {
    await expect(resolveWidgetData(apiBinding(overrides), { fetchFn: neverFetch })).rejects.toThrow(pattern)
  })
})

describe('resolveWidgetData：api fetch 成功路径', () => {
  it('GET + pick 取值', async () => {
    const fetchFn = mockFetch((url, init) => {
      expect(init?.method ?? 'GET').toBe('GET')
      return mockResponse({ contentType: 'application/json', body: JSON.stringify({ data: { items: [{ total: 48210 }] } }) })
    })
    const binding = apiBinding({}, { pick: 'data.items[0].total' })
    await expect(resolveWidgetData(binding, { fetchFn })).resolves.toBe(48210)
  })

  it('query 参数拼入 url', async () => {
    let seenUrl = ''
    const fetchFn = mockFetch((url) => {
      seenUrl = url
      return mockResponse({ contentType: 'application/json', body: '{"ok":true}' })
    })
    const binding = apiBinding({ query: { limit: '5', sort: 'desc' } })
    await expect(resolveWidgetData(binding, { fetchFn })).resolves.toEqual({ ok: true })
    expect(seenUrl).toBe('https://api.example.com/v1/stats?limit=5&sort=desc')
  })

  it('POST 序列化 body 并带 content-type', async () => {
    const fetchFn = mockFetch((_url, init) => {
      expect(init?.method).toBe('POST')
      expect(init?.headers).toMatchObject({ 'content-type': 'application/json' })
      expect(init?.body).toBe(JSON.stringify({ q: 'x' }))
      return mockResponse({ contentType: 'application/json', body: '{"hits":1}' })
    })
    const binding = apiBinding({ method: 'POST', body: { q: 'x' } })
    await expect(resolveWidgetData(binding, { fetchFn })).resolves.toEqual({ hits: 1 })
  })

  it('content-type 非 json 但体可解析 → 成功', async () => {
    const fetchFn = mockFetch(() => mockResponse({ contentType: 'text/plain', body: '[1,2,3]' }))
    await expect(resolveWidgetData(apiBinding(), { fetchFn })).resolves.toEqual([1, 2, 3])
  })
})

describe('resolveWidgetData：api fetch 失败路径', () => {
  it('HTTP 非 2xx 抛状态错误', async () => {
    const fetchFn = mockFetch(() => mockResponse({ status: 503, statusText: 'Service Unavailable' }))
    await expect(resolveWidgetData(apiBinding(), { fetchFn })).rejects.toThrow(/HTTP 503/)
  })

  it('超时抛 timeout（timeoutMs 生效）', async () => {
    const fetchFn = mockFetch(() => new Promise<Response>(() => {})) // 永不返回，靠 abort 中断
    const binding = apiBinding({ timeoutMs: 50 })
    await expect(resolveWidgetData(binding, { fetchFn })).rejects.toThrow(/timed out after 50ms/)
  })

  it('响应体超 1MB 抛大小上限', async () => {
    const fetchFn = mockFetch(() => mockResponse({ contentType: 'application/json', body: bytesStream(MAX_RESPONSE_BYTES + 1) }))
    await expect(resolveWidgetData(apiBinding(), { fetchFn })).rejects.toThrow(/byte limit/)
  })

  it('非 JSON 响应抛 not JSON', async () => {
    const fetchFn = mockFetch(() => mockResponse({ contentType: 'text/html', body: '<html>hi</html>' }))
    await expect(resolveWidgetData(apiBinding(), { fetchFn })).rejects.toThrow(/not JSON/)
  })

  it('content-type 声称 json 但体非法抛 not valid JSON', async () => {
    const fetchFn = mockFetch(() => mockResponse({ contentType: 'application/json', body: '<html>' }))
    await expect(resolveWidgetData(apiBinding(), { fetchFn })).rejects.toThrow(/not valid JSON/)
  })

  it('外部 signal 中止时 fetch 取消（错误被抛出）', async () => {
    const controller = new AbortController()
    controller.abort()
    const fetchFn = mockFetch(() => new Promise<Response>(() => {}))
    await expect(resolveWidgetData(apiBinding(), { fetchFn, signal: controller.signal })).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// resolvePanelData（单格失败不拖垮面板）
// ---------------------------------------------------------------------------

describe('resolvePanelData', () => {
  function panel(widgets: PanelDefinition['widgets']): PanelDefinition {
    return { $schema: 'openloop.panel/v1', id: 'p', title: 'P', widgets }
  }

  it('无 api widget 返回空对象', async () => {
    const p = panel([{ id: 'kpi', source: { type: 'preset', kind: 'text', props: { text: 'hi' } } }])
    await expect(resolvePanelData(p)).resolves.toEqual({})
  })

  it('全部成功：并行写入 resolved[widgetId]', async () => {
    const okFetch = mockFetch(() => mockResponse({ contentType: 'application/json', body: JSON.stringify({ value: 1 }) }))
    const p = panel([
      { id: 'a', source: { type: 'preset', kind: 'text', props: { text: 'x' } }, data: apiBinding({ query: { w: 'a' } }) },
      { id: 'b', source: { type: 'preset', kind: 'text', props: { text: 'x' } }, data: apiBinding({ query: { w: 'b' } }) },
    ])
    const resolved = await resolvePanelData(p, { fetchFn: okFetch })
    expect(resolved).toEqual({ a: { value: 1 }, b: { value: 1 } })
  })

  it('单个失败写入 { __error }，其余格不受影响', async () => {
    const fetchFn = mockFetch((url) => {
      if (url.includes('fail')) return mockResponse({ status: 500 })
      return mockResponse({ contentType: 'application/json', body: JSON.stringify({ value: 2 }) })
    })
    const p = panel([
      { id: 'good', source: { type: 'preset', kind: 'text', props: { text: 'x' } }, data: apiBinding({ url: 'https://api.example.com/good' }) },
      { id: 'bad', source: { type: 'preset', kind: 'text', props: { text: 'x' } }, data: apiBinding({ url: 'https://api.example.com/fail' }) },
    ])
    const resolved = await resolvePanelData(p, { fetchFn })
    expect(resolved.good).toEqual({ value: 2 })
    expect(resolved.bad).toMatchObject({ __error: expect.stringMatching(/widget "bad".*HTTP 500/) })
  })

  it('static widget 不进入 resolved（仅 api widget 由 server 解析）', async () => {
    const p = panel([
      { id: 'static', source: { type: 'preset', kind: 'text', props: { text: 'x' } }, data: STATIC_BINDING },
    ])
    const resolved = await resolvePanelData(p, {})
    expect(resolved).toEqual({})
  })

  it('校验失败（非 https）同样写入 __error 而非抛整面板', async () => {
    const p = panel([
      { id: 'bad', source: { type: 'preset', kind: 'text', props: { text: 'x' } }, data: { source: { type: 'api', url: 'http://insecure.example.com/x' } } },
    ])
    const resolved = await resolvePanelData(p, {})
    expect(resolved.bad).toMatchObject({ __error: expect.stringMatching(/https/) })
  })
})
