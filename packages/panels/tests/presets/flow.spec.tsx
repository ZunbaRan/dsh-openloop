import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateFlow } from '../../src/presets/flow/validate.ts'
import { FlowRender } from '../../src/presets/flow/Render.tsx'

const validProps = {
  title: '发布流程',
  nodes: [
    { id: 'a', label: '提交代码', tone: 'info' },
    { id: 'b', label: 'CI 构建', detail: '约 5 分钟' },
    { id: 'c', label: '部署上线', tone: 'success' },
  ],
  edges: [
    { from: 'a', to: 'b', label: 'push' },
    { from: 'b', to: 'c' },
  ],
}

describe('flow schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateFlow(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateFlow(undefined).ok).toBe(false)
    expect(validateFlow('x').ok).toBe(false)
  })

  it('nodes 必填且 2–12 个', () => {
    expect(validateFlow({ edges: [{ from: 'a', to: 'b' }] }).ok).toBe(false)
    expect(validateFlow({ nodes: [{ id: 'a', label: 'A' }], edges: [] }).ok).toBe(false)
    const many = Array.from({ length: 13 }, (_, i) => ({ id: `n${i}`, label: `N${i}` }))
    expect(validateFlow({ nodes: many, edges: [{ from: 'n0', to: 'n1' }] }).ok).toBe(false)
  })

  it('edges 必填且 1–20 条', () => {
    const nodes = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]
    expect(validateFlow({ nodes }).ok).toBe(false)
    expect(validateFlow({ nodes, edges: [] }).ok).toBe(false)
    const manyEdges = Array.from({ length: 21 }, () => ({ from: 'a', to: 'b' }))
    expect(validateFlow({ nodes, edges: manyEdges }).ok).toBe(false)
  })

  it('节点 id 重复拒绝', () => {
    expect(
      validateFlow({
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'a', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'a' }],
      }).ok,
    ).toBe(false)
  })

  it('node label 必填且 ≤80 字符', () => {
    const base = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]
    const edges = [{ from: 'a', to: 'b' }]
    expect(validateFlow({ nodes: [{ id: 'a' }, { id: 'b', label: 'B' }], edges }).ok).toBe(false)
    expect(validateFlow({ nodes: [{ id: 'a', label: ' ' }, { id: 'b', label: 'B' }], edges }).ok).toBe(false)
    expect(validateFlow({ nodes: [{ id: 'a', label: 'x'.repeat(81) }, base[1]], edges }).ok).toBe(false)
  })

  it('自环拒绝', () => {
    const result = validateFlow({
      nodes: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      edges: [{ from: 'a', to: 'a' }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('自环'))).toBe(true)
  })

  it('边引用未知节点拒绝', () => {
    expect(
      validateFlow({
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'ghost' }],
      }).ok,
    ).toBe(false)
  })

  it('非法 tone 拒绝', () => {
    expect(
      validateFlow({
        nodes: [
          { id: 'a', label: 'A', tone: 'critical' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'b' }],
      }).ok,
    ).toBe(false)
  })
})

describe('flow 渲染断言', () => {
  it('渲染不崩且包含节点与边标签', () => {
    const markup = renderToStaticMarkup(<FlowRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="flow"')
    expect(markup).toContain('data-openloop-count="3"')
    expect(markup).toContain('提交代码')
    expect(markup).toContain('CI 构建')
    expect(markup).toContain('部署上线')
    expect(markup).toContain('push')
  })

  it('空数据兜底不崩', () => {
    const markup = renderToStaticMarkup(<FlowRender props={{}} />)
    expect(markup).toContain('data-openloop-preset="flow"')
    expect(markup).toContain('暂无流程数据')
  })

  it('样式全部走 var(--openloop-*)，无硬编码色值', () => {
    const markup = renderToStaticMarkup(<FlowRender props={validProps} />)
    expect(markup).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(markup).not.toContain('rgb(')
  })
})

it('declarative 兼容：tone danger 被接受（渲染归一为 error）', () => {
  const panel = {
    title: '流程',
    nodes: [
      { id: 'a', label: '开始', tone: 'danger' },
      { id: 'b', label: '结束' },
    ],
    edges: [{ from: 'a', to: 'b' }],
  }
  const result = validateFlow(panel)
  expect(result.ok).toBe(true)
})
