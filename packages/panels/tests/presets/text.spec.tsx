import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateText } from '../../src/presets/text/validate.ts'
import { TextRender } from '../../src/presets/text/Render.tsx'

describe('text schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateText({ text: '你好' }).ok).toBe(true)
    expect(validateText({ text: 'x', size: 'xl', tone: 'muted', align: 'center' }).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateText(undefined).ok).toBe(false)
    expect(validateText('x').ok).toBe(false)
    expect(validateText([]).ok).toBe(false)
  })

  it('text 必填且 1–5000 字符', () => {
    expect(validateText({}).ok).toBe(false)
    expect(validateText({ text: '' }).ok).toBe(false)
    expect(validateText({ text: 'x'.repeat(5001) }).ok).toBe(false)
  })

  it('size/tone/align 枚举拒绝', () => {
    expect(validateText({ text: 'a', size: 'huge' }).ok).toBe(false)
    expect(validateText({ text: 'a', tone: 'warn' }).ok).toBe(false)
    expect(validateText({ text: 'a', align: 'justify' }).ok).toBe(false)
  })
})

describe('text 渲染断言', () => {
  it('渲染不崩且保留换行、挂 data 属性', () => {
    const markup = renderToStaticMarkup(<TextRender props={{ text: '第一行\n第二行', size: 'lg' }} />)
    expect(markup).toContain('data-openloop-preset="text"')
    expect(markup).toContain('data-openloop-size="lg"')
    expect(markup).toContain('第一行\n第二行')
    expect(markup).toContain('white-space:pre-wrap')
  })
})
