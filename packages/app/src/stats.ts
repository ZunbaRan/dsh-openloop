/**
 * 本地统计聚合（M3+ 本地后端预设族的服务端数据源）：
 * - dirStats：递归 stat 走目录（不读内容）→ { bytes, files }；符号链接跳过（防环）
 * - storageUsage：DSH_HOME 顶层占用分解（sessions/attachments/cache/data + 根文件）
 * - sessionsStats：sessions 目录（slug/session- 前缀子目录）走查——总数/总字节/最近活跃/按日聚合/最大占用
 *
 * 全部只 stat 不 read，万级文件量也在百毫秒级。
 */
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'

export interface DirStats {
  bytes: number
  files: number
}

/** 递归统计目录（符号链接跳过；不存在返回 0） */
export async function dirStats(path: string): Promise<DirStats> {
  let bytes = 0
  let files = 0
  const entries = await readdir(path, { withFileTypes: true }).catch(() => [])
  for (const entry of entries) {
    const full = join(path, entry.name)
    if (entry.isSymbolicLink()) continue
    if (entry.isDirectory()) {
      const sub = await dirStats(full)
      bytes += sub.bytes
      files += sub.files
    } else if (entry.isFile()) {
      const s = await stat(full).catch(() => undefined)
      if (s !== undefined) {
        bytes += s.size
        files++
      }
    }
  }
  return { bytes, files }
}

export interface StorageEntry {
  label: string
  path: string
  bytes: number
  files: number
}

export interface StorageUsage {
  home: string
  totalBytes: number
  entries: StorageEntry[]
}

/** DSH_HOME 顶层占用分解（目录 + 根文件）；条目按字节降序 */
export async function storageUsage(dshHome: string): Promise<StorageUsage> {
  const entries = await readdir(dshHome, { withFileTypes: true }).catch(() => [])
  const result: StorageEntry[] = []
  for (const entry of entries) {
    const full = join(dshHome, entry.name)
    if (entry.isDirectory()) {
      const s = await dirStats(full)
      result.push({ label: entry.name, path: full, bytes: s.bytes, files: s.files })
    } else if (entry.isFile()) {
      const s = await stat(full).catch(() => undefined)
      if (s !== undefined) result.push({ label: entry.name, path: full, bytes: s.size, files: 1 })
    }
  }
  result.sort((a, b) => b.bytes - a.bytes)
  return { home: dshHome, totalBytes: result.reduce((n, e) => n + e.bytes, 0), entries: result }
}

export interface SessionsStats {
  totalSessions: number
  totalBytes: number
  lastActiveAt: string | null
  byDay: Array<{ date: string; count: number; bytes: number }>
  largest: Array<{ name: string; bytes: number; modified: string }>
}

const DAY_MS = 24 * 60 * 60 * 1000

/** sessions 统计：目录结构 = sessions/<slug>/session-<uuid>/（AGENTS.md 既有事实） */
export async function sessionsStats(dshHome: string, byDayDays = 14, largestN = 5): Promise<SessionsStats> {
  const sessionsRoot = join(dshHome, 'sessions')
  const slugs = await readdir(sessionsRoot, { withFileTypes: true }).catch(() => [])
  let totalSessions = 0
  let totalBytes = 0
  let lastActive = 0
  const largest: Array<{ name: string; bytes: number; modified: string }> = []
  const dayMap = new Map<string, { count: number; bytes: number }>()

  for (const slug of slugs) {
    if (!slug.isDirectory()) continue
    const slugDir = join(sessionsRoot, slug.name)
    const sessionDirs = await readdir(slugDir, { withFileTypes: true }).catch(() => [])
    for (const session of sessionDirs) {
      if (!session.isDirectory() || !session.name.startsWith('session-')) continue
      totalSessions++
      const sessionDir = join(slugDir, session.name)
      const s = await dirStats(sessionDir)
      totalBytes += s.bytes
      const st = await stat(sessionDir).catch(() => undefined)
      const mtime = st?.mtimeMs ?? 0
      if (mtime > lastActive) lastActive = mtime
      const date = new Date(mtime).toISOString().slice(0, 10)
      const day = dayMap.get(date) ?? { count: 0, bytes: 0 }
      day.count++
      day.bytes += s.bytes
      dayMap.set(date, day)
      largest.push({ name: `${slug.name}/${session.name}`, bytes: s.bytes, modified: new Date(mtime).toISOString() })
    }
  }

  largest.sort((a, b) => b.bytes - a.bytes)
  const cutoff = Date.now() - byDayDays * DAY_MS
  const byDay = [...dayMap.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .filter(d => new Date(d.date).getTime() >= new Date(new Date(cutoff).toISOString().slice(0, 10)).getTime())
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    totalSessions,
    totalBytes,
    lastActiveAt: lastActive > 0 ? new Date(lastActive).toISOString() : null,
    byDay,
    largest: largest.slice(0, largestN),
  }
}
