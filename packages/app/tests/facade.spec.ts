/**
 * 门面逻辑单测（fake PbClient——内存实现 PB records REST 的最小语义）。
 * 覆盖：app CRUD 幂等、命名空间隔离、凭据只写不回显、dock state 全量替换回环、
 * 坏数据 fail-closed、错误消息含期望形态（面向 Agent 可自修正）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { createAppFacade, type AppFacade, type DockStateV2 } from '../src/facade.ts'
import { initCollections } from '../src/schema.ts'
import type { PbClient } from '../src/pb-client.ts'

/** 内存 PB：collections/records 最小语义（门面用到的路径/filter 全覆盖；`field = "v"` 与 `id != ""`） */
class FakePb implements PbClient {
  private records = new Map<string, Array<Record<string, unknown>>>()
  private seq = 0

  private parseFilter(filter: string): (record: Record<string, unknown>) => boolean {
    const match = /^(\w+) = "(.*)"$/.exec(filter)
    if (match !== null) {
      const field = match[1] as string
      const value = match[2] as string
      return record => String(record[field]) === value
    }
    if (filter === 'id != ""') return () => true
    throw new Error(`FakePb: unsupported filter "${filter}"`)
  }

  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = new URL(path, 'http://fake.pb')
    const segments = url.pathname.split('/').filter(Boolean) // ['api', 'collections', <c>, ...]
    if (segments[0] !== 'api' || segments[1] !== 'collections') {
      throw new Error(`FakePb: unsupported path ${path}`)
    }
    const collection = segments[2]

    // POST /api/collections —— 创建
    if (segments.length === 2 && method === 'POST') {
      this.records.set(String((body as { name: string }).name), [])
      return body as T
    }
    // GET /api/collections/<name> —— initCollections 探测（未建 → 404）
    if (segments.length === 3 && method === 'GET' && collection !== undefined) {
      if (!this.records.has(collection)) throw Object.assign(new Error('not found'), { status: 404 })
      return { name: collection } as T
    }
    // records 段
    if (segments[3] !== 'records' || collection === undefined) throw new Error(`FakePb: unsupported path ${path}`)
    const rows = this.records.get(collection)
    if (rows === undefined) throw new Error(`FakePb: unknown collection ${collection}`)
    const recordId = segments[4]

    if (recordId === undefined) {
      if (method === 'GET') {
        const filter = url.searchParams.get('filter') ?? 'id != ""'
        const items = rows.filter(this.parseFilter(filter))
        return { items, totalItems: items.length, page: 1, totalPages: 1 } as T
      }
      if (method === 'POST') {
        const record = { id: `rec${++this.seq}`, ...(body as Record<string, unknown>) }
        rows.push(record)
        return record as T
      }
      throw new Error(`FakePb: unsupported ${method} on records`)
    }
    const index = rows.findIndex(r => r.id === recordId)
    if (index === -1) throw Object.assign(new Error('not found'), { status: 404 })
    if (method === 'PATCH') {
      rows[index] = { ...rows[index]!, ...(body as Record<string, unknown>) }
      return rows[index] as T
    }
    if (method === 'DELETE') {
      rows.splice(index, 1)
      return undefined as T
    }
    if (method === 'GET') return rows[index] as T
    throw new Error(`FakePb: unsupported ${method} on records/${recordId}`)
  }
}

