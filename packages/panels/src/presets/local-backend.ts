/**
 * 本地后端预设族共享基建：
 * - useAppEndpoint：同源 fetch /openloop/app/*（或既有 MCP admin 路由），带
 *   content-type 守卫（DSH webServer 对未知路径回落 SPA 200+HTML——非 JSON 应答
 *   判 unavailable 而非报错）+ 可选自动刷新（≥10s）
 * - formatBytes / formatDuration / relativeTime：展示格式化纯函数
 * 颜色纪律：本文件不产出色值（token 由消费方 Render 内联）。
 */
import { useEffect, useState } from 'react'

export interface AppEndpointState<T> {
  loading: boolean
  data?: T
  error?: string
  /** 端点不存在（宿主插件未装）——渲染「未启用」占位而非错误 */
  unavailable: boolean
}

const MIN_REFRESH_MS = 10_000

export function useAppEndpoint<T>(path: string | null, autoRefreshMs?: number): AppEndpointState<T> {
  const [state, setState] = useState<AppEndpointState<T>>({ loading: path !== null, unavailable: false })

  useEffect(() => {
    if (path === null) {
      setState({ loading: false, unavailable: true })
      return
    }
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined

    const load = async (): Promise<void> => {
      try {
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(), 5000)
        try {
          const res = await fetch(path, { signal: controller.signal })
          const contentType = res.headers.get('content-type') ?? ''
          if (!contentType.includes('application/json')) {
            if (!cancelled) setState({ loading: false, unavailable: true })
            return
          }
          const body = await res.json() as T & { error?: unknown }
          if (!cancelled) {
            if (!res.ok) {
              setState({ loading: false, unavailable: false, error: typeof body?.error === 'string' ? body.error : `HTTP ${res.status}` })
            } else {
              setState({ loading: false, unavailable: false, data: body })
            }
          }
        } finally {
          clearTimeout(to)
        }
      } catch (error) {
        if (!cancelled) setState({ loading: false, unavailable: false, error: error instanceof Error ? error.message : String(error) })
      }
    }

    void load()
    if (typeof autoRefreshMs === 'number' && autoRefreshMs >= MIN_REFRESH_MS) {
      timer = setInterval(() => { void load() }, autoRefreshMs)
    }
    return () => {
      cancelled = true
      if (timer !== undefined) clearInterval(timer)
    }
  }, [path, autoRefreshMs])

  return state
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  const one = (n: number): string => String(n >= 100 ? Math.round(n) : Math.round(n * 10) / 10)
  const kb = bytes / 1024
  if (kb < 1024) return `${one(kb)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${one(mb)} MB`
  return `${(Math.round((mb / 1024) * 100) / 100).toString()} GB`
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

/** 相对时间（"3 分钟前"）；空/非法返回 '—' */
export function relativeTime(iso: string | null | undefined): string {
  if (typeof iso !== 'string' || iso.length === 0) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '—'
  const diff = Date.now() - t
  if (diff < 0) return new Date(t).toLocaleString()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时前`
  return `${Math.floor(h / 24)} 天前`
}

/** 长字符串截断（表格单元格用） */
export function truncate(text: string, max = 60): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}
