/**
 * OpenLoop base · 服务端公共网络能力（SSRF 防护 + 安全 fetch）。
 *
 * 抽取自 panels 的 validation.ts / datasource.ts（2026-08-22 base 重构），
 * 面向全部 OpenLoop 插件复用：panels 的 api data binding、artifact v2 的
 * openloop.fetch 桥等。语义与 panels v0.2.x 完全一致：
 *   - 仅 https://（显式白名单可放行本机源，见 options.allowedOrigins）
 *   - SSRF 静态判定：环回/私网/link-local/IPv4-mapped 一律拒绝
 *   - timeout 缺省 10s、上限 30s；响应体 ≤ 1MB；仅接受 JSON
 */

/** 默认超时（10s） */
export const DEFAULT_TIMEOUT_MS = 10_000
/** 超时上限（30s） */
export const MAX_TIMEOUT_MS = 30_000
/** 响应体大小上限（1MB） */
export const MAX_RESPONSE_BYTES = 1024 * 1024

/** 判断 IP 字面量（去掉方括号后的 hostname）是否落在禁连段 */
function isForbiddenIpLiteral(hostname: string): boolean {
  // node:net isIP 内联实现（避免 base 依赖 node 内置模块进潜在 browser 构建）
  const isIPv4 = (s: string) => /^(\d{1,3}\.){3}\d{1,3}$/.test(s)
  const isIPv6 = (s: string) => s.includes(':')
  if (isIPv4(hostname)) return isForbiddenIPv4(hostname)
  if (isIPv6(hostname)) return isForbiddenIPv6(hostname)
  return false
}

/** IPv4 段判断：0.0.0.0/8、127.0.0.0/8、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、169.254.0.0/16 */
function isForbiddenIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(part => Number(part))
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true // 非法 IPv4 字形，fail-closed
  }
  const [a, b] = parts as [number, number, number, number]
  if (a === 0) return true // 0.0.0.0/8 本网络
  if (a === 127) return true // 127.0.0.0/8 环回
  if (a === 10) return true // 10.0.0.0/8 私网
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 私网
  if (a === 192 && b === 168) return true // 192.168.0.0/16 私网
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local
  return false
}

/** IPv6 段判断：::/::1 环回、fc00::/7 ULA、fe80::/10 link-local、::ffff:a.b.c.d IPv4-mapped */
function isForbiddenIPv6(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true // fe80::/10
  const v4Mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (v4Mapped?.[1]) return isForbiddenIPv4(v4Mapped[1])
  return false
}

/**
 * SSRF 静态判定：url 指向环回/内网/不可解析地址时返回 true。
 * 普通域名无法在编译期解析，默认放行（fetch 层超时/大小限制兜底）。
 */
export function isForbiddenApiUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return true // 无法解析的 URL，fail-closed
  }
  const hostname = parsed.hostname
  if (hostname === '') return true
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return isForbiddenIpLiteral(hostname.slice(1, -1))
  }
  return isForbiddenIpLiteral(hostname)
}

/** 校验 api url（fail-closed，错误面向 Agent 可自修正）：https-only + SSRF */
export function validateHttpsApiUrl(url: string, widgetLabel = 'widget'): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`${widgetLabel} api source URL "${url}" is not a valid absolute URL`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`${widgetLabel} api source URL "${url}" must use https:// (insecure http:// is rejected in v1)`)
  }
  if (isForbiddenApiUrl(url)) {
    throw new Error(`${widgetLabel} api source URL "${url}" points to a loopback/private address, which is forbidden (SSRF guard); use a public https:// endpoint`)
  }
}

/** 归一化 timeoutMs：缺省 10s；超上限 clamp 30s；非法值回退默认 */
export function normalizeTimeoutMs(timeoutMs?: number): number {
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) return DEFAULT_TIMEOUT_MS
  return Math.min(timeoutMs, MAX_TIMEOUT_MS)
}

/** content-type 是否声明为 JSON */
export function looksLikeJsonContentType(contentType: string | null | undefined): boolean {
  return typeof contentType === 'string' && contentType.toLowerCase().includes('json')
}

/** 判定并解析 JSON 响应；非 JSON（声明与体解析双失败）抛可自修正错误 */
export function parseJsonResponse(contentType: string | null | undefined, bodyText: string): unknown {
  const claimed = looksLikeJsonContentType(contentType)
  let parsed: unknown
  try {
    parsed = JSON.parse(bodyText)
  } catch {
    parsed = undefined
  }
  if (parsed === undefined) {
    if (claimed) {
      throw new Error(`api response content-type is ${JSON.stringify(contentType ?? '')} but the body is not valid JSON`)
    }
    throw new Error(`api response is not JSON (content-type ${JSON.stringify(contentType ?? '')}); only JSON responses are accepted`)
  }
  return parsed
}

/** 流式读取响应体，超过 maxBytes 立即停止并标记截断（不缓冲超限数据） */
export async function readBodyBytes(
  stream: ReadableStream<Uint8Array>,
  maxBytes = MAX_RESPONSE_BYTES,
): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  let truncated = false
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      truncated = true
      break
    }
    chunks.push(value)
  }
  reader.releaseLock()
  const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0))
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { bytes, truncated }
}

export interface SafeFetchOptions {
  timeoutMs?: number
  /** 允许的额外源（如部署级本机 API 白名单 'http://127.0.0.1:9090'）；命中即跳过 https/SSRF 拒绝 */
  allowedOrigins?: readonly string[]
  /** 注入 seam：测试 mock；缺省全局 fetch */
  fetchFn?: typeof fetch
  signal?: AbortSignal
}

/** 判定 url 源是否命中白名单（origin 精确匹配） */
function matchesAllowedOrigin(url: string, allowedOrigins?: readonly string[]): boolean {
  if (!allowedOrigins || allowedOrigins.length === 0) return false
  try {
    const origin = new URL(url).origin
    return allowedOrigins.some(allowed => {
      try {
        return new URL(allowed).origin === origin
      } catch {
        return false
      }
    })
  } catch {
    return false
  }
}

/**
 * 安全 fetch + JSON 解析（panels api data binding 与 artifact fetch 桥的共同底座）：
 * https-only + SSRF（除非命中 allowedOrigins 白名单）→ timeout abort → ≤1MB 流式限读 → 仅 JSON。
 */
export async function safeFetchJson(url: string, options: SafeFetchOptions = {}): Promise<unknown> {
  if (!matchesAllowedOrigin(url, options.allowedOrigins)) {
    validateHttpsApiUrl(url)
  }
  const timeoutMs = normalizeTimeoutMs(options.timeoutMs)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onExternalAbort = () => controller.abort()
  options.signal?.addEventListener('abort', onExternalAbort, { once: true })
  try {
    const fetchFn = options.fetchFn ?? fetch
    const response = await fetchFn(url, { signal: controller.signal, redirect: 'error' })
    if (!response.ok) {
      throw new Error(`api request failed with HTTP ${response.status}`)
    }
    if (!response.body) {
      throw new Error('api response has no body')
    }
    const { bytes, truncated } = await readBodyBytes(response.body)
    if (truncated) {
      throw new Error(`api response exceeds the ${MAX_RESPONSE_BYTES}-byte limit`)
    }
    const bodyText = new TextDecoder('utf-8').decode(bytes)
    return parseJsonResponse(response.headers.get('content-type'), bodyText)
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', onExternalAbort)
  }
}
