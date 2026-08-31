/**
 * api-usage 埋点桥（panels 侧，0.5.0 持久化版）：
 * 写经 POST /openloop/app/api-usage（app 包落 PB——重启保留），
 * 不再共享 globalThis 单例（服务端权威，跨包耦合消失）。
 * fire-and-forget + 失败静默：埋点永不影响数据解析主流程。
 * 同 URL 短窗口内只发一条（防自动刷新面板高频重复上报同一 source）。
 */

const DEDUP_WINDOW_MS = 30_000
const lastSent = new Map<string, number>()

function shouldSend(source: string): boolean {
  const now = Date.now()
  const last = lastSent.get(source) ?? 0
  if (now - last < DEDUP_WINDOW_MS) return false
  lastSent.set(source, now)
  if (lastSent.size > 500) lastSent.clear()
  return true
}

/** 记一次面板数据绑定调用（同 source 30s 内只上报一次成败汇总性质的记录）。 */
export function recordApiUsage(source: string, kind: 'panel-binding' | 'mcp-call', ok: boolean, ms: number): void {
  try {
    if (!shouldSend(source)) return
    void fetch('/openloop/app/api-usage', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ source: source.slice(0, 500), kind, ok, ms: Math.round(ms) }),
      keepalive: true,
    }).catch(() => undefined)
  } catch { /* 静默 */ }
}