describe('app backend facade (fake pb)', () => {
  let pb: FakePb
  let facade: AppFacade

  beforeEach(async () => {
    pb = new FakePb()
    await initCollections(pb)
    facade = createAppFacade(pb)
  })

  const tile = (tileId: string, title: string): DockStateV2['boards'][number]['tiles'][number] => ({
    tileId,
    title,
    source: { kind: 'panel', meta: { panel: { id: tileId.replace(/^t-/, '') } } },
    layout: { column: 0, row: 0, columns: 6, rows: 4 },
    origin: null,
    createdAt: 1,
  })

  it('upsert_app 幂等（同名更新不重复）', async () => {
    const created = await facade.upsertApp({ name: 'my-sales', displayName: '销售', kind: 'local', version: '0.1.0' })
    expect(created.created).toBe(true)
    const updated = await facade.upsertApp({ name: 'my-sales', displayName: '销售看板', kind: 'local', version: '0.2.0' })
    expect(updated.created).toBe(false)
    expect(updated.displayName).toBe('销售看板')
    const apps = await facade.listApps()
    expect(apps).toHaveLength(1)
  })

  it('非法 app.name fail-closed 且错误消息含期望形态', async () => {
    await expect(facade.upsertApp({ name: 'My Sales', displayName: 'x', kind: 'local' }))
      .rejects.toThrow(/kebab-case/)
  })

  it('register_component 命名空间隔离：rid 必须以归属 APP 开头', async () => {
    await facade.upsertApp({ name: 'my-sales', displayName: 'x', kind: 'local' })
    await expect(facade.registerComponent('my-sales', { rid: 'other-app:weekly', kind: 'panel', title: 'x' }))
      .rejects.toThrow(/namespace "my-sales:"/)
    const ok = await facade.registerComponent('my-sales', { rid: 'my-sales:weekly', kind: 'panel', title: '周度业绩' })
    expect(ok.rid).toBe('my-sales:weekly')
  })

  it('register_component 要求 APP 已注册（错误消息列出现有 APP）', async () => {
    await expect(facade.registerComponent('ghost', { rid: 'ghost:x', kind: 'panel', title: 'x' }))
      .rejects.toThrow(/not registered/)
  })

  it('凭据只写不回显：setApiKey 后 getAppDetail 只给 configured', async () => {
    await facade.upsertApp({ name: 'a', displayName: 'a', kind: 'local' })
    await facade.registerApi('a', { rid: 'a:orders', domain: 'api.example.com', path: '/v1/orders', authType: 'key' })
    let detail = await facade.getAppDetail('a')
    expect(detail?.apis[0]?.configured).toBe(false)
    await facade.setApiKey('a:orders', 'sk-secret-123')
    detail = await facade.getAppDetail('a')
    expect(detail?.apis[0]?.configured).toBe(true)
    // key 本身绝不出现在任何输出
    expect(JSON.stringify(detail)).not.toContain('sk-secret-123')
  })

  it('register_api upsert 保留已有凭据', async () => {
    await facade.upsertApp({ name: 'a', displayName: 'a', kind: 'local' })
    await facade.registerApi('a', { rid: 'a:orders', domain: 'api.example.com', path: '/v1/orders', authType: 'key' })
    await facade.setApiKey('a:orders', 'sk-secret-123')
    // 重复注册（更新 summary）不清凭据
    await facade.registerApi('a', { rid: 'a:orders', domain: 'api.example.com', path: '/v1/orders', authType: 'key', summary: 'new' })
    const detail = await facade.getAppDetail('a')
    expect(detail?.apis[0]?.configured).toBe(true)
  })

  it('delete_app 级联清理资源', async () => {
    await facade.upsertApp({ name: 'a', displayName: 'a', kind: 'local' })
    await facade.registerComponent('a', { rid: 'a:c1', kind: 'panel', title: 'c' })
    await facade.registerApi('a', { rid: 'a:api1', domain: 'd', path: '/p', authType: 'none' })
    const removed = await facade.deleteApp('a')
    expect(removed).toEqual({ removedComponents: 1, removedApis: 1 })
    expect(await facade.listApps()).toEqual([])
    const detail = await facade.getAppDetail('a')
    expect(detail).toBeUndefined()
  })

  it('dock state 保存→加载回环（顺序/别名/activeBoardId 保持）', async () => {
    const state: DockStateV2 = {
      version: 2,
      boards: [
        { id: 'b-default', name: '默认看板', tiles: [tile('t-metric', '指标卡'), { ...tile('t-chart', '图表'), alias: '我的图表' }] },
        { id: 'b-focus', name: '本周聚焦', tiles: [tile('t-gauge', '仪表')] },
      ],
      activeBoardId: 'b-focus',
    }
    const saved = await facade.saveDockState(state)
    expect(saved).toEqual({ boards: 2, tiles: 3 })
    const loaded = await facade.loadDockState()
    expect(loaded).toEqual(state)
  })

  it('saveDockState 全量替换（旧板消失）+ 坏 tile 剔除', async () => {
    await facade.saveDockState({
      version: 2,
      boards: [{ id: 'b1', name: '一', tiles: [tile('t1', 'ok')] }],
      activeBoardId: 'b1',
    })
    const saved = await facade.saveDockState({
      version: 2,
      boards: [{
        id: 'b2', name: '二',
        tiles: [
          tile('t2', 'good'),
          { ...tile('t3', 'bad-no-source'), source: undefined as unknown as DockStateV2['boards'][number]['tiles'][number]['source'] },
        ],
      }],
      activeBoardId: 'b2',
    })
    expect(saved).toEqual({ boards: 1, tiles: 1 })
    const loaded = await facade.loadDockState()
    expect(loaded?.boards).toHaveLength(1)
    expect(loaded?.boards[0]?.id).toBe('b2')
    expect(loaded?.boards[0]?.tiles.map(t => t.tileId)).toEqual(['t2'])
  })

  it('v1 state 拒绝（version 必须为 2）', async () => {
    await expect(facade.saveDockState({ version: 1, tiles: [] })).rejects.toThrow(/version/)
  })

  it('activeBoardId 指向不存在 board 拒绝', async () => {
    await expect(facade.saveDockState({
      version: 2,
      boards: [{ id: 'b1', name: '一', tiles: [] }],
      activeBoardId: 'gone',
    })).rejects.toThrow(/activeBoardId/)
  })

  it('loadDockState 无数据返回 null；activeBoardId 跨保存/加载保持', async () => {
    expect(await facade.loadDockState()).toBeNull()
    await facade.saveDockState({
      version: 2,
      boards: [{ id: 'b1', name: '一', tiles: [] }, { id: 'b2', name: '二', tiles: [] }],
      activeBoardId: 'b2',
    })
    const loaded = await facade.loadDockState()
    expect(loaded?.activeBoardId).toBe('b2')
  })
})
