import { describe, expect, it } from 'vitest'
import { applyBindingParams } from '../src/datasource.ts'
import { handleRefreshRequest } from '../src/refresh.ts'
import type { WidgetDataBinding } from '../src/contract.ts'

const apiBinding = (overrides: Partial<Extract<WidgetDataBinding['source'], { type: 'api' }>> = {}): WidgetDataBinding => ({
  source: { type: 'api', url: 'https://api.example.test/leads', ...overrides },
})

describe('联动 v1：applyBindingParams 模板替换', () => {
  it('url 模板变量替换为编码值；未提供参数替换为空串', () => {
    const binding: WidgetDataBinding = {
      source: { type: 'api', url: 'https://api.example.test/leads/{{leadId}}' },
      params: { leadId: 'L 1024' },
    }
    const applied = applyBindingParams(binding, { leadId: 'L 1024' })
    expect((applied.source as { url: string }).url).toBe('https://api.example.test/leads/L%201024')
  })

  it('query 与 body 模板同样替换；body 保持 JSON 结构', () => {
    const binding: WidgetDataBinding = {
      source: { type: 'api', url: 'https://api.example.test/query', method: 'POST', query: { filter: '{{leadId}}' }, body: { id: '{{leadId}}', kind: 'lead' } },
      params: { leadId: 'L-1024' },
    }
    const applied = applyBindingParams(binding, { leadId: 'L-1024' })
    const source = applied.source as { query: Record<string, string>; body: unknown }
    expect(source.query.filter).toBe('L-1024')
    expect(source.body).toEqual({ id: 'L-1024', kind: 'lead' })
  })

  it('未声明 params 的 binding 原样返回（引用不变）', () => {
    const binding = apiBinding()
    expect(applyBindingParams(binding, { leadId: 'x' })).toBe(binding)
  })

  it('声明了模板但未提供参数值 → 空串', () => {
    const binding: WidgetDataBinding = {
      source: { type: 'api', url: 'https://api.example.test/leads/{{leadId}}' },
      params: { leadId: 'whatever' },
    }
    const applied = applyBindingParams(binding, {})
    expect((applied.source as { url: string }).url).toBe('https://api.example.test/leads/')
  })
})

describe('联动 v1：refresh 端点带参', () => {
  it('params 随请求替换模板后取数（fetch 收到已替换 URL）', async () => {
    const fetched: string[] = []
    const result = await handleRefreshRequest(JSON.stringify({
      widgetId: 'lead-detail',
      data: { source: { type: 'api', url: 'https://api.example.test/leads/{{leadId}}' }, params: { leadId: '' } },
      params: { leadId: 'L-1026' },
    }), {
      fetchFn: (async (url: string | URL) => {
        fetched.push(String(url))
        return new Response(JSON.stringify({ name: '岱川制造' }), { headers: { 'content-type': 'application/json' } })
      }) as unknown as typeof fetch,
    })
    expect(result.status).toBe(200)
    expect(result.payload).toEqual({ ok: true, data: { name: '岱川制造' } })
    expect(fetched[0]).toBe('https://api.example.test/leads/L-1026')
  })

  it('params 非法形态 → 400', async () => {
    await expect(handleRefreshRequest(JSON.stringify({
      widgetId: 'lead-detail',
      data: { source: { type: 'api', url: 'https://api.example.test/x' } },
      params: 'oops',
    }))).rejects.toMatchObject({ status: 400 })
  })
})
