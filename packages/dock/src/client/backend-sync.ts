/**
 * dsh-app 门面同步（M3 + P4 存储语义收紧）：
 * - boards 通道：GET/PUT /openloop/app/boards（dock v2 state 全量）
 * - registry 通道：GET /openloop/app/registry（第三方/自研 APP 清单）
 * - 降级语义（决策纯函数 resolveBackendPlan 便于单测）：
 *   · 路由不存在（404 / SPA fallback = dsh-app 未装）→ local 静默
 *   · 门面在但请求失败/超时/5xx → degraded（提示条）
 *   · 门面有数据 → remote（权威数据载入 + 之后写推送）
 *   · 门面空 + 本地有数据 → remote + 迁移（本地 → 门面一次性上传）
 *
 * P4 · server-first（服务接管路线）：
 * - localStorage 定位 = **缓存镜像**（不再是「兜底」）：写路径门面优先，
 *   门面失败才落镜像 + pendingSync 标记；镜像里有用户未对齐的修改
 * - 门面恢复（P1 轻探循环回调 revalidate()）→ 拉门面权威 + 若有 pendingSync
 *   则回推对齐（镜像 → 门面），成功后清标记——「恢复后自动对齐」闭环
 * - 推送失败连续 N 次（2）→ onDegraded 切降级提示条；恢复即撤销
 */
import type { DockBoardState, DockStore } from './store.ts'

const BOARDS_URL = '/openloop/app/boards'
const REGISTRY_URL = '/openloop/app/registry'
const FETCH_TIMEOUT_MS = 4000

/** 推送失败连续多少次判定进入降级（成功即清零） */
const PUSH_FAILURES_TO_DEGRADE = 2

/** localStorage 镜像的 pending 标记 key（有值 = 镜像含未对齐到门面的修改） */
const PENDING_SYNC_KEY = 'openloop.dock.pending-sync.v1'

export type BackendMode = 'local' | 'remote' | 'degraded'

export interface RemoteBoardsResult {
  /** 未装（404 或 SPA fallback HTML）= local 静默；ok = 门面应答（state 可为 null）；其余 = degraded */
  kind: 'not-installed' | 'ok' | 'degraded'
  state: unknown
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; contentType: string; body: unknown } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { ...init, signal: controller.signal })
    const contentType = res.headers.get('content-type') ?? ''
    // DSH webServer 对未知路径回落 SPA（200 + text/html）——非 JSON 应答视作路由不存在
    if (!contentType.includes('application/json')) return null
    const text = await res.text()
    return { status: res.status, contentType, body: text.length === 0 ? undefined : JSON.parse(text) }
  } finally {
    clearTimeout(timer)
  }
}

/** GET /openloop/app/boards —— 三态结果 */
export async function fetchRemoteBoards(): Promise<RemoteBoardsResult> {
  try {
    const res = await fetchJson(BOARDS_URL)
    if (res === null) return { kind: 'not-installed', state: undefined }
    if (res.status === 404) return { kind: 'not-installed', state: undefined }
    if (!okStatus(res.status)) return { kind: 'degraded', state: undefined }
    const state = (res.body as { state?: unknown } | undefined)?.state
    return { kind: 'ok', state: state === null ? null : state }
  } catch {
    return { kind: 'degraded', state: undefined }
  }
}

/** PUT /openloop/app/boards —— 全量推送（失败返回 false） */
export async function pushRemoteBoards(state: DockBoardState): Promise<boolean> {
  try {
    const res = await fetchJson(BOARDS_URL, { method: 'PUT', body: JSON.stringify(state) })
    return res !== null && okStatus(res.status)
  } catch {
    return false
  }
}

function okStatus(status: number): boolean {
  return status >= 200 && status < 300
}

// ---- pendingSync 标记（localStorage 镜像的「含未对齐修改」位） ----

export function readPendingSync(): boolean {
  try { return localStorage.getItem(PENDING_SYNC_KEY) === '1' } catch { return false }
}

function writePendingSync(pending: boolean): void {
  try {
    if (pending) localStorage.setItem(PENDING_SYNC_KEY, '1')
    else localStorage.removeItem(PENDING_SYNC_KEY)
  } catch { /* ignore */ }
}

// ---- 同步决策（纯函数，单测锁定语义） ----

export interface BackendPlanInput {
  remote: RemoteBoardsResult
  /** 本地当前 state（含迁移后的 v2） */
  localState: DockBoardState
  /** 镜像有未对齐修改（P4：恢复对齐优先于权威载入） */
  pendingSync: boolean
}

export interface BackendPlan {
  mode: BackendMode
  /** remote 模式：载入远端 state（null = 门面空，保持本地） */
  importRemote: unknown
  /** remote 模式：先把本地数据上传门面（迁移） */
  migrate: boolean
  /** P4：恢复对齐——门面有数据但镜像有未对齐修改 → 回推镜像 */
  reconcile: boolean
}

