/**
 * store v2 单测：v1→v2 迁移写回、看板页 CRUD、tile 别名、tile 操作作用于激活板。
 * 每用例 new DockStore()（类已导出）——store 惰性读 localStorage，
 * 不依赖 vi.resetModules 的模块重置语义（vitest 4 下动态 import 重复加载不稳定）。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DockStore, type DockTile } from '../src/client/store.ts'

const KEY = 'openloop.dock.board.v1'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string): void { this.map.set(k, String(v)) }
}

let storage: MemoryStorage

const tile = (id: string, title: string): DockTile => ({
  tileId: id,
  title,
  source: { kind: 'panel', meta: {} },
  layout: { column: 0, row: 0, columns: 6, rows: 4 },
  origin: null,
  createdAt: 1,
})

const readPersisted = (): Record<string, unknown> => JSON.parse(storage.getItem(KEY) ?? 'null')

beforeEach(() => {
  storage = new MemoryStorage()
  globalThis.localStorage = storage as unknown as Storage
})

afterEach(() => {
  delete (globalThis as { localStorage?: Storage }).localStorage
})

describe('store v2 读取与迁移', () => {
  it('无数据 → 默认单板 v2', () => {
    const store = new DockStore()
    const s = store.getSnapshot()
    expect(s.version).toBe(2)
    expect(s.boards).toHaveLength(1)
    expect(s.boards[0]?.id).toBe('b-default')
    expect(s.activeBoardId).toBe('b-default')
  })

  it('v1 负载迁移为 v2 并立即写回（同 key）', () => {
    storage.setItem(KEY, JSON.stringify({ version: 1, tiles: [tile('t1', '旧面板')] }))
    const store = new DockStore()
    const s = store.getSnapshot()
    expect(s.version).toBe(2)
    expect(s.boards).toHaveLength(1)
    expect(s.boards[0]?.id).toBe('b-default')
    expect(s.boards[0]?.tiles).toHaveLength(1)
    // 迁移写回：localStorage 里已是 v2
    expect(readPersisted().version).toBe(2)
    const persistedBoards = readPersisted().boards as Array<{ tiles: Array<{ tileId: string }> }>
    expect(persistedBoards[0]?.tiles[0]?.tileId).toBe('t1')
  })

  it('v2 负载原样读取（多板 + alias + activeBoardId）', () => {
    storage.setItem(KEY, JSON.stringify({
      version: 2,
      boards: [
        { id: 'b1', name: '工作', tiles: [{ ...tile('t1', '面板'), alias: '我的别名' }] },
        { id: 'b2', name: '生活', tiles: [] },
      ],
      activeBoardId: 'b2',
    }))
    const store = new DockStore()
    const s = store.getSnapshot()
    expect(s.boards).toHaveLength(2)
    expect(s.activeBoardId).toBe('b2')
    expect(s.boards[0]?.tiles[0]?.alias).toBe('我的别名')
  })

  it('v2 activeBoardId 失效回落首板；坏 tile 剔除、空名兜底', () => {
    storage.setItem(KEY, JSON.stringify({
      version: 2,
      boards: [
        { id: 'b1', name: '', tiles: [tile('bad', undefined as unknown as string), tile('ok', '好的')] },
      ],
      activeBoardId: 'gone',
    }))
    const store = new DockStore()
    const s = store.getSnapshot()
    expect(s.activeBoardId).toBe('b1')
    expect(s.boards[0]?.name).toBe('默认看板') // 空名兜底
    expect(s.boards[0]?.tiles.map(t => t.tileId)).toEqual(['ok']) // 无 title 的 tile 剔除
  })

  it('损坏 JSON → 默认单板', () => {
    storage.setItem(KEY, '{oops')
    const store = new DockStore()
    expect(store.getSnapshot().boards).toHaveLength(1)
    expect(store.getSnapshot().boards[0]?.tiles).toHaveLength(0)
  })
})

describe('store v2 看板页管理', () => {
  it('addBoard 新增并激活，命名不与既有重名', () => {
    storage.setItem(KEY, JSON.stringify({
      version: 2,
      boards: [{ id: 'b1', name: '看板 2', tiles: [] }],
      activeBoardId: 'b1',
    }))
    const store = new DockStore()
    const id = store.addBoard()
    const s = store.getSnapshot()
    expect(s.boards).toHaveLength(2)
    expect(s.activeBoardId).toBe(id)
    // 既有板已占「看板 2」→ 新板应跳到「看板 3」
    expect(s.boards[1]?.name).toBe('看板 3')
    // 持久化
    expect(readPersisted().activeBoardId).toBe(id)
  })

  it('renameBoard 去空格、空名忽略', () => {
    const store = new DockStore()
    store.renameBoard('b-default', '  本周聚焦  ')
    expect(store.getSnapshot().boards[0]?.name).toBe('本周聚焦')
    store.renameBoard('b-default', '   ')
    expect(store.getSnapshot().boards[0]?.name).toBe('本周聚焦')
  })

  it('removeBoard 末板不可删；删激活板回落首板', () => {
    storage.setItem(KEY, JSON.stringify({
      version: 2,
      boards: [
        { id: 'b1', name: '一', tiles: [] },
        { id: 'b2', name: '二', tiles: [tile('t1', 'x')] },
      ],
      activeBoardId: 'b2',
    }))
    const store = new DockStore()
    store.removeBoard('b1') // 激活板是 b2，删 b1
    expect(store.getSnapshot().boards.map(b => b.id)).toEqual(['b2'])
    store.removeBoard('b2') // 末板
    expect(store.getSnapshot().boards).toHaveLength(1)
    // 删激活板 → 回落首板
    storage.setItem(KEY, JSON.stringify({
      version: 2,
      boards: [
        { id: 'b1', name: '一', tiles: [] },
        { id: 'b2', name: '二', tiles: [] },
      ],
      activeBoardId: 'b2',
    }))
    const store2 = new DockStore()
    store2.removeBoard('b2')
    expect(store2.getSnapshot().activeBoardId).toBe('b1')
  })

  it('setActiveBoard 忽略未知 id', () => {
    const store = new DockStore()
    store.setActiveBoard('nope')
    expect(store.getSnapshot().activeBoardId).toBe('b-default')
  })
})

describe('store v2 tile 操作作用于激活板', () => {
  const seedTwoBoards = (): void => {
    storage.setItem(KEY, JSON.stringify({
      version: 2,
      boards: [
        { id: 'b1', name: '一', tiles: [] },
        { id: 'b2', name: '二', tiles: [] },
      ],
      activeBoardId: 'b2',
    }))
  }

  it('pin 落位激活板；另一板不受影响', () => {
    seedTwoBoards()
    const store = new DockStore()
    store.pin({ kind: 'panel', meta: {} }, '新面板')
    const s = store.getSnapshot()
    expect(s.boards.find(b => b.id === 'b2')?.tiles).toHaveLength(1)
    expect(s.boards.find(b => b.id === 'b1')?.tiles).toHaveLength(0)
  })

  it('setTileAlias 设置/清除别名；空串视为清除', () => {
    seedTwoBoards()
    const store = new DockStore()
    const t = store.pin({ kind: 'panel', meta: {} }, '原名')
    store.setTileAlias(t.tileId, '别名')
    expect(store.getSnapshot().boards[1]?.tiles[0]?.alias).toBe('别名')
    store.setTileAlias(t.tileId, '')
    expect(store.getSnapshot().boards[1]?.tiles[0]?.alias).toBeUndefined()
    store.setTileAlias(t.tileId, '再设')
    store.setTileAlias(t.tileId, null)
    expect(store.getSnapshot().boards[1]?.tiles[0]?.alias).toBeUndefined()
  })

  it('applyLayout 只改激活板', () => {
    seedTwoBoards()
    const store = new DockStore()
    const t1 = store.pin({ kind: 'panel', meta: {} }, 'A')
    store.pin({ kind: 'panel', meta: {} }, 'B')
    store.setActiveBoard('b1')
    store.applyLayout([{ i: t1.tileId, x: 3, y: 2, w: 4, h: 2 }, { i: 'unknown', x: 0, y: 0, w: 1, h: 1 }])
    // 激活板是 b1（空板）→ t1 属于 b2，不受影响
    expect(store.getSnapshot().boards.find(b => b.id === 'b2')?.tiles.find(x => x.tileId === t1.tileId)?.layout.column).toBe(0)
  })

  it('clear / compact 只作用于激活板', () => {
    seedTwoBoards()
    const store = new DockStore()
    store.pin({ kind: 'panel', meta: {} }, 'A')
    store.setActiveBoard('b1')
    store.pin({ kind: 'panel', meta: {} }, 'B')
    store.clear() // 清空 b1
    const s = store.getSnapshot()
    expect(s.boards.find(b => b.id === 'b1')?.tiles).toHaveLength(0)
    expect(s.boards.find(b => b.id === 'b2')?.tiles).toHaveLength(1)
    store.compact() // 空板 compact 无 emit，不炸
    expect(store.getSnapshot().boards.find(b => b.id === 'b2')?.tiles).toHaveLength(1)
  })
})
