/**
 * connect_server 注入接线回归（2026-08-30 真机事故）：
 * app 的 mcpRuntime 捕获必须经 inject 回调的参数 ctx——外层 ctx 访问服务属性
 * 会 throw "cannot get property without inject"，错误被 fiber 吞掉后 connect
 * 永远走降级路径（activated: false）。用真 cordis Context 锁死该模式。
 */
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'

describe('mcpRuntime capture wiring (real cordis)', () => {
  it('captures the service via the inject callback context, not the outer ctx', async () => {
    const ctx = new Context()
    // 模拟 web 实例真实顺序：mcp bundle 先于 app 加载
    await ctx.plugin({ name: 'rt-test', apply(c) { c.provide('mcpRuntime', { marker: 'rt' }) } })

    let captured: unknown = 'UNSET'
    let outerThrew = false
    await ctx.plugin({
      name: 'app-wiring-test',
      apply(c) {
        // app/src/index.ts 的接线模式（参数 ctx）
        c.inject(['mcpRuntime'], (runtimeCtx) => {
          try {
            void (c as unknown as Record<string, unknown>).mcpRuntime
          } catch {
            outerThrew = true // 外层访问确实会 throw——这是 cordis 的设计
          }
          captured = (runtimeCtx as unknown as { mcpRuntime?: { marker?: string } }).mcpRuntime?.marker
        })
      },
    })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(captured).toBe('rt') // 参数 ctx 取到服务
    expect(outerThrew).toBe(true) // 外层 ctx 访问被代理拒绝（模式约束的事实基础）

    await ctx.fiber.dispose()
  })

  it('still captures when the service is provided after the plugin loads (deferred wake)', async () => {
    const ctx = new Context()
    let captured: unknown = 'UNSET'
    await ctx.plugin({
      name: 'app-early-test',
      apply(c) {
        c.inject(['mcpRuntime'], (runtimeCtx) => {
          captured = (runtimeCtx as unknown as { mcpRuntime?: { marker?: string } }).mcpRuntime?.marker
        })
      },
    })
    // runtime 后加载（乱序场景）
    await ctx.plugin({ name: 'rt-late-test', apply(c) { c.provide('mcpRuntime', { marker: 'late' }) } })
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(captured).toBe('late')

    await ctx.fiber.dispose()
  })
})
