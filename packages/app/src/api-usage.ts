/**
 * API 调用监控（自管理四件套，0.5.0 起持久化）——「系统在观察自己被怎么用」。
 *
 * 0.5.0 架构（2026-08-31）：**PB 集合 api_usage 为权威存储**（全量保留，跨重启）
 * + 端点按窗口聚合输出。写入方：panels 数据绑定解析（POST /openloop/app/api-usage）
 * 与 mcp-runtime callTool（同端点）。内存 Map 保留为轻量聚合缓存（端点短 TTL），
 * 不再承担持久化职责。
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

const WINDOW_MS_DEFAULT = 24 * 60 * 60 * 1000

/** PB usage writer（合批；PB 未就绪静默丢弃——监控埋点不值得阻塞主流程） */
export interface UsageWriter {
  append(source: string, kind: 'panel-binding' | 'mcp-call', ok: boolean, ms: number): Promise<void>
}

export function createPbUsageWriter(getPb: () => import('./pb-client.ts').PbClient | undefined): UsageWriter {
  let buffer: Array<{ source: string; kind: string; at: number; ms: number; ok: boolean }> = []
  let flushing = false
  const flush = async (): Promise<void> => {
    if (flushing || buffer.length === 0) return
    flushing = true
    const batch = buffer
    buffer = []
    try {
      const pb = getPb()
      if (pb === undefined) return
      for (const r of batch) {
        await pb.request('POST', '/api/collections/api_usage/records', {
          source: r.source.slice(0, 500), kind: r.kind, at: r.at, ms: Math.round(r.ms), ok: r.ok,
        })
      }
    } catch {
      // 静默——单条监控记录不值得报警
    } finally {
      flushing = false
      if (buffer.length > 0) void flush()
    }
  }
  return {
    append(source, kind, ok, ms) {
      buffer.push({ source, kind, at: Date.now(), ms, ok })
      if (buffer.length >= 16) return flush()
      return new Promise<void>(resolve => { setTimeout(() => { void flush().finally(resolve) }, 100) })
    },
  }
}

/** PB 聚合读取（窗口内 records → 每 source 的 totals/failures/avg；总条数上限防大库）。
 *  0.5.0 合并语义：PB（持久化——浏览器侧 panels 埋点经 POST 落库）+
 *  globalThis.__openloopApiUsage 单例（服务端 mcp-runtime callTool 埋点——同进程
 *  内存写通道，避免 HTTP 自绕），两路按 source 合并输出。 */
export async function readApiUsageFromPb(pb: import('./pb-client.ts').PbClient, windowMs = WINDOW_MS_DEFAULT): Promise<{ windowMs: number; sources: Array<{ source: string; kind: string; total: number; failures: number; avgMs: number | null; recent: ApiUsageRecord[] }> }> {
  const since = Date.now() - windowMs
  // 分页拉窗口内记录（倒序，最多 2000 条——监控聚合的合理上限）
  const all: Array<{ source?: unknown; kind?: unknown; at?: unknown; ms?: unknown; ok?: unknown }> = []
  for (let page = 1; page <= 10; page++) {
    const params = new URLSearchParams({ page: String(page), perPage: '200', sort: '-at', filter: `at > ${since}` })
    const res = await pb.request<{ items?: Array<Record<string, unknown>>; totalItems?: unknown }>('GET', `/api/collections/api_usage/records?${params.toString()}`)
    const items = res?.items ?? []
    for (const r of items) all.push(r as never)
    if (all.length >= (typeof res?.totalItems === 'number' ? res.totalItems : 0) || items.length < 200) break
  }

  // 服务端单例（mcp-runtime 写）合并进来
  const singleton = (globalThis as Record<string, unknown>).__openloopApiUsage as { stats?: Map<string, { source: string; kind: string; total: number; failures: number; records: Array<{ at: number; ok: boolean; ms: number }> }> } | undefined
  if (singleton?.stats !== undefined) {
    for (const stat of singleton.stats.values()) {
      for (const r of stat.records) {
        if (r.at >= since) all.push({ source: stat.source, kind: stat.kind, at: r.at, ms: r.ms, ok: r.ok })
      }
    }
  }

  const bySource = new Map<string, ApiUsageSourceStat>()
  for (const r of all) {
    const source = typeof r.source === 'string' ? r.source : ''
    if (source.length === 0) continue
    const kind = r.kind === 'mcp-call' ? 'mcp-call' : 'panel-binding'
    const at = typeof r.at === 'number' ? r.at : 0
    const ms = typeof r.ms === 'number' ? r.ms : 0
    const ok = r.ok !== false
    let stat = bySource.get(source)
    if (stat === undefined) {
      stat = { source, kind, total: 0, failures: 0, records: [] }
      bySource.set(source, stat)
    }
    stat.total += 1
    if (!ok) stat.failures += 1
    stat.records.push({ at, ok, ms })
  }

  const sources = [...bySource.values()]
    .map(stat => ({
      source: stat.source,
      kind: stat.kind,
      total: stat.total,
      failures: stat.failures,
      avgMs: stat.records.length > 0 ? Math.round(stat.records.reduce((n, r) => n + r.ms, 0) / stat.records.length) : null,
      recent: stat.records.slice(0, 30),
    }))
    .sort((a, b) => b.total - a.total)

  return { windowMs, sources }
}
