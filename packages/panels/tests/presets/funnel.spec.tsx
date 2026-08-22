import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateFunnel } from '../../src/presets/funnel/validate.ts'
import { FunnelRender } from '../../src/presets/funnel/Render.tsx'

const validProps = {
  title: '转化漏斗',
  stages: [
    { label: '访问', value: 1200 },
    { label: '注册', value: 800, detail: '66.7%' },
    { label: '下单', value: 320 },
  ],
}

describe('funnel schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateFunnel(validProps).ok).toBe(true)
    expect(validateFunnel({ stages: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] }).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateFunnel('nope').ok).toBe(false)
    expect(validateFunnel([]).ok).toBe(false)
  })

  it('stages 必填且 2–8 段', () => {
    expect(validateFunnel({}).ok).toBe(false)
    expect(validateFunnel({ stages: [{ label: 'a', value: 1 }] }).ok).toBe(false)
    const nine = Array.from({ length: 9 }, (_, i) => ({ label: `s${i}`, value: i }))
    expect(validateFunnel({ stages: nine }).ok).toBe(false)
  })

  it('每段 label/value 必填，value 须为有限数字', () => {
    expect(validateFunnel({ stages: [{ value: 1 }, { label: 'b', value: 2 }] }).ok).toBe(false)
    expect(validateFunnel({ stages: [{ label: 'a' }, { label: 'b', value: 2 }] }).ok).toBe(false)
    expect(validateFunnel({ stages: [{ label: 'a', value: NaN }, { label: 'b', value: 2 }] }).ok).toBe(false)
  })

  it('label/detail ≤40 字符', () => {
    expect(validateFunnel({ stages: [{ label: 'x'.repeat(41), value: 1 }, { label: 'b', value: 2 }] }).ok).toBe(false)
    expect(validateFunnel({ stages: [{ label: 'a', value: 1, detail: 'x'.repeat(41) }, { label: 'b', value: 2 }] }).ok).toBe(false)
  })
})

describe('funnel 渲染断言', () => {
  it('渲染各阶段条 + chart-seq 渐层 + 值标注', () => {
    const markup = renderToStaticMarkup(<FunnelRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="funnel"')
    expect(markup).toContain('data-openloop-count="3"')
    expect(markup).toContain('--openloop-chart-seq-')
    expect(markup).toContain('--openloop-surface-muted') // 轨道底
    expect(markup).toContain('访问')
    expect(markup).toContain('>1200<')
    expect(markup).toContain('66.7%')
  })

  it('段宽按 value 比例：首段 100%', () => {
    const markup = renderToStaticMarkup(<FunnelRender props={validProps} />)
    expect(markup).toContain('width:100%')
  })

  it('空 stages 渲染占位且不崩', () => {
    const markup = renderToStaticMarkup(<FunnelRender props={{ stages: [] }} />)
    expect(markup).toContain('暂无数据')
  })
})
