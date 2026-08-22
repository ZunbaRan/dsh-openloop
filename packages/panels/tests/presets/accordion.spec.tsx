import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateAccordion } from '../../src/presets/accordion/validate.ts'
import { AccordionRender } from '../../src/presets/accordion/Render.tsx'

const validProps = {
  title: '部署说明',
  defaultOpenIndex: 1,
  items: [
    { label: '第一步', content: '克隆仓库' },
    { label: '第二步', content: 'pnpm install' },
  ],
}

describe('accordion schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateAccordion(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateAccordion(undefined).ok).toBe(false)
    expect(validateAccordion('x').ok).toBe(false)
  })

  it('items 必填且 1–20 项', () => {
    expect(validateAccordion({}).ok).toBe(false)
    expect(validateAccordion({ items: [] }).ok).toBe(false)
    const many = Array.from({ length: 21 }, (_, i) => ({ label: `L${i}` }))
    expect(validateAccordion({ items: many }).ok).toBe(false)
  })

  it('item label 必填 1–80 字符', () => {
    expect(validateAccordion({ items: [{ content: '缺 label' }] }).ok).toBe(false)
    expect(validateAccordion({ items: [{ label: '' }] }).ok).toBe(false)
    expect(validateAccordion({ items: [{ label: 'x'.repeat(81) }] }).ok).toBe(false)
  })

  it('item content ≤ 2000 字符', () => {
    expect(validateAccordion({ items: [{ label: 'a', content: 'x'.repeat(2001) }] }).ok).toBe(false)
  })

  it('defaultOpenIndex 非负整数', () => {
    expect(validateAccordion({ items: [{ label: 'a' }], defaultOpenIndex: -1 }).ok).toBe(false)
    expect(validateAccordion({ items: [{ label: 'a' }], defaultOpenIndex: 1.5 }).ok).toBe(false)
  })
})

describe('accordion 渲染断言', () => {
  it('渲染不崩且默认展开第一项', () => {
    const markup = renderToStaticMarkup(<AccordionRender props={{ items: [{ label: '第一步', content: '克隆仓库' }, { label: '第二步', content: 'pnpm install' }] }} />)
    expect(markup).toContain('data-openloop-preset="accordion"')
    expect(markup).toContain('第一步')
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('克隆仓库')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('defaultOpenIndex 生效', () => {
    const markup = renderToStaticMarkup(<AccordionRender props={validProps} />)
    expect(markup).toContain('pnpm install')
    expect(markup).toContain('data-openloop-count="2"')
  })
})
