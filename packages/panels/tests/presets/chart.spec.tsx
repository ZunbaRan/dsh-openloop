import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateChart } from '../../src/presets/chart/validate.ts'
import { ChartRender } from '../../src/presets/chart/Render.tsx'

const validBar = {
  variant: 'bar',
  title: '季度营收',
  xKey: 'quarter',
  data: [
    { quarter: 'Q1', revenue: 120, cost: 80 },
    { quarter: 'Q2', revenue: 180, cost: 110 },
    { quarter: 'Q3', revenue: 150, cost: 90 },
  ],
  series: [
    { key: 'revenue', label: '营收' },
    { key: 'cost', label: '成本' },
  ],
  legend: true,
  referenceLine: 140,
}

const validLine = {
  variant: 'line',
  xKey: 'day',
  data: [
    { day: 'Mon', visits: 3 },
    { day: 'Tue', visits: 5 },
    { day: 'Wed', visits: 4 },
  ],
  series: [{ key: 'visits' }],
  area: true,
}

const validDonut = {
  variant: 'donut',
  xKey: 'name',
  data: [
    { name: 'Chrome', share: 55 },
    { name: 'Safari', share: 25 },
    { name: 'Firefox', share: 12 },
  ],
  series: [{ key: 'share', label: '份额' }],
}

describe('chart schema 边界', () => {
  it('三种 variant 合法 props 通过', () => {
    expect(validateChart(validBar).ok).toBe(true)
    expect(validateChart(validLine).ok).toBe(true)
    expect(validateChart(validDonut).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateChart('nope').ok).toBe(false)
    expect(validateChart([]).ok).toBe(false)
  })

  it('variant 必填且限枚举', () => {
    expect(validateChart({ data: validBar.data, series: validBar.series }).ok).toBe(false)
    expect(validateChart({ ...validBar, variant: 'pie' }).ok).toBe(false)
  })

  it('data 1–100 项且必须为对象', () => {
    expect(validateChart({ ...validBar, data: [] }).ok).toBe(false)
    const tooMany = Array.from({ length: 101 }, (_, i) => ({ quarter: `Q${i}`, revenue: 1, cost: 1 }))
    expect(validateChart({ ...validBar, data: tooMany }).ok).toBe(false)
    expect(validateChart({ ...validBar, data: [1, 2] }).ok).toBe(false)
  })

  it('series 1–6 项（donut ≤4）', () => {
    expect(validateChart({ ...validBar, series: [] }).ok).toBe(false)
    const six = Array.from({ length: 6 }, (_, i) => ({ key: `s${i}` }))
    expect(validateChart({ ...validBar, series: six }).ok).toBe(true)
    const seven = Array.from({ length: 7 }, (_, i) => ({ key: `s${i}` }))
    expect(validateChart({ ...validBar, series: seven }).ok).toBe(false)
    const fourDonut = Array.from({ length: 4 }, (_, i) => ({ key: `s${i}` }))
    expect(validateChart({ ...validDonut, series: fourDonut }).ok).toBe(true)
    const fiveDonut = Array.from({ length: 5 }, (_, i) => ({ key: `s${i}` }))
    expect(validateChart({ ...validDonut, series: fiveDonut }).ok).toBe(false)
  })

  it('系列 key 必填、标签 ≤40 字符', () => {
    expect(validateChart({ ...validBar, series: [{ label: 'no key' }] }).ok).toBe(false)
    expect(validateChart({ ...validBar, series: [{ key: 'revenue', label: 'x'.repeat(41) }] }).ok).toBe(false)
    expect(validateChart({ ...validBar, series: [{ key: 'x'.repeat(41) }] }).ok).toBe(false)
  })

  it('xKey 标签值 ≤40 字符', () => {
    const longLabel = { ...validBar, data: [{ quarter: 'x'.repeat(41), revenue: 1, cost: 1 }] }
    expect(validateChart(longLabel).ok).toBe(false)
  })

  it('legend / referenceLine / area 类型与适用 variant', () => {
    expect(validateChart({ ...validBar, legend: 'yes' }).ok).toBe(false)
    expect(validateChart({ ...validBar, referenceLine: NaN }).ok).toBe(false)
    expect(validateChart({ ...validDonut, referenceLine: 50 }).ok).toBe(false)
    expect(validateChart({ ...validBar, area: true }).ok).toBe(false)
    expect(validateChart({ ...validLine, area: 'yes' }).ok).toBe(false)
    expect(validateChart({ ...validLine, area: true }).ok).toBe(true)
  })
})

describe('chart 渲染断言', () => {
  it('bar：渲染 <rect> 且 chart-1..N 着色、0 基网格', () => {
    const markup = renderToStaticMarkup(<ChartRender props={validBar} />)
    expect(markup).toContain('data-openloop-preset="chart"')
    expect(markup).toContain('data-openloop-variant="bar"')
    expect(markup).toContain('<rect')
    expect(markup).toContain('--openloop-chart-1')
    expect(markup).toContain('--openloop-chart-2')
    expect(markup).toContain('<line') // 网格线/参考线
    expect(markup).toContain('--openloop-primary-tint') // 参考线
    expect(markup).toContain('季度营收')
    expect(markup).toContain('Q1')
  })

  it('line：折线 <path> + 数据点 <circle>，area 增加面积填充', () => {
    const plain = renderToStaticMarkup(<ChartRender props={{ ...validLine, area: false }} />)
    expect(plain).toContain('<path')
    expect(plain).toContain('<circle')
    const withArea = renderToStaticMarkup(<ChartRender props={validLine} />)
    // area=true 时同一系列渲染两条 path（面积 + 折线）
    const pathCount = (withArea.match(/<path/g) ?? []).length
    const plainCount = (plain.match(/<path/g) ?? []).length
    expect(pathCount).toBeGreaterThan(plainCount)
    expect(withArea).toContain('opacity="0.14"')
  })

  it('donut：环形 <circle> 分段 + 中心总数 + 比例标注', () => {
    const markup = renderToStaticMarkup(<ChartRender props={validDonut} />)
    expect(markup).toContain('data-openloop-variant="donut"')
    expect(markup).toContain('stroke-dasharray')
    expect(markup).toContain('>92<') // 55+25+12 中心总数
    expect(markup).toContain('%') // 单环比例标注
    expect(markup).toContain('--openloop-surface-muted') // 环底色
  })

  it('legend=true 渲染图例按钮，legend=false 时不渲染', () => {
    const noLegend = renderToStaticMarkup(<ChartRender props={{ ...validBar, legend: false }} />)
    expect(noLegend).not.toContain('aria-pressed')
    const withLegend = renderToStaticMarkup(<ChartRender props={validBar} />)
    expect(withLegend).toContain('aria-pressed')
    expect(withLegend).toContain('营收')
  })

  it('空数据渲染占位且不崩', () => {
    const markup = renderToStaticMarkup(<ChartRender props={{ variant: 'bar', data: [], series: [{ key: 'a' }] }} />)
    expect(markup).toContain('暂无数据')
  })
})
