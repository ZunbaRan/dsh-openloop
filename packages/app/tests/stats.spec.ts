/**
 * stats.ts fs 走查单测（临时目录注入；不落真 DSH home）。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { dirStats, sessionsStats, storageUsage } from '../src/stats.ts'

let home: string

beforeAll(() => {
  home = mkdtempSync(join(tmpdir(), 'openloop-stats-'))
  // sessions/<slug>/session-*/ 结构
  mkdirSync(join(home, 'sessions', 'proj-a', 'session-1'), { recursive: true })
  mkdirSync(join(home, 'sessions', 'proj-a', 'session-2'), { recursive: true })
  mkdirSync(join(home, 'sessions', 'proj-b', 'session-3'), { recursive: true })
  writeFileSync(join(home, 'sessions', 'proj-a', 'session-1', 'session.jsonl.zstd'), 'x'.repeat(100))
  writeFileSync(join(home, 'sessions', 'proj-a', 'session-2', 'session.jsonl.zstd'), 'x'.repeat(300))
  writeFileSync(join(home, 'sessions', 'proj-b', 'session-3', 'a.json'), 'y'.repeat(50))
  // attachments / cache / 根文件
  mkdirSync(join(home, 'attachments'), { recursive: true })
  writeFileSync(join(home, 'attachments', 'img.png'), 'z'.repeat(40))
  mkdirSync(join(home, 'cache', 'pocketbase', 'v0.39.10'), { recursive: true })
  writeFileSync(join(home, 'cache', 'pocketbase', 'v0.39.10', 'pb.zip'), 'q'.repeat(200))
  writeFileSync(join(home, 'mcp.json'), '{}')
})

afterAll(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('dirStats', () => {
  it('递归求和（bytes/files）；不存在目录返回 0', async () => {
    const s = await dirStats(join(home, 'sessions'))
    expect(s.bytes).toBe(450)
    expect(s.files).toBe(3)
    const none = await dirStats(join(home, 'nope'))
    expect(none).toEqual({ bytes: 0, files: 0 })
  })
})

describe('storageUsage', () => {
  it('顶层分解（目录递归 + 根文件）按字节降序；总和正确', async () => {
    const usage = await storageUsage(home)
    const byLabel = new Map(usage.entries.map(e => [e.label, e]))
    expect(byLabel.get('cache')?.bytes).toBe(200)
    expect(byLabel.get('sessions')?.bytes).toBe(450)
    expect(byLabel.get('attachments')?.bytes).toBe(40)
    expect(byLabel.get('mcp.json')?.bytes).toBe(2)
    // 降序
    const bytes = usage.entries.map(e => e.bytes)
    expect([...bytes].sort((a, b) => b - a)).toEqual(bytes)
    expect(usage.totalBytes).toBe(bytes.reduce((n, b) => n + b, 0))
  })
})

describe('sessionsStats', () => {
  it('总数/总字节/最大占用；byDay 只含近 14 天', async () => {
    const stats = await sessionsStats(home)
    expect(stats.totalSessions).toBe(3)
    expect(stats.totalBytes).toBe(450)
    expect(stats.largest).toHaveLength(3)
    expect(stats.largest[0]?.name).toContain('session-2')
    expect(stats.largest[0]?.bytes).toBe(300)
    // 今天的会话必然出现（mtime = now）
    expect(stats.byDay.length).toBeGreaterThanOrEqual(1)
    expect(stats.byDay[0]?.count).toBe(3)
    expect(stats.lastActiveAt).not.toBeNull()
  })
})
