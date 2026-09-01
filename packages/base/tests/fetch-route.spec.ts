import { describe, expect, it } from 'vitest'
import { BASE_FETCH_ROUTE, parseFetchRequestBody, resolveFetchTarget, ownOriginAllowlist } from '../src/server/fetch-route.ts'
import { safeFetchJson } from '../src/server/net.ts'

describe('base fetch 代理路由（A3/A6）', () => {
  it('路由路径与常量', () => {
    expect(BASE_FETCH_ROUTE).toBe('/openloop/base/fetch')
  })
  it('parseFetchRequestBody：合法体解析 + timeout 归一', () => {
    const parsed = parseFetchRequestBody('{"url":"https://x.example.com/a","timeoutMs":99999999}')
    expect(parsed.url).toBe('https://x.example.com/a')
    expect(parsed.timeoutMs).toBe(30000) // clamp 30s
  })
  it('parseFetchRequestBody：坏体/缺 url 拒绝', () => {
    expect(() => parseFetchRequestBody('{')).toThrow()
    expect(() => parseFetchRequestBody('{"url":""}')).toThrow()
    expect(() => parseFetchRequestBody('{}')).toThrow()
  })
  it('safeFetchJson：环回 URL 默认拒绝；白名单命中放行判定在 validate 层', async () => {
    await expect(safeFetchJson('http://127.0.0.1:9090/metrics')).rejects.toThrow(/loopback|https/)
  })
  it('safeFetchJson：合法 https 经 mock fetch 成功', async () => {
    const mock = (async () => new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
    const data = await safeFetchJson('https://api.example.com/x', { fetchFn: mock })
    expect(data).toEqual({ ok: true })
  })

  it('resolveFetchTarget：相对路径用 Host 补全为绝对 URL（同源）', () => {
    expect(resolveFetchTarget('/openloop/app/status', '127.0.0.1:3080'))
      .toBe('http://127.0.0.1:3080/openloop/app/status')
  })
  it('resolveFetchTarget：绝对 URL / 无 host / 非以/开头 原样返回', () => {
    expect(resolveFetchTarget('https://api.example.com/x', '127.0.0.1:3080')).toBe('https://api.example.com/x')
    expect(resolveFetchTarget('/openloop/app/status', undefined)).toBe('/openloop/app/status')
    expect(resolveFetchTarget('openloop/app/status', '127.0.0.1:3080')).toBe('openloop/app/status')
  })
  it('ownOriginAllowlist：把自身 http origin 并入白名单（同源相对路径可跳过 https/SSRF 校验）', () => {
    expect(ownOriginAllowlist('127.0.0.1:3080')).toEqual(['http://127.0.0.1:3080'])
    expect(ownOriginAllowlist('127.0.0.1:3080', ['https://api.example.com'])).toEqual(['https://api.example.com', 'http://127.0.0.1:3080'])
    expect(ownOriginAllowlist(undefined)).toEqual([])
  })
  it('resolveFetchTarget + ownOriginAllowlist：同源相对请求可安全通过', async () => {
    const target = resolveFetchTarget('/openloop/app/status', '127.0.0.1:3080')
    const allow = ownOriginAllowlist('127.0.0.1:3080')
    const mock = (async () => new Response('{"state":"running"}', { headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch
    // 命中自身 origin 白名单 → 不再抛 not-absolute/https 错误，直接走 mock
    const data = await safeFetchJson(target, { allowedOrigins: allow, fetchFn: mock })
    expect(data).toEqual({ state: 'running' })
  })

  it('parseFetchRequestBody：method/body/headers 透传', () => {
    const parsed = parseFetchRequestBody('{"url":"/openloop/app/invalidate","method":"post","body":"{}","headers":{"Content-Type":"application/json","Accept":"application/json"}}')
    expect(parsed.method).toBe('POST')
    expect(parsed.body).toBe('{}')
    expect(parsed.headers).toEqual({ 'Content-Type': 'application/json', Accept: 'application/json' })
  })
  it('parseFetchRequestBody：method 白名单拒绝危险方法', () => {
    expect(() => parseFetchRequestBody('{"url":"https://x.example.com/a","method":"CONNECT"}')).toThrow(/method/)
    expect(() => parseFetchRequestBody('{"url":"https://x.example.com/a","method":"TRACE"}')).toThrow(/method/)
  })
  it('parseFetchRequestBody：body 非 string 丢弃；超 8KB 截断', () => {
    const noBody = parseFetchRequestBody('{"url":"https://x.example.com/a","body":123}')
    expect(noBody.body).toBeUndefined()
    const big = 'x'.repeat(9000)
    const parsed = parseFetchRequestBody(JSON.stringify({ url: 'https://x.example.com/a', body: big }))
    expect(parsed.body?.length).toBeLessThanOrEqual(8 * 1024)
  })
  it('parseFetchRequestBody：headers 白名单剥离 Authorization/Cookie', () => {
    const parsed = parseFetchRequestBody('{"url":"https://x.example.com/a","headers":{"Authorization":"Bearer t","Cookie":"k=v","Accept":"application/json"}}')
    expect(parsed.headers).toEqual({ Accept: 'application/json' })
  })
  it('safeFetchJson：method/body/headers 传达到 fetchFn', async () => {
    let seen: { method?: string; body?: string; headers?: Record<string, string> } = {}
    const mock = ((_url: string, init?: RequestInit) => { seen = { method: init?.method, body: init?.body as string | undefined, headers: init?.headers as Record<string, string> | undefined }; return Promise.resolve(new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } })) }) as unknown as typeof fetch
    await safeFetchJson('https://api.example.com/x', {
      method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' },
      fetchFn: mock,
    })
    expect(seen.method).toBe('POST')
    expect(seen.body).toBe('{}')
    expect(seen.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })
})