export function resolveBackendPlan(input: BackendPlanInput): BackendPlan {
  const { remote, localState, pendingSync } = input
  if (remote.kind === 'not-installed') {
    return { mode: 'local', importRemote: null, migrate: false, reconcile: false }
  }
  if (remote.kind === 'degraded') {
    return { mode: 'degraded', importRemote: null, migrate: false, reconcile: false }
  }
  // 门面应答（ok）：有数据 → 权威载入（除非镜像有未对齐修改——对齐优先，见 reconcile）；
  // 空 → 本地有内容则迁移，否则空转 remote
  if (remote.state !== null) {
    if (pendingSync) {
      // 镜像含未对齐修改：本地（用户操作过）回推门面——最后写入者胜（单用户场景语义正确）
      return { mode: 'remote', importRemote: null, migrate: false, reconcile: true }
    }
    return { mode: 'remote', importRemote: remote.state, migrate: false, reconcile: false }
  }
  const localHasContent = localState.boards.some(b => b.tiles.length > 0)
  return { mode: 'remote', importRemote: null, migrate: localHasContent, reconcile: false }
}

export interface SyncHooks {
  fetchBoards?: typeof fetchRemoteBoards
  pushBoards?: typeof pushRemoteBoards
  onRemoteError?: (message: string) => void
  /** P4：连续推送失败 → 降级提示条；恢复（revalidate 成功）→ 撤销 */
  onDegradedChange?: (degraded: boolean) => void
  /** 供测试注入的 pending 读写（缺省 localStorage） */
  readPending?: () => boolean
  writePending?: (pending: boolean) => void
}

/** 装配推送钩子（syncBackend 与 revalidate 共用）：失败计数 → pending 标记 → 降级切换 */
function attachPushHandler(store: DockStore, hooks: SyncHooks): void {
  let pushFailures = 0
  let degraded = false
  const readPending = hooks.readPending ?? readPendingSync
  const writePending = hooks.writePending ?? writePendingSync

  const setDegraded = (next: boolean): void => {
    if (next === degraded) return
    degraded = next
    hooks.onDegradedChange?.(next)
  }

  store.setRemotePersist(state => {
    void pushHook(state).catch(() => { /* pushHook 内部已处理 */ })
  })

  async function pushHook(state: DockBoardState): Promise<void> {
    const ok = await (hooks.pushBoards ?? pushRemoteBoards)(state)
    if (ok) {
      pushFailures = 0
      writePending(false)
      setDegraded(false)
    } else {
      pushFailures++
      writePending(true)
      if (pushFailures >= PUSH_FAILURES_TO_DEGRADE) {
        setDegraded(true)
        hooks.onRemoteError?.('后端同步失败——已保存本地镜像（恢复后自动对齐）')
      }
    }
  }
}

/**
 * 启动编排：读门面 → 决策 → 载入/迁移/对齐 → 安装写钩子。
 * 返回最终模式（UI 据此显示降级提示条）。绝不抛错（降级不炸页）。
 */
export async function syncBackend(
  store: DockStore,
  hooks: SyncHooks = {},
): Promise<BackendMode> {
  const fetchBoards = hooks.fetchBoards ?? fetchRemoteBoards
  const pushBoards = hooks.pushBoards ?? pushRemoteBoards
  const readPending = hooks.readPending ?? readPendingSync
  const writePending = hooks.writePending ?? writePendingSync

  const remote = await fetchBoards()
  const plan = resolveBackendPlan({ remote, localState: store.getSnapshot(), pendingSync: readPending() })

  if (plan.mode === 'remote') {
    if (plan.reconcile) {
      // P4 恢复对齐：镜像（用户在降级期的修改）回推门面，成功清 pending
      const ok = await pushBoards(store.getSnapshot())
      if (!ok) {
        hooks.onRemoteError?.('本地修改对齐到后端失败——镜像已保留，稍后自动重试')
        return 'degraded'
      }
      writePending(false)
    } else if (plan.importRemote !== null) {
      // 权威数据载入（门面重启后数据在——M3 验收点）
      store.importState(plan.importRemote)
    } else if (plan.migrate) {
      // 一次性迁移：本地（localStorage 镜像）→ 门面
      const ok = await pushBoards(store.getSnapshot())
      if (!ok) {
        hooks.onRemoteError?.('看板数据迁移到后端失败——已保留本地镜像，稍后自动重试')
        return 'degraded'
      }
      writePending(false)
    }
    // 安装写钩子（P4：server-first 推送 + 失败计数 + pending + 降级切换）
    attachPushHandler(store, hooks)
  }
  return plan.mode
}

/**
 * P4：恢复探测后的对齐入口（P1 轻探发现门面恢复时调用）。
 * 门面可达 → 若 pendingSync 则回推镜像（对齐），返回 remote；不可达 → 原样返回。
 * 供 dock 的轻探循环复用（避免整页 syncBackend 重跑——那会重装钩子造成重复推送）。
 */
export async function revalidateBackend(
  store: DockStore,
  hooks: SyncHooks = {},
): Promise<BackendMode> {
  const fetchBoards = hooks.fetchBoards ?? fetchRemoteBoards
  const pushBoards = hooks.pushBoards ?? pushRemoteBoards
  const readPending = hooks.readPending ?? readPendingSync
  const writePending = hooks.writePending ?? writePendingSync

  const remote = await fetchBoards()
  if (remote.kind === 'not-installed') return 'local'
  if (remote.kind === 'degraded') return 'degraded'

  // 门面恢复：pending 修改回推对齐
  if (readPending()) {
    const ok = await pushBoards(store.getSnapshot())
    if (ok) {
      writePending(false)
      hooks.onDegradedChange?.(false)
      return 'remote'
    }
    return 'degraded'
  }
  hooks.onDegradedChange?.(false)
  return 'remote'
}
