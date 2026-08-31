/**
 * 受控记录查询 + 本地统计单测（M3+ 预设族数据通道）。
 */
import { describe, expect, it } from 'vitest'
import { buildKeywordFilter, clampPaging, collectionCounts, isManagedCollection, listRecordsPaged } from '../src/records.ts'
import { initCollections } from '../src/schema.ts'
import { FakePb } from './fake-pb.ts'

describe('clampPaging', () => {
  it('合法参数透传；非法回落默认；钳制边界', () => {
    expect(clampPaging('2', '50')).toEqual({ page: 2, perPage: 50 })
    expect(clampPaging(undefined, undefined)).toEqual({ page: 1, perPage: 20 })
    expect(clampPaging('0', '3')).toEqual({ page: 1, perPage: 5 })
    expect(clampPaging('999', '999')).toEqual({ page: 999, perPage: 100 })
    expect(clampPaging('abc', 'xyz')).toEqual({ page: 1, perPage: 20 })
  })
})

describe('buildKeywordFilter', () => {
  it('text 字段 OR like 串；引号剥离防注入', () => {
    const fields = [{ name: 'rid' }, { name: 'title' }, { name: 'position', type: 'number' }]
    expect(buildKeywordFilter(fields, 'abc')).toBe('rid ~ "abc" || title ~ "abc" || position ~ "abc"')
    expect(buildKeywordFilter(fields, 'x"y')).toBe('rid ~ "xy" || title ~ "xy" || position ~ "xy"')
    expect(buildKeywordFilter([], 'abc')).toBeNull()
    expect(buildKeywordFilter(fields, '  ')).toBeNull()
  })
})

describe('isManagedCollection', () => {
  it('白名单：6 张业务表；系统表/任意名拒绝', () => {
    expect(isManagedCollection('apps')).toBe(true)
    expect(isManagedCollection('tiles')).toBe(true)
    expect(isManagedCollection('_superusers')).toBe(false)
    expect(isManagedCollection('users')).toBe(false)
    expect(isManagedCollection('..')).toBe(false)
  })
})

describe('listRecordsPaged（FakePb）', () => {
  it('分页 + 关键词过滤（text 字段子串匹配）+ keySecret 剥离', async () => {
    const pb = new FakePb()
    await initCollections(pb)
    pb.seed('apis', [
      { rid: 'a:orders', appName: 'a', domain: 'api.example.com', path: '/v1/orders', authType: 'key', keySecret: 'sk-1' },
      { rid: 'a:users', appName: 'a', domain: 'api.example.com', path: '/v1/users', authType: 'none', keySecret: '' },
      { rid: 'b:orders', appName: 'b', domain: 'b.io', path: '/orders', authType: 'key', keySecret: 'sk-2' },
    ])

    const page1 = await listRecordsPaged(pb, 'apis', 1, 2, undefined)
    expect(page1.totalItems).toBe(3)
    expect(page1.items).toHaveLength(2)
    expect(page1.totalPages).toBe(2)
    // keySecret 绝不出现
    expect(JSON.stringify(page1.items)).not.toContain('sk-1')

    const q = await listRecordsPaged(pb, 'apis', 1, 20, 'orders')
    expect(q.totalItems).toBe(2)
    expect(q.items.map(r => r.rid)).toEqual(['a:orders', 'b:orders'])

    const q2 = await listRecordsPaged(pb, 'apis', 1, 20, 'api.example.com')
    expect(q2.totalItems).toBe(2)
  })

  it('collectionCounts 返回全部管理表计数', async () => {
    const pb = new FakePb()
    await initCollections(pb)
    pb.seed('apps', [{ name: 'a', displayName: 'A' }])
    pb.seed('boards', [{ bid: 'b1' }, { bid: 'b2' }])
    const counts = await collectionCounts(pb)
    expect(counts).toHaveLength(8)
    expect(counts.find(c => c.name === 'apps')?.count).toBe(1)
    expect(counts.find(c => c.name === 'boards')?.count).toBe(2)
    expect(counts.find(c => c.name === 'tiles')?.count).toBe(0)
  })
})
