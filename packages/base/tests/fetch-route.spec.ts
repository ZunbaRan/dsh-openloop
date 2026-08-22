import { describe, expect, it } from 'vitest'
import { BASE_FETCH_ROUTE, parseFetchRequestBody } from '../src/server/fetch-route.ts'
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
})
