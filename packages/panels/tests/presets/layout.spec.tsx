import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateStack } from '../../src/presets/stack/validate.ts'
import { StackRender } from '../../src/presets/stack/Render.tsx'
import { validateGrid } from '../../src/presets/grid/validate.ts'
import { GridRender } from '../../src/presets/grid/Render.tsx'
import { validateRow } from '../../src/presets/row/validate.ts'
import { RowRender } from '../../src/presets/row/Render.tsx'

const child = { id: 't', source: { type: 'preset', kind: 'text', props: { text: 'x' } } }

describe('stack schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateStack({ direction: 'horizontal', gap: 12, align: 'center', children: [child] }).ok).toBe(true)
    expect(validateStack({}).ok).toBe(true)
  })

  it('direction 枚举', () => {
    expect(validateStack({ direction: 'diagonal' }).ok).toBe(false)
  })

  it('gap 0–48 整数', () => {
    expect(validateStack({ gap: -1 }).ok).toBe(false)
    expect(validateStack({ gap: 49 }).ok).toBe(false)
    expect(validateStack({ gap: 8.5 }).ok).toBe(false)
  })

  it('children 容器嵌套拒绝', () => {
    expect(validateStack({ children: [{ id: 's', source: { type: 'preset', kind: 'split', props: {} } }] }).ok).toBe(false)
  })
})

describe('stack 渲染断言', () => {
  it('默认 vertical 列向 + gap 8', () => {
    const markup = renderToStaticMarkup(<StackRender props={{ children: [child, child] }} />)
    expect(markup).toContain('data-openloop-preset="stack"')
    expect(markup).toContain('flex-direction:column')
    expect(markup).toContain('data-openloop-gap="8"')
  })

  it('horizontal 行向', () => {
    const markup = renderToStaticMarkup(<StackRender props={{ direction: 'horizontal', gap: 16, children: [child] }} />)
    expect(markup).toContain('flex-direction:row')
    expect(markup).toContain('data-openloop-gap="16"')
  })
})

describe('grid schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateGrid({ columns: 3, gap: 8, children: [child] }).ok).toBe(true)
  })

  it('columns 1–6 整数', () => {
    expect(validateGrid({ columns: 0 }).ok).toBe(false)
    expect(validateGrid({ columns: 7 }).ok).toBe(false)
    expect(validateGrid({ columns: 2.5 }).ok).toBe(false)
    expect(validateGrid({ columns: 6 }).ok).toBe(true)
  })
})

describe('grid 渲染断言', () => {
  it('默认 2 列 repeat(2, minmax(0,1fr))', () => {
    const markup = renderToStaticMarkup(<GridRender props={{ children: [child] }} />)
    expect(markup).toContain('data-openloop-preset="grid"')
    expect(markup).toContain('repeat(2, minmax(0, 1fr))')
    expect(markup).toContain('data-openloop-columns="2"')
  })

  it('指定 4 列生效', () => {
    const markup = renderToStaticMarkup(<GridRender props={{ columns: 4, children: [child] }} />)
    expect(markup).toContain('repeat(4, minmax(0, 1fr))')
  })
})

describe('row schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateRow({ gap: 4, align: 'start', wrap: false, children: [child] }).ok).toBe(true)
  })

  it('wrap 必须布尔', () => {
    expect(validateRow({ wrap: 1 }).ok).toBe(false)
  })

  it('align 枚举', () => {
    expect(validateRow({ align: 'baseline' }).ok).toBe(false)
  })
})

describe('row 渲染断言', () => {
  it('横向 flex + 可换行', () => {
    const markup = renderToStaticMarkup(<RowRender props={{ children: [child] }} />)
    expect(markup).toContain('data-openloop-preset="row"')
    expect(markup).toContain('flex-direction:row')
    expect(markup).toContain('flex-wrap:wrap')
  })
})
