/**
 * dsh-app 门面同步（M3，DOCK_V2_FRONTEND_IMPL §5/§7）：
 * - boards 通道：GET/PUT /openloop/app/boards（dock v2 state 全量）
 * - registry 通道：GET /openloop/app/registry（第三方/自研 APP 清单）
 * - 降级语义（决策纯函数 resolveBackendPlan 便于单测）：
 *   · 路由不存在（404 = dsh-app 未装）→ local 静默（没装后端不是错误）
 *   · 门面在但请求失败/超时/5xx → degraded（提示条）
 *   · 门面有数据 → remote（权威数据载入 + 之后写推送）
 *   · 门面空 + 本地有数据 → remote + 迁移（本地 → 门面一次性上传）
 * - 写推送 fire-and-forget：失败经 onRemoteError 回调（UI toast 一次）；
 *   localStorage 恒有本地副本（store 层双写），远端失败不丢数据
 */
import type { DockBoardState, DockStore } from './store.ts'

const BOARDS_URL = '/openloop/app/boards'
const REGISTRY_URL = '/openloop/app/registry'
const FETCH_TIMEOUT_MS = 4000

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

// ---- 同步决策（纯函数，单测锁定语义） ----

export interface BackendPlanInput {
  remote: RemoteBoardsResult
  /** 本地当前 state（含迁移后的 v2） */
  localState: DockBoardState
}

export interface BackendPlan {
  mode: BackendMode
  /** remote 模式：载入远端 state（null = 门面空，保持本地） */
  importRemote: unknown
  /** remote 模式：先把本地数据上传门面（迁移） */
  migrate: boolean
}

export function resolveBackendPlan(input: BackendPlanInput): BackendPlan {
  const { remote, localState } = input
  if (remote.kind === 'not-installed') {
    return { mode: 'local', importRemote: null, migrate: false }
  }
  if (remote.kind === 'degraded') {
    return { mode: 'degraded', importRemote: null, migrate: false }
  }
  // 门面应答（ok）：有数据 → 权威载入；空 → 本地有内容则迁移，否则空转 remote
  if (remote.state !== null) {
    return { mode: 'remote', importRemote: remote.state, migrate: false }
  }
  const localHasContent = localState.boards.some(b => b.tiles.length > 0)
  return { mode: 'remote', importRemote: null, migrate: localHasContent }
}

/**
 * 启动编排：读门面 → 决策 → 载入/迁移 → 安装写钩子。
 * 返回最终模式（UI 据此显示降级提示条）。绝不抛错（降级不炸页）。
 */
export async function syncBackend(
  store: DockStore,
  hooks: {
    fetchBoards?: typeof fetchRemoteBoards
    pushBoards?: typeof pushRemoteBoards
    onRemoteError?: (message: string) => void
  } = {},
): Promise<BackendMode> {
  const fetchBoards = hooks.fetchBoards ?? fetchRemoteBoards
  const pushBoards = hooks.pushBoards ?? pushRemoteBoards
  const remote = await fetchBoards()
  const plan = resolveBackendPlan({ remote, localState: store.getSnapshot() })

  if (plan.mode === 'remote') {
    if (plan.importRemote !== null) {
      // 权威数据载入（门面重启后数据在——M3 验收点）
      store.importState(plan.importRemote)
    } else if (plan.migrate) {
      // 一次性迁移：本地（localStorage）→ 门面
      const ok = await pushBoards(store.getSnapshot())
      if (!ok) {
        hooks.onRemoteError?.('看板数据迁移到后端失败——已保留本地存储，稍后自动重试')
        return 'degraded'
      }
    }
    // 安装写钩子：此后每次变更推送门面（失败提示一次，本地副本恒在）
    store.setRemotePersist(state => {
      void pushBoards(state).then(ok => {
        if (!ok) hooks.onRemoteError?.('后端同步失败——已本地保存（localStorage 副本不受影响）')
      })
    })
  }
  return plan.mode
}
