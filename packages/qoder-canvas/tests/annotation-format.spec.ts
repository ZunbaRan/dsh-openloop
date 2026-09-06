/**
 * formatAnnotationBatch / formatAnnotationDraft 的注入格式（S7.1）。
 * 环境：node（localStorage 用内存 stub——模块顶层不触存储，仅函数内调用）。
 */
import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  // canvas-annotations 模块在函数内才访问 localStorage——补一个内存 stub
  const store = new Map<string, string>()
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v) },
    removeItem: (k: string) => { store.delete(k) },
  }
})

const snapshot = {
  canvasId: 'cv_test',
  revision: 3,
  canvas: {
    title: 'API 健康监控',
    nodes: [
      { id: 'qps', type: 'stat-card', props: { label: 'QPS', value: '12,480' } },
      { id: 'warn', type: 'callout', props: { tone: 'warn', title: '警告', text: '支付服务错误率飙升' } },
    ],
  },
}

describe('formatAnnotationBatch', () => {
  it('单条注释：无编号，头部画布标注 + canvasId · r版（不带 @ 防 mention 弹窗）', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const out = formatAnnotationBatch(snapshot, [
      { targets: [{ kind: 'node', id: 'qps', label: 'QPS' }], note: '改一下' },
    ])
    expect(out).toContain('画布标注 · API 健康监控 cv_test · r3')
    expect(out).not.toContain('@')
    expect(out).toContain('<target type="stat-card" id="qps" path="nodes[0]">')
    expect(out).toContain('"value": "12,480"')
    expect(out).toContain('评注：改一下')
    expect(out).not.toContain('#1')
  })

  it('多条注释同画布合并：共享头部 + #n 编号', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const out = formatAnnotationBatch(snapshot, [
      { targets: [{ kind: 'node', id: 'qps', label: 'QPS' }], note: 'test' },
      { targets: [{ kind: 'element', id: 'warn', label: 'callout div', tag: 'div', domPath: 'div:nth-of-type(2)', text: '支付服务' }], note: '什么' },
    ])
    // 头部只出现一次且带条数
    expect(out.match(/画布标注 · API 健康监控 cv_test · r3/g)?.length).toBe(1)
    expect(out).toContain('（2 条）')
    expect(out).toContain('#1 <target type="stat-card"')
    expect(out).toContain('#2 <target type="callout" id="warn" path="nodes[1]" element="div:nth-of-type(2)" tag="div" text="支付服务">')
    expect(out).toContain('评注：test')
    expect(out).toContain('评注：什么')
  })

  it('划字 text target 带所属节点定位 in="nodes[i]"', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const out = formatAnnotationBatch(snapshot, [
      { targets: [{ kind: 'text', excerpt: '12,480▲ 8.2', nodeId: 'qps' }], note: 'test' },
    ])
    expect(out).toContain('<target type="text" in="nodes[0]">"12,480▲ 8.2"</target>')
  })

  it('text target 无 nodeId 或节点已删：降级不带 in / 带原始 id', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const noNode = formatAnnotationBatch(snapshot, [
      { targets: [{ kind: 'text', excerpt: 'abc' }], note: 'n' },
    ])
    expect(noNode).toContain('<target type="text">"abc"</target>')
    const stale = formatAnnotationBatch(snapshot, [
      { targets: [{ kind: 'text', excerpt: 'abc', nodeId: 'gone' }], note: 'n' },
    ])
    expect(stale).toContain('<target type="text" in="gone">"abc"</target>')
  })

  it('节点不在当前快照：降级为 id 引用不崩溃', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const out = formatAnnotationBatch(snapshot, [
      { targets: [{ kind: 'node', id: 'deleted', label: '旧节点' }], note: 'n' },
    ])
    expect(out).toContain('<target id="deleted" note="not found in current revision">旧节点</target>')
  })
})

describe('html-element target (0.9.0)', () => {
  const snapWithHtml = {
    canvasId: 'cv_htmlt',
    revision: 1,
    canvas: {
      title: '设计稿',
      nodes: [{ id: 'h1', type: 'html', props: { source: '<div>…</div>' } }],
    },
  }

  it('html-element 注入带 snippet + path + element + 定位说明', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const out = formatAnnotationBatch(snapWithHtml, [
      { targets: [{ kind: 'html-element', id: 'h1', label: 'html div "hero"', tag: 'div', domPath: 'div > div:nth-of-type(2)', text: 'hero copy', snippet: '<div class="hero">hero copy</div>' }], note: '改配色' },
    ])
    expect(out).toContain('<target type="html" id="h1" path="nodes[0]" element="div > div:nth-of-type(2)" tag="div" text="hero copy">')
    expect(out).toContain('<div class="hero">hero copy</div>')
    expect(out).toContain('定位说明')
    expect(out).toContain('评注：改配色')
  })

  it('snippet 首字符是 [ 时补换行防御（Lexical 魔法字符）', async () => {
    const { formatAnnotationBatch } = await import('../src/client/canvas-annotations.ts')
    const out = formatAnnotationBatch(snapWithHtml, [
      { targets: [{ kind: 'html-element', id: 'h1', label: 'x', tag: 'div', domPath: 'div', snippet: '[data-x] selector-ish html' }], note: 'n' },
    ])
    // 目标块内 snippet 换行开头（不在消息首行——Lexical 只对行首魔法敏感，块内保守处理）
    expect(out).toContain('\n[data-x] selector-ish html')
  })
})
