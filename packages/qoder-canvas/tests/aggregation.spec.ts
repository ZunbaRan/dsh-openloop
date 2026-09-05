/**
 * 错误聚合行为专项测试（0.1.2 修复的真机事故回归锁）。
 * 事故：单错快抛 → 模型 32 次重试 33 分钟才收敛；聚合后一轮报全。
 */
import { describe, expect, it } from 'vitest'
import { validateCanvasDocument } from '../src/dsl.ts'

describe('错误聚合（多错误一轮报出）', () => {
  it('同一 document 的多个错误一次全部报出', () => {
    const bad = {
      // 无 title（缺失）
      layout: 'circular', // 坏 layout
      nodes: [
        { id: 'a', type: 'stat-card', props: { label: 'x' } },               // value 缺失
        { id: 'b', type: 'iframe', props: {} },                              // 未知类型
        { id: 'c', type: 'callout', props: { text: 'ok', evil: 'x' } },      // 未知 prop
      ],
    }
    try {
      validateCanvasDocument(bad)
      expect.unreachable()
    } catch (e) {
      const msg = (e as Error).message
      // 聚合生效：一次报出多个不同来源的错误（展示前 3 条 + 剩余计数）
      expect(msg).toContain('title')
      expect(msg).toContain('layout')
      expect(msg).toContain('props.value')
      expect(msg).toContain('5 errors')
      expect(msg).toContain('+2 more')
    }
  })

  it('错误超过 3 个时截断并提示剩余数量', () => {
    const bad = {
      title: 'x',
      layout: 'grid',
      nodes: Array.from({ length: 6 }, (_, i) => ({ id: `n${i}`, type: 'iframe', props: {} })),
    }
    try {
      validateCanvasDocument(bad)
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toContain('+3 more')
    }
  })

  it('单错误不带数量后缀（兼容既有断言形态）', () => {
    try {
      validateCanvasDocument({ title: 'x', layout: 'grid', nodes: [{ id: 'a', type: 'iframe', props: {} }] })
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).toContain('1 error')
      expect((e as Error).message).not.toContain('more')
    }
  })

  it('结构性失败（nodes 非数组）仍只报一条', () => {
    expect(() => validateCanvasDocument({ title: 'x', layout: 'grid', nodes: 'nope' })).toThrow(/nodes.*must be an array/)
  })
})
