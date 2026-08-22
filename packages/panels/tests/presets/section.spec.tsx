import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateSection } from '../../src/presets/section/validate.ts'
import { SectionRender } from '../../src/presets/section/Render.tsx'

const child = { id: 't', source: { type: 'preset', kind: 'text', props: { text: '内容' } } }

describe('section schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateSection({ title: '分区', bordered: false, children: [child] }).ok).toBe(true)
    expect(validateSection({}).ok).toBe(true)
  })

  it('title 超长拒绝', () => {
    expect(validateSection({ title: 'x'.repeat(121) }).ok).toBe(false)
  })

  it('bordered 必须布尔', () => {
    expect(validateSection({ bordered: 'yes' }).ok).toBe(false)
  })

  it('children 容器嵌套拒绝', () => {
    expect(validateSection({ children: [{ id: 's', source: { type: 'preset', kind: 'grid', props: {} } }] }).ok).toBe(false)
  })
})

describe('section 渲染断言', () => {
  it('bordered 默认 true；false 时渲染纯分区', () => {
    const bordered = renderToStaticMarkup(<SectionRender props={{ title: 'A' }} />)
    expect(bordered).toContain('data-openloop-bordered="true"')
    const plain = renderToStaticMarkup(<SectionRender props={{ title: 'A', bordered: false }} />)
    expect(plain).toContain('data-openloop-bordered="false"')
  })

  it('渲染标题 + 子 widget', () => {
    const markup = renderToStaticMarkup(<SectionRender props={{ title: '部署', children: [child] }} />)
    expect(markup).toContain('data-openloop-preset="section"')
    expect(markup).toContain('部署')
    expect(markup).toContain('data-openloop-preset="text"')
  })
})
