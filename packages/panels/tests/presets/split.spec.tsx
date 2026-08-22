import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateSplit } from '../../src/presets/split/validate.ts'
import { SplitRender } from '../../src/presets/split/Render.tsx'

const left = { id: 'left', source: { type: 'preset', kind: 'heading', props: { text: '左栏', level: 2 } } }
const right = { id: 'right', source: { type: 'preset', kind: 'text', props: { text: '右栏' } } }

describe('split schema 边界', () => {
  it('children 必填 1–2 项', () => {
    expect(validateSplit({ children: [left, right] }).ok).toBe(true)
    expect(validateSplit({ children: [left] }).ok).toBe(true)
    expect(validateSplit({}).ok).toBe(false)
    expect(validateSplit({ children: [] }).ok).toBe(false)
    expect(validateSplit({ children: [left, right, left] }).ok).toBe(false)
  })

  it('gutter 0–48 整数', () => {
    expect(validateSplit({ children: [left], gutter: -1 }).ok).toBe(false)
    expect(validateSplit({ children: [left], gutter: 49 }).ok).toBe(false)
  })

  it('children 可含分组容器 card（0.2.4 两层组合），拒绝布局容器 grid', () => {
    expect(validateSplit({ children: [{ id: 's', source: { type: 'preset', kind: 'card', props: {} } }] }).ok).toBe(true)
    expect(validateSplit({ children: [{ id: 's', source: { type: 'preset', kind: 'grid', props: {} } }] }).ok).toBe(false)
  })
})

describe('split 渲染断言', () => {
  it('两栏 50/50 网格渲染左右 pane', () => {
    const markup = renderToStaticMarkup(<SplitRender props={{ children: [left, right] }} />)
    expect(markup).toContain('data-openloop-preset="split"')
    expect(markup).toContain('data-openloop-panes="2"')
    expect(markup).toContain('minmax(0, 1fr) minmax(0, 1fr)')
    expect(markup).toContain('左栏')
    expect(markup).toContain('右栏')
  })

  it('单 child 渲染单栏', () => {
    const markup = renderToStaticMarkup(<SplitRender props={{ children: [left] }} />)
    expect(markup).toContain('data-openloop-panes="1"')
  })
})
