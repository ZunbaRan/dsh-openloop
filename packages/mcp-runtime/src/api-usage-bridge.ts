/**
 * api-usage 埋点桥（mcp-runtime 侧，0.5.0）：
 * 服务端 Node 包——不绕 HTTP 自调（app 的端点在本进程的 webserver 上），
 * 改回 globalThis.__openloopApiUsage 内存单例，由 app 包的聚合端点**合并读取**
 * （单例 = 服务端写通道，app 同进程直接读；panels 浏览器侧则走 POST）。
 * 失败静默：埋点永不影响工具调用主流程。
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

/** 记一次 MCP 工具调用（每条都记——工具调用频率远低于面板刷新，无需去重）。 */
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
