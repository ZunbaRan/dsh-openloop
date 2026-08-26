/**
 * P4 存储语义收紧测试：server-first + localStorage 镜像 + 恢复对齐。
 * - resolveBackendPlan：pendingSync 时 reconcile 优先于权威载入
 * - syncBackend：推送失败 → pending 标记；连续 2 次失败 → onDegradedChange(true)
 * - revalidateBackend：门面恢复 + pending → 回推对齐清标记；无 pending → 撤降级
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveBackendPlan, revalidateBackend, syncBackend } from '../src/client/backend-sync.ts'
import { DockStore } from '../src/client/store.ts'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null { return this.map.has(k) ? this.map.get(k)! : null }
  setItem(k: string, v: string): void { this.map.set(k, String(v)) }
  removeItem(k: string): void { this.map.delete(k) }
}

let storage: MemoryStorage
const KEY = 'openloop.dock.board.v1'
const PENDING_KEY = 'openloop.dock.pending-sync.v1'
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

describe('P4 · resolveBackendPlan 对齐优先', () => {
  const localState = {
    version: 2 as const,
    boards: [{ id: 'b1', name: '一', tiles: [tile('t1', 'x') as never] }],
    activeBoardId: 'b1',
  }

  it('pendingSync=true 且门面有数据 → reconcile（镜像回推），不权威载入', () => {
    const plan = resolveBackendPlan({ remote: { kind: 'ok', state: localState }, localState, pendingSync: true })
    expect(plan).toEqual({ mode: 'remote', importRemote: null, migrate: false, reconcile: true })
  })

  it('pendingSync=false → 权威载入（原 M3 语义不变）', () => {
    const plan = resolveBackendPlan({ remote: { kind: 'ok', state: localState }, localState, pendingSync: false })
    expect(plan).toEqual({ mode: 'remote', importRemote: localState, migrate: false, reconcile: false })
  })

  it('未装/降级不触发 reconcile', () => {
    expect(resolveBackendPlan({ remote: { kind: 'not-installed', state: undefined }, localState, pendingSync: true }).mode).toBe('local')
    expect(resolveBackendPlan({ remote: { kind: 'degraded', state: undefined }, localState, pendingSync: true }).mode).toBe('degraded')
  })
})

describe('P4 · syncBackend 推送失败语义', () => {
  it('写推送失败 → pending 标记落镜像；成功 → 清标记', async () => {
    const store = new DockStore()
    let pushOk = false
    const errors: string[] = []
    await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }), // 空 + 本地空 → remote 空转
      pushBoards: async () => pushOk,
      onRemoteError: m => errors.push(m),
    })
    expect(storage.getItem(PENDING_KEY)).toBeNull() // 空转没推送

    pushOk = false
    store.addBoard() // 触发推送（失败）
    await new Promise(r => setTimeout(r, 10))
    expect(storage.getItem(PENDING_KEY)).toBe('1')

    pushOk = true
    store.addBoard() // 再推（成功）
    await new Promise(r => setTimeout(r, 10))
    expect(storage.getItem(PENDING_KEY)).toBeNull()
  })

  it('连续 2 次推送失败 → onDegradedChange(true)；成功恢复 → (false)', async () => {
    const store = new DockStore()
    let pushOk = false
    const degradedStates: boolean[] = []
    await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }),
      pushBoards: async () => pushOk,
      onDegradedChange: d => degradedStates.push(d),
    })
    store.addBoard() // 失败 #1（单次：pending 但不降级）
    await new Promise(r => setTimeout(r, 10))
    expect(degradedStates).toEqual([])
    store.addBoard() // 失败 #2 → 降级
    await new Promise(r => setTimeout(r, 10))
    expect(degradedStates).toEqual([true])
    pushOk = true
    store.addBoard() // 成功 → 撤降级
    await new Promise(r => setTimeout(r, 10))
    expect(degradedStates).toEqual([true, false])
  })

  it('启动时 pendingSync + 门面有数据 → reconcile 回推清标记', async () => {
    // 镜像：一个 tile；pending 标记开（上次会话降级期改过）
    storage.setItem(KEY, JSON.stringify({ version: 2, boards: [{ id: 'b1', name: '一', tiles: [tile('t1', 'x')] }], activeBoardId: 'b1' }))
    storage.setItem(PENDING_KEY, '1')
    const store = new DockStore()
    const pushed: unknown[] = []
    const mode = await syncBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: { version: 2, boards: [{ id: 'b-remote', name: '远端', tiles: [] }], activeBoardId: 'b-remote' } }),
      pushBoards: async state => { pushed.push(state); return true },
    })
    expect(mode).toBe('remote')
    // 回推的是本地（镜像）而非远端载入
    expect((pushed[0] as { boards: Array<{ id: string }> }).boards[0]?.id).toBe('b1')
    expect(store.getSnapshot().boards[0]?.id).toBe('b1') // 本地保留
    expect(storage.getItem(PENDING_KEY)).toBeNull() // 标记清
  })
})

describe('P4 · revalidateBackend 恢复对齐', () => {
  it('门面恢复 + pending → 回推对齐 + 撤降级；无 pending → 只撤降级', async () => {
    const store = new DockStore()
    // 场景 A：pending
    storage.setItem(PENDING_KEY, '1')
    const pushed: unknown[] = []
    const degradedA: boolean[] = []
    const modeA = await revalidateBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: { version: 2, boards: [{ id: 'b-x', name: 'x', tiles: [] }], activeBoardId: 'b-x' } }),
      pushBoards: async state => { pushed.push(state); return true },
      onDegradedChange: d => degradedA.push(d),
    })
    expect(modeA).toBe('remote')
    expect(pushed).toHaveLength(1)
    expect(storage.getItem(PENDING_KEY)).toBeNull()
    expect(degradedA).toEqual([false])

    // 场景 B：无 pending
    const degradedB: boolean[] = []
    const modeB = await revalidateBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }),
      pushBoards: async () => true,
      onDegradedChange: d => degradedB.push(d),
    })
    expect(modeB).toBe('remote')
    expect(degradedB).toEqual([false])
  })

  it('门面仍不可达 → degraded；对齐失败 → degraded 且标记保留', async () => {
    const store = new DockStore()
    storage.setItem(PENDING_KEY, '1')
    const mode = await revalidateBackend(store, {
      fetchBoards: async () => ({ kind: 'degraded', state: undefined }),
      pushBoards: async () => false,
    })
    expect(mode).toBe('degraded')
    expect(storage.getItem(PENDING_KEY)).toBe('1')

    const mode2 = await revalidateBackend(store, {
      fetchBoards: async () => ({ kind: 'ok', state: null }),
      pushBoards: async () => false, // 可达但回推失败
    })
    expect(mode2).toBe('degraded')
    expect(storage.getItem(PENDING_KEY)).toBe('1') // 标记保留（下次再试）
  })
})
