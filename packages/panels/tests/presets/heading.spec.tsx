import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateHeading } from '../../src/presets/heading/validate.ts'
import { HeadingRender } from '../../src/presets/heading/Render.tsx'

describe('heading schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateHeading({ text: '标题', level: 2 }).ok).toBe(true)
    expect(validateHeading({ text: '标题' }).ok).toBe(true) // level 缺省 1
  })

  it('非对象 / 缺 text / 空串拒绝', () => {
    expect(validateHeading(null).ok).toBe(false)
    expect(validateHeading({}).ok).toBe(false)
    expect(validateHeading({ text: '  ' }).ok).toBe(false)
  })

  it('text 超 200 拒绝', () => {
    expect(validateHeading({ text: 'x'.repeat(201) }).ok).toBe(false)
  })

  it('level 必须 1–4 整数', () => {
    expect(validateHeading({ text: 'a', level: 0 }).ok).toBe(false)
    expect(validateHeading({ text: 'a', level: 5 }).ok).toBe(false)
    expect(validateHeading({ text: 'a', level: 1.5 }).ok).toBe(false)
    expect(validateHeading({ text: 'a', level: 4 }).ok).toBe(true)
  })

  it('align 枚举拒绝', () => {
    expect(validateHeading({ text: 'a', align: 'top' }).ok).toBe(false)
  })
})

describe('heading 渲染断言', () => {
  it('level 2 渲染 h2 且映射全局字阶', () => {
    const markup = renderToStaticMarkup(<HeadingRender props={{ text: '章节', level: 2 }} />)
    expect(markup).toContain('<h2')
    expect(markup).toContain('data-openloop-preset="heading"')
    expect(markup).toContain('data-openloop-level="2"')
    expect(markup).toContain('var(--openloop-type-title')
    expect(markup).toContain('章节')
  })
})
