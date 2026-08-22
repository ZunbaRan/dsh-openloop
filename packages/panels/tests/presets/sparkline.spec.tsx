import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateSparkline } from '../../src/presets/sparkline/validate.ts'
import { SparklineRender } from '../../src/presets/sparkline/Render.tsx'

const validProps = {
  label: '近 7 日访问',
  value: 1280,
  series: [1, 3, 2, 5, 4, 8, 6],
  extremes: true,
}

describe('sparkline schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateSparkline(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateSparkline('nope').ok).toBe(false)
    expect(validateSparkline([]).ok).toBe(false)
  })

  it('series 必填且 2–120 个数值', () => {
    expect(validateSparkline({}).ok).toBe(false)
    expect(validateSparkline({ series: [1] }).ok).toBe(false)
    const many = Array.from({ length: 121 }, (_, i) => i)
    expect(validateSparkline({ series: many }).ok).toBe(false)
  })

  it('series 元素必须为有限数字', () => {
    expect(validateSparkline({ series: [1, 'a', 3] }).ok).toBe(false)
    expect(validateSparkline({ series: [1, NaN] }).ok).toBe(false)
  })

  it('label ≤ 80 字符', () => {
    expect(validateSparkline({ series: [1, 2], label: 'x'.repeat(81) }).ok).toBe(false)
  })

  it('extremes 必须为布尔', () => {
    expect(validateSparkline({ series: [1, 2], extremes: 'yes' }).ok).toBe(false)
  })
})

describe('sparkline 渲染断言', () => {
  it('渲染不崩且输出 SVG polyline 与 chart-1 着色', () => {
    const markup = renderToStaticMarkup(<SparklineRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="sparkline"')
    expect(markup).toContain('<polyline')
    expect(markup).toContain('points="')
    expect(markup).toContain('--openloop-chart-1')
  })

  it('label 与 value 一并展示', () => {
    const markup = renderToStaticMarkup(<SparklineRender props={validProps} />)
    expect(markup).toContain('近 7 日访问')
    expect(markup).toContain('1280')
  })

  it('extremes 开启时标注最小/最大值', () => {
    const markup = renderToStaticMarkup(<SparklineRender props={{ series: [1, 10, 5] }} />)
    expect(markup).not.toContain('<text')
    const withExtremes = renderToStaticMarkup(<SparklineRender props={{ series: [1, 10, 5], extremes: true }} />)
    expect(withExtremes).toContain('<text')
    expect(withExtremes).toContain('>10<')
  })
})
