import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateDataTable } from '../../src/presets/data-table/validate.ts'
import { DataTableRender } from '../../src/presets/data-table/Render.tsx'

const validProps = {
  title: '订单明细',
  columns: [
    { key: 'name', label: '客户' },
    { key: 'amount', label: '金额', format: 'currency-cny' },
    { key: 'rate', label: '占比', format: 'percent' },
  ],
  rows: [
    { id: 1, name: '甲', amount: 1234.5, rate: 0.124 },
    { id: 2, name: '乙', amount: 99, rate: 0.05, tone: 'error' },
  ],
  density: 'compact',
}

describe('data-table schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateDataTable(validProps).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateDataTable('nope').ok).toBe(false)
    expect(validateDataTable(null).ok).toBe(false)
  })

  it('columns 必填且 1–12 列', () => {
    expect(validateDataTable({ rows: [] }).ok).toBe(false)
    expect(validateDataTable({ columns: [] }).ok).toBe(false)
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ key: `c${i}` }))
    expect(validateDataTable({ columns: thirteen }).ok).toBe(false)
  })

  it('column key 必填非空 ≤40 字符', () => {
    expect(validateDataTable({ columns: [{ label: '缺 key' }] }).ok).toBe(false)
    expect(validateDataTable({ columns: [{ key: '' }] }).ok).toBe(false)
    expect(validateDataTable({ columns: [{ key: 'x'.repeat(41) }] }).ok).toBe(false)
  })

  it('rows 上限 200 且每行为对象', () => {
    const rows = Array.from({ length: 201 }, (_, i) => ({ i }))
    expect(validateDataTable({ columns: [{ key: 'i' }], rows }).ok).toBe(false)
    expect(validateDataTable({ columns: [{ key: 'i' }], rows: [1, 2] }).ok).toBe(false)
  })

  it('density 仅 comfortable/compact', () => {
    expect(validateDataTable({ columns: [{ key: 'i' }], density: 'spacious' }).ok).toBe(false)
  })

  it('行 tone 仅 success/error/warning', () => {
    expect(validateDataTable({ columns: [{ key: 'i' }], rows: [{ i: 1, tone: 'info' }] }).ok).toBe(false)
    expect(validateDataTable({ columns: [{ key: 'i' }], rows: [{ i: 1, tone: 'warning' }] }).ok).toBe(true)
  })
})

describe('data-table 渲染断言', () => {
  it('渲染不崩且输出列头与单元格', () => {
    const markup = renderToStaticMarkup(<DataTableRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="data-table"')
    expect(markup).toContain('data-openloop-density="compact"')
    expect(markup).toContain('订单明细')
    expect(markup).toContain('>客户<')
    expect(markup).toContain('甲')
  })

  it('数字列右对齐 + tabular-nums，非数字列左对齐', () => {
    const markup = renderToStaticMarkup(<DataTableRender props={validProps} />)
    expect(markup).toContain('font-variant-numeric:tabular-nums')
    expect(markup).toContain('text-align:right')
    expect(markup).toContain('1,234.5')
  })

  it('数字 format 走 Intl', () => {
    const markup = renderToStaticMarkup(<DataTableRender props={validProps} />)
    expect(markup).toContain('1,234.5')
    expect(markup).toContain('12.4%')
  })

  it('行 tone 整行淡底用 --openloop-error-background', () => {
    const markup = renderToStaticMarkup(<DataTableRender props={validProps} />)
    expect(markup).toContain('data-openloop-row-tone="error"')
    expect(markup).toContain('background:var(--openloop-error-background)')
  })

  it('空 rows 渲染空态', () => {
    const markup = renderToStaticMarkup(<DataTableRender props={{ columns: [{ key: 'i', label: '序号' }], rows: [] }} />)
    expect(markup).toContain('暂无数据')
  })
})
