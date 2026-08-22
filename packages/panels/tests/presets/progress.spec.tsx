import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateProgress } from '../../src/presets/progress/validate.ts'
import { ProgressRender } from '../../src/presets/progress/Render.tsx'

describe('progress schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateProgress({ label: '完成度', value: 50, max: 100, tone: 'success' }).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateProgress(undefined).ok).toBe(false)
    expect(validateProgress('x').ok).toBe(false)
  })

  it('value 必填且 ≥0', () => {
    expect(validateProgress({}).ok).toBe(false)
    expect(validateProgress({ value: -1 }).ok).toBe(false)
    expect(validateProgress({ value: NaN }).ok).toBe(false)
  })

  it('max 必须 > 0', () => {
    expect(validateProgress({ value: 1, max: 0 }).ok).toBe(false)
    expect(validateProgress({ value: 1, max: -5 }).ok).toBe(false)
  })

  it('tone 枚举', () => {
    expect(validateProgress({ value: 1, tone: 'purple' }).ok).toBe(false)
  })

  it('label ≤ 80 字符', () => {
    expect(validateProgress({ value: 1, label: 'x'.repeat(81) }).ok).toBe(false)
  })
})

describe('progress 渲染断言', () => {
  it('渲染不崩且输出 progressbar 无障碍属性与宽度', () => {
    const markup = renderToStaticMarkup(<ProgressRender props={{ label: '完成度', value: 50, max: 100 }} />)
    expect(markup).toContain('data-openloop-preset="progress"')
    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="50"')
    expect(markup).toContain('aria-valuemax="100"')
    expect(markup).toContain('width:50%')
    expect(markup).toContain('完成度')
  })

  it('tone 映射对应基色 token', () => {
    const markup = renderToStaticMarkup(<ProgressRender props={{ value: 100, tone: 'success' }} />)
    expect(markup).toContain('--openloop-success')
  })

  it('value 超 max 截断为满格', () => {
    const markup = renderToStaticMarkup(<ProgressRender props={{ value: 150, max: 100 }} />)
    expect(markup).toContain('aria-valuenow="100"')
    expect(markup).toContain('width:100%')
  })
})
