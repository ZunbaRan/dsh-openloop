/**
 * P2 watchdog 单元测试（逻辑时钟全用 1ms 级短间隔；不依赖真 PB）。
 * - 意外退出 → 退避后 restart 注入动作被调
 * - restart 失败 → 连续计数 +1、继续退避；达到熔断阈值后不再自动重启
 * - 稳定运行 >stableAfterMs 后连续计数清零
 * - intentional stop() 后 onProcessExit 不触发
 */
import { describe, expect, it, vi } from 'vitest'
import { PbWatchdog, type WatchdogOptions } from '../src/watchdog.ts'

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms))

function makeWatchdog(overrides: Partial<WatchdogOptions> = {}) {
  const restart = vi.fn(async () => {})
  const states: Array<{ restarts: number; consecutiveFailures: number; lastError: string | null }> = []
  const logs: string[] = []
  const wd = new PbWatchdog({
    healthIntervalMs: 10,
    backoffBaseMs: 5,
    maxConsecutiveFailures: 3,
    stableAfterMs: 30,
    restart,
    onStateChange: s => states.push({ restarts: s.restarts, consecutiveFailures: s.consecutiveFailures, lastError: s.lastError }),
    log: (_level, message) => { logs.push(message) },
    ...overrides,
  })
  return { wd, restart, states, logs }
}

describe('PbWatchdog', () => {
  it('意外退出 → 退避后调用 restart', async () => {
    const { wd, restart } = makeWatchdog()
    wd.resume()
    wd.onProcessExit(1)
    await sleep(60)
    expect(restart).toHaveBeenCalledTimes(1)
    expect(wd.getState().restarts).toBe(1)
    wd.stop()
  })

  it('连续失败达到熔断阈值后不再自动重启', async () => {
    let failCount = 0
    const restart = vi.fn(async () => {
      failCount++
      if (failCount <= 3) throw new Error(`boom ${failCount}`)
    })
    const { wd } = makeWatchdog({ restart, maxConsecutiveFailures: 3 })
    wd.resume()
    wd.onProcessExit(1)
    await sleep(200)
    // 3 次失败 → 熔断（不再第 4 次）
    expect(restart).toHaveBeenCalledTimes(3)
    expect(wd.getState().consecutiveFailures).toBe(3)
    expect(wd.getState().lastError).toContain('giving up')
    wd.stop()
  })

  it('成功重启后稳定运行 → 连续计数清零', async () => {
    const { wd, restart } = makeWatchdog()
    wd.resume()
    // 一次失败重启
    wd.onProcessExit(1)
    await sleep(60)
    expect(wd.getState().restarts).toBe(1)
    // 再挂一次 → consecutiveFailures 仍 0（上次已成功且稳定）
    wd.onProcessExit(1)
    await sleep(60)
    expect(wd.getState().restarts).toBe(2)
    expect(wd.getState().consecutiveFailures).toBe(0)
    expect(restart).toHaveBeenCalledTimes(2)
    wd.stop()
  })

  it('intentional stop() 后 onProcessExit 静默', async () => {
    const { wd, restart } = makeWatchdog()
    wd.resume()
    wd.stop()
    wd.onProcessExit(0)
    await sleep(40)
    expect(restart).not.toHaveBeenCalled()
  })
})
