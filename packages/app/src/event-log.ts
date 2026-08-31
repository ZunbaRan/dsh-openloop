/**
 * 系统事件（自管理四件套，0.5.0 起持久化）——「系统记得自己发生过什么」。
 *
 * 0.5.0 架构（2026-08-31 用户反馈落地）：**PB 集合 app_events 为权威存储**
 * （重启保留）；内存 ring 降级为写加速 + PB 未就绪时的降级缓冲。
 * 写入方：app 内 connect/disconnect/delete 等钩子 + 浏览器端/mcp 侧经
 * POST /openloop/app/events（面板/沙箱里发生的动作）。
 *
 * 跨包纪律不变：这里只定义「门面写入接口」；panels/mcp-runtime 的
 * recordSystemEvent bridge 改为 fetch 该端点（不再共享 globalThis 单例）。
 */

export interface SystemEvent {
  readonly at: number
  readonly kind: 'registry' | 'backend' | 'mcp' | 'dock'
  readonly level: 'info' | 'warn' | 'error'
  readonly text: string
}

/** 写入通道（routes 侧注入：写 PB；PB 未就绪时写降级 ring） */
export interface EventWriter {
  append(event: SystemEvent): Promise<void>
}

interface EventLogStore {
  events: SystemEvent[]
  cap: number
}

const GLOBAL_KEY = '__openloopEventLog'
const CAP_DEFAULT = 200

/** 降级 ring（globalThis——PB 未就绪时的现场保底；正常路径不用） */
function fallbackRing(): EventLogStore {
  const g = globalThis as Record<string, unknown>
  let s = g[GLOBAL_KEY] as EventLogStore | undefined
  if (s === undefined) {
    s = { events: [], cap: CAP_DEFAULT }
    g[GLOBAL_KEY] = s
  }
  return s
}

/** 读取通道（routes 侧注入：PB 查询；未注入时读降级 ring——单测/早期启动） */
export interface EventReader {
  list(limit: number): Promise<SystemEvent[]>
}

/** ring 快照（新→旧） */
export function ringSnapshot(limit = 100): SystemEvent[] {
  const s = fallbackRing()
  return [...s.events].reverse().slice(0, Math.max(1, limit))
}

export function ringAppend(event: SystemEvent): void {
  const s = fallbackRing()
  s.events.push(event)
  if (s.events.length > s.cap) s.events.splice(0, s.events.length - s.cap)
}

/** 同步记录（app 包内部钩子用）：写 ring + 异步落 PB（writer 已注入时） */
export function createEventRecorder(getWriter: () => EventWriter | undefined): (kind: SystemEvent['kind'], level: SystemEvent['level'], text: string) => void {
  return (kind, level, text) => {
    const event: SystemEvent = { at: Date.now(), kind, level, text }
    try { ringAppend(event) } catch { /* 静默 */ }
    const writer = getWriter()
    if (writer !== undefined) void writer.append(event).catch(() => undefined)
  }
}

/** PB 事件 writer（批量合写缓冲：同 tick 多事件一次 POST，失败静默留 ring） */
export function createPbEventWriter(getPb: () => import('./pb-client.ts').PbClient | undefined): EventWriter {
  let buffer: SystemEvent[] = []
  let flushing = false
  const flush = async (): Promise<void> => {
    if (flushing || buffer.length === 0) return
    flushing = true
    const batch = buffer
    buffer = []
    try {
      const pb = getPb()
      if (pb === undefined) return
      for (const e of batch) {
        await pb.request('POST', '/api/collections/app_events/records', {
          at: e.at, kind: e.kind, level: e.level, text: e.text.slice(0, 500),
        })
      }
    } catch {
      // PB 写失败：事件已在 ring（降级可见），不重试不阻塞主流程
    } finally {
      flushing = false
      if (buffer.length > 0) void flush()
    }
  }
  return {
    append(event) {
      buffer.push(event)
      if (buffer.length >= 8) return flush()
      // 微任务合批（同 tick 高频事件一次刷）
      return new Promise<void>(resolve => { setTimeout(() => { void flush().finally(resolve) }, 50) })
    },
  }
}

/** PB 事件 reader（按 at 倒序取 limit 条） */
export function createPbEventReader(getPb: () => import('./pb-client.ts').PbClient | undefined): EventReader {
  return {
    async list(limit) {
      const pb = getPb()
      if (pb === undefined) return ringSnapshot(limit)
      const params = new URLSearchParams({ page: '1', perPage: String(Math.min(200, Math.max(1, limit))), sort: '-at' })
      const res = await pb.request<{ items?: Array<Record<string, unknown>> }>('GET', `/api/collections/app_events/records?${params.toString()}`)
      return (res?.items ?? [])
        .map(r => ({
          at: typeof r.at === 'number' ? r.at : 0,
          kind: (typeof r.kind === 'string' ? r.kind : 'registry') as SystemEvent['kind'],
          level: (typeof r.level === 'string' ? r.level : 'info') as SystemEvent['level'],
          text: typeof r.text === 'string' ? r.text : '',
        }))
        .filter(e => e.at > 0 && e.text.length > 0)
    },
  }
}
