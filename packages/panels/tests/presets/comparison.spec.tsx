import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateComparison } from '../../src/presets/comparison/validate.ts'
import { ComparisonRender } from '../../src/presets/comparison/Render.tsx'

const validProps = {
  title: '方案对比',
  columns: [
    { id: 'basic', title: '基础版', subtitle: '免费' },
    { id: 'pro', title: '专业版', subtitle: '¥99/月', recommended: true },
  ],
  rows: [
    { label: '存储空间', values: ['5 GB', '100 GB'] },
    { label: '团队协作', values: ['不支持', '支持'], emphasis: 'strong' },
  ],
}

describe('comparison schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateComparison(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateComparison(undefined).ok).toBe(false)
    expect(validateComparison('x').ok).toBe(false)
  })

  it('columns 必填且 2–4 个', () => {
    expect(validateComparison({ rows: [{ label: 'a', values: ['1'] }] }).ok).toBe(false)
    expect(
      validateComparison({
        columns: [{ id: 'a', title: 'A' }],
        rows: [{ label: 'r', values: ['1'] }],
      }).ok,
    ).toBe(false)
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `c${i}`, title: `C${i}` }))
    expect(
      validateComparison({ columns: many, rows: [{ label: 'r', values: ['1', '2', '3', '4', '5'] }] }).ok,
    ).toBe(false)
  })

  it('rows 必填且 1–12 个', () => {
    const columns = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ]
    expect(validateComparison({ columns }).ok).toBe(false)
    expect(validateComparison({ columns, rows: [] }).ok).toBe(false)
    const manyRows = Array.from({ length: 13 }, (_, i) => ({ label: `R${i}`, values: ['1', '2'] }))
    expect(validateComparison({ columns, rows: manyRows }).ok).toBe(false)
  })

  it('推荐列超过 1 个拒绝', () => {
    const result = validateComparison({
      columns: [
        { id: 'a', title: 'A', recommended: true },
        { id: 'b', title: 'B', recommended: true },
      ],
      rows: [{ label: 'r', values: ['1', '2'] }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.message.includes('recommended'))).toBe(true)
  })

  it('列 id 重复拒绝', () => {
    expect(
      validateComparison({
        columns: [
          { id: 'a', title: 'A' },
          { id: 'a', title: 'B' },
        ],
        rows: [{ label: 'r', values: ['1', '2'] }],
      }).ok,
    ).toBe(false)
  })

  it('values 长度与列数不一致拒绝', () => {
    const result = validateComparison({
      columns: [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ],
      rows: [{ label: 'r', values: ['1', '2'] }],
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.some((e) => e.path === 'rows[0].values')).toBe(true)
  })

  it('row label 必填非空，emphasis 限 normal/strong', () => {
    const columns = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
    ]
    expect(validateComparison({ columns, rows: [{ label: ' ', values: ['1', '2'] }] }).ok).toBe(false)
    expect(
      validateComparison({ columns, rows: [{ label: 'r', values: ['1', '2'], emphasis: 'bold' }] }).ok,
    ).toBe(false)
  })
})

describe('comparison 渲染断言', () => {
  it('渲染不崩且默认聚焦推荐列', () => {
    const markup = renderToStaticMarkup(<ComparisonRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="comparison"')
    expect(markup).toContain('基础版')
    expect(markup).toContain('专业版 · 推荐')
    expect(markup).toContain('存储空间')
    expect(markup).toContain('100 GB')
    // 推荐列（第 2 列）pill 处于选中态
    expect(markup).toContain('aria-selected="true"')
    expect(markup).toContain('var(--openloop-selection)')
  })

  it('无推荐列时聚焦第一列，不崩', () => {
    const markup = renderToStaticMarkup(
      <ComparisonRender
        props={{
          columns: [
            { id: 'a', title: 'A' },
            { id: 'b', title: 'B' },
          ],
          rows: [{ label: 'r', values: ['1', '2'] }],
        }}
      />,
    )
    expect(markup).toContain('data-openloop-preset="comparison"')
  })

  it('空数据兜底不崩', () => {
    const markup = renderToStaticMarkup(<ComparisonRender props={{}} />)
    expect(markup).toContain('暂无对比数据')
  })
})
