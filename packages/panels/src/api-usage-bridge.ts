/**
 * api-usage 埋点桥（panels 侧，2026-08-31 自管理四件套）。
 *
 * 与 app 包的 api-usage.ts 共享 globalThis.__openloopApiUsage 单例——
 * 三包零依赖（panels 不 import app；同 window 直通桥纪律）。
 * 这里只放最小写入面（recordApiUsage）；聚合读取面在 app 包（端点输出）。
 *
 * 契约（与 app/src/api-usage.ts 保持一致）：
 * globalThis.__openloopApiUsage = { stats: Map<string, {source, kind, total,
 *   failures, records: {at, ok, ms}[]}>, windowMs }
 */

interface UsageStat {
  source: string
  kind: 'panel-binding' | 'mcp-call'
  total: number
  failures: number
  records: Array<{ at: number; ok: boolean; ms: number }>
}

interface UsageStore {
  stats: Map<string, UsageStat>
  windowMs: number
}

const GLOBAL_KEY = '__openloopApiUsage'
const RECORDS_CAP = 50

/** 记一次面板数据绑定调用。失败静默——埋点永不影响数据解析主流程。 */
export function recordApiUsage(source: string, kind: 'panel-binding' | 'mcp-call', ok: boolean, ms: number): void {
  try {
    const g = globalThis as Record<string, unknown>
    let s = g[GLOBAL_KEY] as UsageStore | undefined
    if (s === undefined) {
      s = { stats: new Map(), windowMs: 24 * 60 * 60 * 1000 }
      g[GLOBAL_KEY] = s
    }
    let stat = s.stats.get(source)
    if (stat === undefined) {
      stat = { source, kind, total: 0, failures: 0, records: [] }
      s.stats.set(source, stat)
    }
    stat.total += 1
    if (!ok) stat.failures += 1
    stat.records.push({ at: Date.now(), ok, ms })
    if (stat.records.length > RECORDS_CAP) stat.records.splice(0, stat.records.length - RECORDS_CAP)
  } catch { /* 静默 */ }
}
