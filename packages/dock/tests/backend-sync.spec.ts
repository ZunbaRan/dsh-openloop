/**
 * M3 后端同步语义测试：
 * - resolveBackendPlan 纯函数：三态决策（未装/降级/权威载入/迁移）
 * - syncBackend 编排（hooks 注入 fake fetch/push）：载入、迁移、写挂钩、降级返回
 * - store 的 importState / setRemotePersist / suppress 语义（含 v1 远端负载迁移）
 * - mergeApps：内置优先去重
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchRemoteBoards, pushRemoteBoards, resolveBackendPlan, syncBackend, type RemoteBoardsResult } from '../src/client/backend-sync.ts'
import { DockStore } from '../src/client/store.ts'
import { fetchRegistryRev, mergeApps, type AppDescriptor } from '../src/client/app-registry.ts'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string): void { this.map.set(k, String(v)) }
  removeItem(k: string): void { this.map.delete(k) }
}

let storage: MemoryStorage
const KEY = 'openloop.dock.board.v1'
const tile = (id: string, title: string) => ({
  tileId: id, title,
  source: { kind: 'panel', meta: { panel: { id: id.replace(/^t-/, '') } } },
  layout: { column: 0, row: 0, columns: 6, rows: 4 },
  origin: null, createdAt: 1,
})

beforeEach(() => {
  storage = new MemoryStorage()
  vi.stubGlobal('localStorage', storage)
})

describe('resolveBackendPlan（纯函数三态）', () => {
  const localState = {
    version: 2 as const,
    boards: [{ id: 'b1', name: '一', tiles: [tile('t1', 'x') as never] }],
    activeBoardId: 'b1',
  }

  it('404（未装 dsh-app）→ local 静默', () => {
    const plan = resolveBackendPlan({ remote: { kind: 'not-installed', state: undefined }, localState })
    expect(plan).toEqual({ mode: 'local', importRemote: null, migrate: false })
  })

  it('网络错/5xx/超时 → degraded（提示条语义）', () => {
    const plan = resolveBackendPlan({ remote: { kind: 'degraded', state: undefined }, localState })
    expect(plan.mode).toBe('degraded')
  })

  it('门面有数据 → remote 权威载入', () => {
    const plan = resolveBackendPlan({ remote: { kind: 'ok', state: localState }, localState })
    expect(plan).toEqual({ mode: 'remote', importRemote: localState, migrate: false })
  })

  it('门面空 + 本地有内容 → remote + 迁移；本地空 → remote 空转', () => {
    const emptyRemote: RemoteBoardsResult = { kind: 'ok', state: null }
    expect(resolveBackendPlan({ remote: emptyRemote, localState })).toEqual({ mode: 'remote', importRemote: null, migrate: true })
    const emptyLocal = { version: 2 as const, boards: [{ id: 'b1', name: '一', tiles: [] }], activeBoardId: 'b1' }
    expect(resolveBackendPlan({ remote: emptyRemote, localState: emptyLocal })).toEqual({ mode: 'remote', importRemote: null, migrate: false })
  })
})

describe('fetchRemoteBoards / pushRemoteBoards（fetch 真通道，SPA fallback 判定）', () => {
  const jsonResponse = (status: number, body: unknown): Response =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

  it('SPA fallback（200 + text/html）→ not-installed（静默 local，不出提示条）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<!doctype html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } })))
    expect(await fetchRemoteBoards()).toEqual({ kind: 'not-installed', state: undefined })
    vi.unstubAllGlobals()
  })

  it('404 JSON → not-installed；500 → degraded；正常 → ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(404, { error: 'x' })))
    expect((await fetchRemoteBoards()).kind).toBe('not-installed')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(500, { error: 'x' })))
    expect((await fetchRemoteBoards()).kind).toBe('degraded')
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { state: { version: 2, boards: [], activeBoardId: 'x' } })))
    expect((await fetchRemoteBoards()).kind).toBe('ok')
    vi.unstubAllGlobals()
  })

  it('网络异常 → degraded；PUT 对 HTML 应答返回 false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('network down') }))
    expect((await fetchRemoteBoards()).kind).toBe('degraded')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } })))
    expect(await pushRemoteBoards({ version: 2, boards: [], activeBoardId: '' })).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('syncBackend 编排（fake 通道注入）', () => {
  it('权威载入：门面数据替换本地 + 安装写挂钩（后续 emit 推送）', async () => {
    const store = new DockStore()
    const remote = { version: 2, boards: [{ id: 'b-remote', name: '远端板', tiles: [tile('t-r', '远端 tile')] }], activeBoardId: 'b-remote' }
    const pushed: unknown[] = []
    const mode = await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: remote }),
      pushBoards: async state => { pushed.push(state); return true },
    })
    expect(mode).toBe('remote')
    expect(store.getSnapshot().boards[0]?.id).toBe('b-remote')
    // 写挂钩：后续变更推送门面
    store.addBoard()
    expect(pushed).toHaveLength(1)
    expect((pushed[0] as { boards: unknown[] }).boards.length).toBe(2)
  })

  it('迁移：门面空 + 本地有数据 → 上传本地后 remote', async () => {
    storage.setItem(KEY, JSON.stringify({ version: 2, boards: [{ id: 'b1', name: '一', tiles: [tile('t1', 'x')] }], activeBoardId: 'b1' }))
    const store = new DockStore()
    const pushed: unknown[] = []
    const mode = await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }),
      pushBoards: async state => { pushed.push(state); return true },
    })
    expect(mode).toBe('remote')
    expect(pushed).toHaveLength(1)
    expect((pushed[0] as { boards: Array<{ id: string }> }).boards[0]?.id).toBe('b1')
  })

  it('迁移失败 → degraded（不装写挂钩，本地不受影响）', async () => {
    storage.setItem(KEY, JSON.stringify({ version: 2, boards: [{ id: 'b1', name: '一', tiles: [tile('t1', 'x')] }], activeBoardId: 'b1' }))
    const store = new DockStore()
    let pushed = 0
    const errors: string[] = []
    const mode = await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }),
      pushBoards: async () => { pushed++; return false },
      onRemoteError: m => errors.push(m),
    })
    expect(mode).toBe('degraded')
    expect(errors).toHaveLength(1)
    // 未装挂钩：后续变更不推送
    store.addBoard()
    expect(pushed).toBe(1) // 只有迁移那一次尝试
    // 本地数据完好
    expect(JSON.parse(storage.getItem(KEY)!).boards.length).toBe(2)
  })

  it('门面未装（404）→ local，写只落本地', async () => {
    const store = new DockStore()
    let pushed = 0
    const mode = await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'not-installed', state: undefined }),
      pushBoards: async () => { pushed++; return true },
    })
    expect(mode).toBe('local')
    store.addBoard()
    expect(pushed).toBe(0)
    expect(JSON.parse(storage.getItem(KEY)!).boards.length).toBe(2)
  })

  it('写推送失败 → onRemoteError 提示（本地副本照写）', async () => {
    const store = new DockStore()
    const errors: string[] = []
    await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }), // 空 + 本地空 → remote 空转
      pushBoards: async () => false,
      onRemoteError: m => errors.push(m),
    })
    store.addBoard()
    await new Promise(r => setTimeout(r, 10))
    expect(errors).toHaveLength(1)
    expect(JSON.parse(storage.getItem(KEY)!).boards.length).toBe(2)
  })
})

describe('store M3 扩展', () => {
  it('importState：合法 v2 替换；坏数据拒绝保持本地', () => {
    storage.setItem(KEY, JSON.stringify({ version: 2, boards: [{ id: 'b1', name: '一', tiles: [] }], activeBoardId: 'b1' }))
    const store = new DockStore()
    expect(store.importState({ version: 2, boards: [{ id: 'b2', name: '二', tiles: [tile('t2', 'x')] }], activeBoardId: 'b2' })).toBe(true)
    expect(store.getSnapshot().boards[0]?.id).toBe('b2')
    expect(store.importState({ version: 1, tiles: [] })).toBe(false) // 远端 v1 不迁（门面只存 v2）
    expect(store.importState('junk')).toBe(false)
    expect(store.getSnapshot().boards[0]?.id).toBe('b2')
  })

  it('importState 不回推（suppress 语义）：载入后的 emit 才推送', () => {
    const store = new DockStore()
    const pushed: unknown[] = []
    store.setRemotePersist(state => pushed.push(state))
    store.importState({ version: 2, boards: [{ id: 'b-r', name: '远端', tiles: [] }], activeBoardId: 'b-r' })
    expect(pushed).toHaveLength(0) // 载入本身不推
    store.addBoard()
    expect(pushed).toHaveLength(1) // 用户变更才推
  })
})

describe('mergeApps（内置优先去重）', () => {
  const app = (id: string): AppDescriptor => ({
    id, name: id, kind: 'local', version: '0.1.0', desc: '', components: [], apis: [],
  })

  it('门面追加；同 id 去重（本地优先）', () => {
    const merged = mergeApps([app('openloop')], [app('my-sales'), app('openloop')])
    expect(merged.map(a => a.id)).toEqual(['openloop', 'my-sales'])
  })
})

describe('fetchRegistryRev（P1 轻探）', () => {
  it('JSON 应答返回 rev；SPA fallback / 非 JSON 返回 null；网络错 null', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ state: 'running', registryRev: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    expect(await fetchRegistryRev()).toBe(3)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>', { status: 200, headers: { 'Content-Type': 'text/html' } })))
    expect(await fetchRegistryRev()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ state: 'running' }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
    expect(await fetchRegistryRev()).toBeNull()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('down') }))
    expect(await fetchRegistryRev()).toBeNull()
    vi.unstubAllGlobals()
  })
})
