import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateTimeline } from '../../src/presets/timeline/validate.ts'
import { TimelineRender } from '../../src/presets/timeline/Render.tsx'

const validProps = {
  title: '迭代节奏',
  items: [
    { id: 't1', title: '需求评审', status: 'past', time: '周一' },
    { id: 't2', title: '开发联调', status: 'current', time: '周三', detail: '进行中' },
    { id: 't3', title: '灰度发布', status: 'future', time: '周五' },
  ],
}

describe('timeline schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateTimeline(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateTimeline(undefined).ok).toBe(false)
    expect(validateTimeline([]).ok).toBe(false)
  })

  it('items 必填且 2–16 个', () => {
    expect(validateTimeline({}).ok).toBe(false)
    expect(validateTimeline({ items: [{ id: 'a', title: 'A' }] }).ok).toBe(false)
    const many = Array.from({ length: 17 }, (_, i) => ({ id: `t${i}`, title: `T${i}` }))
    expect(validateTimeline({ items: many }).ok).toBe(false)
  })

  it('条目 id 唯一且 title 必填非空', () => {
    expect(
      validateTimeline({
        items: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
      }).ok,
    ).toBe(false)
    expect(
      validateTimeline({
        items: [
          { id: 'a', title: '' },
          { id: 'b', title: 'B' },
        ],
      }).ok,
    ).toBe(false)
    expect(
      validateTimeline({
        items: [
          { id: 'a', title: 'x'.repeat(81) },
          { id: 'b', title: 'B' },
        ],
      }).ok,
    ).toBe(false)
  })

  it('status 限 past/current/future 三态', () => {
    expect(
      validateTimeline({
        items: [
          { id: 'a', title: 'A', status: 'done' },
          { id: 'b', title: 'B' },
        ],
      }).ok,
    ).toBe(false)
    expect(
      validateTimeline({
        items: [
          { id: 'a', title: 'A', status: 'past' },
          { id: 'b', title: 'B', status: 'current' },
        ],
      }).ok,
    ).toBe(true)
  })
})

describe('timeline 渲染断言', () => {
  it('渲染不崩且状态标注齐全', () => {
    const markup = renderToStaticMarkup(<TimelineRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="timeline"')
    expect(markup).toContain('data-openloop-count="3"')
    expect(markup).toContain('需求评审')
    expect(markup).toContain('进行中')
    expect(markup).toContain('data-openloop-status="past"')
    expect(markup).toContain('data-openloop-status="current"')
    expect(markup).toContain('data-openloop-status="future"')
    expect(markup).toContain('var(--openloop-primary)')
  })

  it('status 省略时首项兜底 current、其余 future', () => {
    const markup = renderToStaticMarkup(
      <TimelineRender
        props={{
          items: [
            { id: 'a', title: 'A' },
            { id: 'b', title: 'B' },
          ],
        }}
      />,
    )
    expect(markup).toContain('data-openloop-status="current"')
    expect(markup).toContain('data-openloop-status="future"')
  })

  it('空数据兜底不崩', () => {
    const markup = renderToStaticMarkup(<TimelineRender props={{}} />)
    expect(markup).toContain('暂无时间线数据')
  })
})
