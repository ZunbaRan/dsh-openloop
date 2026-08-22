import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateMetricGrid } from '../../src/presets/metric-grid/validate.ts'
import { MetricGridRender } from '../../src/presets/metric-grid/Render.tsx'

const validProps = {
  items: [
    { id: 'rev', label: '月营收', value: 48210, format: 'currency-cny', delta: '+12.4%', deltaTone: 'up', emphasis: 'hero' },
    { id: 'ord', label: '订单数', value: 1208, delta: '-2.1%', deltaTone: 'down' },
  ],
}

describe('metric-grid schema 边界（§6.4）', () => {
  it('合法 props 通过', () => {
    expect(validateMetricGrid(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    for (const bad of ['nope', null, 42, [1, 2], true]) {
      expect(validateMetricGrid(bad).ok).toBe(false)
    }
  })

  it('items 数量 1–6', () => {
    expect(validateMetricGrid({ items: [] }).ok).toBe(false)
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, value: i }))
    expect(validateMetricGrid({ items: seven }).ok).toBe(false)
  })

  it('label ≤ 40 字符', () => {
    expect(validateMetricGrid({ items: [{ label: 'x'.repeat(41), value: 1 }] }).ok).toBe(false)
    expect(validateMetricGrid({ items: [{ label: '合法', value: 1 }] }).ok).toBe(true)
  })

  it('value 必须为数字或字符串', () => {
    expect(validateMetricGrid({ items: [{ label: 'a', value: {} }] }).ok).toBe(false)
  })

  it('emphasis hero 至多 1 个', () => {
    expect(validateMetricGrid({
      items: [
        { label: 'a', value: 1, emphasis: 'hero' },
        { label: 'b', value: 2, emphasis: 'hero' },
      ],
    }).ok).toBe(false)
  })

  it('deltaTone 仅 up/down/flat', () => {
    expect(validateMetricGrid({ items: [{ label: 'a', value: 1, deltaTone: 'good' }] }).ok).toBe(false)
  })

  it('format 枚举与 text 兜底', () => {
    expect(validateMetricGrid({ items: [{ label: 'a', value: 1, format: 'bogus' }] }).ok).toBe(false)
    expect(validateMetricGrid({ items: [{ label: 'a', value: 1, format: 'percent' }] }).ok).toBe(true)
  })

  it('columns 限 1–4', () => {
    expect(validateMetricGrid({ items: [{ label: 'a', value: 1 }], columns: 5 }).ok).toBe(false)
  })
})

describe('metric-grid 渲染断言', () => {
  it('渲染不崩且输出关键 data 属性与 delta token', () => {
    const markup = renderToStaticMarkup(<MetricGridRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="metric-grid"')
    expect(markup).toContain('月营收')
    expect(markup).toContain('data-openloop-emphasis="hero"')
    // deltaTone → delta token，不复用 success/error
    expect(markup).toContain('--openloop-delta-up')
    expect(markup).toContain('--openloop-delta-down')
    expect(markup).not.toContain('--openloop-success')
    expect(markup).not.toContain('--openloop-error')
  })

  it('currency-cny 走 Intl 格式化', () => {
    const markup = renderToStaticMarkup(<MetricGridRender props={validProps} />)
    expect(markup).toContain('48,210')
  })

  it('未知 format 一律 text 兜底渲染原值', () => {
    const markup = renderToStaticMarkup(<MetricGridRender props={{ items: [{ label: 'x', value: 42, format: 'bogus' }] }} />)
    expect(markup).toContain('42')
  })
})
