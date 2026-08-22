import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateCallout } from '../../src/presets/callout/validate.ts'
import { CalloutRender } from '../../src/presets/callout/Render.tsx'

describe('callout schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateCallout({ tone: 'warning', title: '注意', description: '配额即将用尽' }).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateCallout(undefined).ok).toBe(false)
    expect(validateCallout(null).ok).toBe(false)
  })

  it('description 必填 ≤240 字符', () => {
    expect(validateCallout({}).ok).toBe(false)
    expect(validateCallout({ description: '' }).ok).toBe(false)
    expect(validateCallout({ description: 'x'.repeat(241) }).ok).toBe(false)
  })

  it('title ≤ 80 字符', () => {
    expect(validateCallout({ description: 'x', title: 'x'.repeat(81) }).ok).toBe(false)
  })

  it('tone 仅 info/success/warning/error', () => {
    expect(validateCallout({ description: 'x', tone: 'neutral' }).ok).toBe(false)
  })
})

describe('callout 渲染断言', () => {
  it('渲染不崩且使用对应 tone 的 background/border 件套', () => {
    const markup = renderToStaticMarkup(<CalloutRender props={{ tone: 'error', title: '失败', description: '请求超时' }} />)
    expect(markup).toContain('data-openloop-preset="callout"')
    expect(markup).toContain('data-openloop-tone="error"')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('--openloop-error-border')
    expect(markup).toContain('--openloop-error-background')
    expect(markup).toContain('失败')
    expect(markup).toContain('请求超时')
  })

  it('info 默认 tone 且 role="status"', () => {
    const markup = renderToStaticMarkup(<CalloutRender props={{ description: '提示' }} />)
    expect(markup).toContain('data-openloop-tone="info"')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('--openloop-info-border')
  })

  it('success tone 使用 success 件套', () => {
    const markup = renderToStaticMarkup(<CalloutRender props={{ tone: 'success', description: '已完成' }} />)
    expect(markup).toContain('--openloop-success-border')
    expect(markup).toContain('--openloop-success-background')
  })
})
