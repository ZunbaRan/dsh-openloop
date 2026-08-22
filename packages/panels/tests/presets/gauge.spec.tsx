import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateGauge } from '../../src/presets/gauge/validate.ts'
import { GaugeRender } from '../../src/presets/gauge/Render.tsx'

const validProps = {
  title: 'CPU 使用率',
  value: 72,
  label: '集群整体负载',
  detail: '过去 5 分钟平均',
  unit: '%',
  tone: 'warning',
}

describe('gauge schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateGauge(validProps).ok).toBe(true)
    expect(validateGauge({ value: 0 }).ok).toBe(true)
    expect(validateGauge({ value: 100 }).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateGauge('nope').ok).toBe(false)
    expect(validateGauge([1]).ok).toBe(false)
  })

  it('value 必填且 0–100', () => {
    expect(validateGauge({}).ok).toBe(false)
    expect(validateGauge({ value: -1 }).ok).toBe(false)
    expect(validateGauge({ value: 101 }).ok).toBe(false)
    expect(validateGauge({ value: 'high' }).ok).toBe(false)
    expect(validateGauge({ value: NaN }).ok).toBe(false)
  })

  it('tone 限枚举 success/warning/error/info', () => {
    expect(validateGauge({ value: 50, tone: 'success' }).ok).toBe(true)
    expect(validateGauge({ value: 50, tone: 'error' }).ok).toBe(true)
    expect(validateGauge({ value: 50, tone: 'primary' }).ok).toBe(false)
  })

  it('文案长度约束', () => {
    expect(validateGauge({ value: 50, label: 'x'.repeat(41) }).ok).toBe(false)
    expect(validateGauge({ value: 50, detail: 'x'.repeat(81) }).ok).toBe(false)
    expect(validateGauge({ value: 50, unit: 'x'.repeat(9) }).ok).toBe(false)
    expect(validateGauge({ value: 50, title: 'x'.repeat(81) }).ok).toBe(false)
  })
})

describe('gauge 渲染断言', () => {
  it('渲染 meter 语义与 chart-1 缺省着色', () => {
    const markup = renderToStaticMarkup(<GaugeRender props={{ value: 45 }} />)
    expect(markup).toContain('data-openloop-preset="gauge"')
    expect(markup).toContain('role="meter"')
    expect(markup).toContain('aria-valuenow="45"')
    expect(markup).toContain('--openloop-chart-1')
    expect(markup).toContain('>45<')
  })

  it('tone 阈值色覆盖 chart-1', () => {
    const markup = renderToStaticMarkup(<GaugeRender props={validProps} />)
    expect(markup).toContain('--openloop-warning')
    expect(markup).not.toContain('--openloop-chart-1')
  })

  it('label/detail/unit/title 一并展示', () => {
    const markup = renderToStaticMarkup(<GaugeRender props={validProps} />)
    expect(markup).toContain('CPU 使用率')
    expect(markup).toContain('集群整体负载')
    expect(markup).toContain('过去 5 分钟平均')
    expect(markup).toContain('72 %')
    expect(markup).toContain('>72%<') // 中心进度百分比
  })

  it('超界 value 渲染时钳制到 0–100 不崩', () => {
    const markup = renderToStaticMarkup(<GaugeRender props={{ value: 150 }} />)
    expect(markup).toContain('data-openloop-value="100"')
  })
})
