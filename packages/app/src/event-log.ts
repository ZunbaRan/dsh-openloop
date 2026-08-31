/**
 * 系统事件 ring buffer（自管理四件套之三，2026-08-31）——「系统记得自己发生过什么」。
 *
 * 事件源（本包内钩子）：
 * - registry 变更（connect/disconnect/reconnect/delete/upsert 注册——facade 写路径统一入口）
 * - backend 状态迁移（watchdog 重启等——backend.start/restart 钩子处记）
 * - MCP server 状态（app 侧只记 manage 动作；runtime 侧的连接态迁移由 mcp 包经
 *   globalThis 单例写入，此处读取合并）
 *
 * 跨插件写入经 globalThis.__openloopEventLog（同 api-usage 单例纪律）。
 * 内存 ring（默认 200 条），零持久化。
 */

export interface SystemEvent {
  readonly at: number
  readonly kind: 'registry' | 'backend' | 'mcp' | 'dock'
  readonly level: 'info' | 'warn' | 'error'
  readonly text: string
}

interface EventLogStore {
  events: SystemEvent[]
  cap: number
}

const GLOBAL_KEY = '__openloopEventLog'
const CAP_DEFAULT = 200

function store(): EventLogStore {
  const g = globalThis as Record<string, unknown>
  let s = g[GLOBAL_KEY] as EventLogStore | undefined
  if (s === undefined) {
    s = { events: [], cap: CAP_DEFAULT }
    g[GLOBAL_KEY] = s
  }
  return s
}

/** 记一条系统事件（任意包；文本面向用户，中文短句）。失败静默。 */
export function recordSystemEvent(kind: SystemEvent['kind'], level: SystemEvent['level'], text: string): void {
  try {
    const s = store()
    s.events.push({ at: Date.now(), kind, level, text })
    if (s.events.length > s.cap) s.events.splice(0, s.events.length - s.cap)
  } catch { /* 静默 */ }
}

/** 快照（新→旧；limit 截断）。 */
export function snapshotSystemEvents(limit = 100): SystemEvent[] {
  const s = store()
  return [...s.events].reverse().slice(0, Math.max(1, limit))
}
