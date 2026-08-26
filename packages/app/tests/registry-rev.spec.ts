/**
 * P1 registry 刷新机制测试：
 * - backend invalidateRegistry / status().registryRev 递增
 * - tool 写 action 自动 bump（fake backend 注入）；invalidate 显式 action
 */
import { describe, expect, it } from 'vitest'
import { createAppBackend, type AppBackend } from '../src/backend.ts'
import type { AppFacade } from '../src/facade.ts'
import { createAppBackendTool, APP_BACKEND_TOOL, APP_BACKEND_PARAMETERS } from '../src/tool.ts'

/** fake backend：ready 直接给 fake facade（绕开 PB 进程） */
function fakeBackend(): AppBackend {
  let rev = 0
  const facade = {} as AppFacade
  let lastStarted = false
  return {
    start: async () => { lastStarted = true },
    ready: async () => facade,
    status: () => ({ state: lastStarted ? 'running' : 'stopped', version: 'test', registryRev: rev }),
    stop: async () => { lastStarted = false },
    pbClient: () => undefined,
    pbDataDir: () => undefined,
    dshHome: () => '/tmp/fake',
    startedAt: () => undefined,
    invalidateRegistry: () => { rev += 1; return rev },
  }
}

describe('backend registryRev', () => {
  it('invalidateRegistry 递增且 status 可见', () => {
    const backend = fakeBackend()
    expect(backend.status().registryRev).toBe(0)
    expect(backend.invalidateRegistry()).toBe(1)
    expect(backend.invalidateRegistry()).toBe(2)
    expect(backend.status().registryRev).toBe(2)
  })

  it('createAppBackend 同款（默认 rev 0，invalidate 递增）', async () => {
    // 不 start（不起 PB）——status 本身不依赖运行态
    const backend = createAppBackend({ dshHome: '/tmp/nonexistent-p1' })
    expect(backend.status().registryRev).toBe(0)
    expect(backend.invalidateRegistry()).toBe(1)
  })
})

describe('tool 写操作自动 bump', () => {
  it('invalidate 显式 action bump registryRev；非法 action 被 schema enum 拒绝', async () => {
    const backend = fakeBackend()
    const tool = createAppBackendTool(backend)
    expect(tool.name).toBe(APP_BACKEND_TOOL)

    // 非法 action：schema enum 层拦截（不进 execute）
    expect(APP_BACKEND_PARAMETERS.action.enum).toContain('invalidate')
    expect(APP_BACKEND_PARAMETERS.action.enum).not.toContain('nope')

    // 显式 invalidate：过 ready 但 runCore 不触 facade，自动 bump
    const revBefore = backend.status().registryRev ?? 0
    const result = await tool.execute({ action: 'invalidate' }, {} as never) as { invalidated: boolean }
    expect(result.invalidated).toBe(true)
    expect(backend.status().registryRev).toBe(revBefore + 1)
  })
})
