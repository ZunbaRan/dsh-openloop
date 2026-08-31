/**
 * API 调用监控埋点（自管理四件套之二，2026-08-31）。
 *
 * 「系统在观察自己被怎么用」的数据底座：panels 数据绑定解析与 mcp-runtime
 * callTool 两处记录，app 包的 /openloop/app/api-usage 端点聚合输出。
 *
 * 跨插件共享经 globalThis 单例（__openloopApiUsage）：panels / mcp-runtime /
 * app 三个包零依赖耦合（同 window 直通桥的既有纪律），任一缺席不影响其余。
 *
 * 内存 ring：每 source（rid 或 serverId）保留最近 windowMs 的调用记录 +
 * 永久计数。零持久化——重启清零对「监控」语义可接受（如需历史再入库）。
 */

export interface ApiUsageRecord {
  readonly at: number
  readonly ok: boolean
  readonly ms: number
}

export interface ApiUsageSourceStat {
  readonly source: string
  readonly kind: 'panel-binding' | 'mcp-call'
  total: number
  failures: number
  readonly records: ApiUsageRecord[]
}

interface ApiUsageStore {
  stats: Map<string, ApiUsageSourceStat>
  windowMs: number
}

const WINDOW_MS_DEFAULT = 24 * 60 * 60 * 1000
const RECORDS_CAP = 50

const GLOBAL_KEY = '__openloopApiUsage'

function store(): ApiUsageStore {
  const g = globalThis as Record<string, unknown>
  let s = g[GLOBAL_KEY] as ApiUsageStore | undefined
  if (s === undefined) {
    s = { stats: new Map(), windowMs: WINDOW_MS_DEFAULT }
    g[GLOBAL_KEY] = s
  }
  return s
}

/** 记一次调用（panels 数据绑定 / MCP 工具调用）。ms = 耗时；ok = 是否成功。 */
export function recordApiUsage(source: string, kind: ApiUsageSourceStat['kind'], ok: boolean, ms: number): void {
  try {
    const s = store()
    let stat = s.stats.get(source)
    if (stat === undefined) {
      stat = { source, kind, total: 0, failures: 0, records: [] }
      s.stats.set(source, stat)
    }
    stat.total += 1
    if (!ok) stat.failures += 1
    stat.records.push({ at: Date.now(), ok, ms })
    if (stat.records.length > RECORDS_CAP) stat.records.splice(0, stat.records.length - RECORDS_CAP)
  } catch { /* 埋点永不影响主流程 */ }
}

/** 聚合快照（app 端点输出；prune 掉窗口外记录但保留计数）。 */
export function snapshotApiUsage(): { windowMs: number; sources: Array<{ source: string; kind: string; total: number; failures: number; avgMs: number | null; recent: Array<{ at: number; ok: boolean; ms: number }> }> } {
  const s = store()
  const now = Date.now()
  const sources: Array<{ source: string; kind: string; total: number; failures: number; avgMs: number | null; recent: Array<{ at: number; ok: boolean; ms: number }> }> = []
  for (const stat of s.stats.values()) {
    const recent = stat.records.filter(r => now - r.at <= s.windowMs)
    if (stat.total === 0 && recent.length === 0) continue
    const avg = recent.length > 0 ? Math.round(recent.reduce((n, r) => n + r.ms, 0) / recent.length) : null
    sources.push({
      source: stat.source,
      kind: stat.kind,
      total: stat.total,
      failures: stat.failures,
      avgMs: avg,
      recent: recent.map(r => ({ at: r.at, ok: r.ok, ms: r.ms })),
    })
  }
  sources.sort((a, b) => b.total - a.total)
  return { windowMs: s.windowMs, sources }
}
