import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateCard } from '../../src/presets/card/validate.ts'
import { CardRender } from '../../src/presets/card/Render.tsx'

const validProps = {
  title: '订单总览',
  description: '今日核心指标',
  children: [
    { id: 'head', source: { type: 'preset', kind: 'heading', props: { text: '指标', level: 2 } } },
    { id: 'body', source: { type: 'preset', kind: 'text', props: { text: '本月增长 12%' } } },
  ],
}

describe('card schema 边界', () => {
  it('合法 props 通过（title/description/children）', () => {
    expect(validateCard(validProps).ok).toBe(true)
    expect(validateCard({ title: '空卡' }).ok).toBe(true) // children 可省略
  })

  it('非对象拒绝', () => {
    expect(validateCard('x').ok).toBe(false)
  })

  it('title/description 长度上限', () => {
    expect(validateCard({ title: 'x'.repeat(121) }).ok).toBe(false)
    expect(validateCard({ description: 'x'.repeat(361) }).ok).toBe(false)
  })

  it('children 必须为 0–12 数组', () => {
    expect(validateCard({ children: 'nope' }).ok).toBe(false)
    const many = Array.from({ length: 13 }, (_, i) => ({ id: `w-${i}`, source: { type: 'preset', kind: 'text', props: { text: 'x' } } }))
    expect(validateCard({ children: many }).ok).toBe(false)
  })

  it('children 禁止容器嵌套（仅一层、不自引用）', () => {
    expect(validateCard({ children: [{ id: 'inner', source: { type: 'preset', kind: 'stack', props: {} } }] }).ok).toBe(false)
    expect(validateCard({ children: [{ id: 'inner', source: { type: 'preset', kind: 'card', props: {} } }] }).ok).toBe(false)
  })

  it('children 未知 kind / 缺 id / 非 preset source 拒绝', () => {
    expect(validateCard({ children: [{ id: 'x', source: { type: 'preset', kind: 'nope', props: {} } }] }).ok).toBe(false)
    expect(validateCard({ children: [{ source: { type: 'preset', kind: 'text', props: { text: 'x' } } }] }).ok).toBe(false)
    expect(validateCard({ children: [{ id: 'x', source: { type: 'custom', code: 'fn' } }] }).ok).toBe(false)
  })

  it('children id 重复拒绝', () => {
    expect(validateCard({ children: [child('dup'), child('dup')] }).ok).toBe(false)
  })
})

function child(id: string) {
  return { id, source: { type: 'preset', kind: 'text', props: { text: 'x' } } }
}

describe('card 渲染断言', () => {
  it('渲染外壳 + 头 + 子 widget 递归渲染', () => {
    const markup = renderToStaticMarkup(<CardRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="card"')
    expect(markup).toContain('订单总览')
    expect(markup).toContain('今日核心指标')
    expect(markup).toContain('data-openloop-preset="heading"')
    expect(markup).toContain('data-openloop-preset="text"')
    expect(markup).toContain('本月增长 12%')
  })

  it('非法子 widget 渲染降级占位而非崩溃', () => {
    const markup = renderToStaticMarkup(<CardRender props={{ children: [{ id: 'bad', source: { type: 'preset', kind: 'no-such', props: {} } }] }} />)
    expect(markup).toContain('data-openloop-widget="invalid"')
    expect(markup).toContain('子组件不可用')
  })
})
