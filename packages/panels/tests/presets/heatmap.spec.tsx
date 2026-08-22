import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { validateHeatmap } from '../../src/presets/heatmap/validate.ts'
import { HeatmapRender } from '../../src/presets/heatmap/Render.tsx'

const validProps = {
  title: '渠道转化矩阵',
  matrix: [
    [10, 20, 30],
    [40, 50, 60],
    [70, 80, 90],
  ],
  rowLabels: ['周一', '周二', '周三'],
  colLabels: ['搜索', '信息流', '联盟'],
}

describe('heatmap schema 边界', () => {
  it('合法 props 通过', () => {
    expect(validateHeatmap(validProps).ok).toBe(true)
    expect(validateHeatmap({ matrix: [[1]] }).ok).toBe(true)
  })

  it('非对象 props 拒绝（fail-closed）', () => {
    expect(validateHeatmap('nope').ok).toBe(false)
    expect(validateHeatmap([1, 2]).ok).toBe(false)
  })

  it('matrix 必填且 ≤10 行 × ≤10 列', () => {
    expect(validateHeatmap({}).ok).toBe(false)
    const elevenRows = Array.from({ length: 11 }, () => [1, 2])
    expect(validateHeatmap({ matrix: elevenRows }).ok).toBe(false)
    const elevenCols = Array.from({ length: 5 }, () => Array.from({ length: 11 }, () => 1))
    expect(validateHeatmap({ matrix: elevenCols }).ok).toBe(false)
    expect(validateHeatmap({ matrix: [[]] }).ok).toBe(false)
  })

  it('各行必须等长且元素为有限数字', () => {
    expect(validateHeatmap({ matrix: [[1, 2], [1]] }).ok).toBe(false)
    expect(validateHeatmap({ matrix: [[1, 'x'], [2, 3]] }).ok).toBe(false)
    expect(validateHeatmap({ matrix: [[1, NaN], [2, 3]] }).ok).toBe(false)
  })

  it('rowLabels / colLabels 长度须与矩阵匹配', () => {
    expect(validateHeatmap({ ...validProps, rowLabels: ['a', 'b'] }).ok).toBe(false)
    expect(validateHeatmap({ ...validProps, colLabels: ['a', 'b'] }).ok).toBe(false)
    expect(validateHeatmap({ ...validProps, rowLabels: ['a'.repeat(41), 'b', 'c'] }).ok).toBe(false)
  })
})

describe('heatmap 渲染断言', () => {
  it('渲染 table + 每格 chart-seq 深浅填充', () => {
    const markup = renderToStaticMarkup(<HeatmapRender props={validProps} />)
    expect(markup).toContain('data-openloop-preset="heatmap"')
    expect(markup).toContain('data-openloop-count="9"')
    expect(markup).toContain('<table')
    expect(markup).toContain('<td')
    expect(markup).toContain('--openloop-chart-seq-5') // 最大值 90 → 最深
    expect(markup).toContain('--openloop-chart-seq-1') // 最小值 10 → 最浅
    expect(markup).toContain('周一')
    expect(markup).toContain('搜索')
  })

  it('值越大颜色越深：max 用深色且前景为 surface', () => {
    const markup = renderToStaticMarkup(<HeatmapRender props={validProps} />)
    expect(markup).toContain('--openloop-chart-seq-5')
    expect(markup).toContain('--openloop-surface)')
  })

  it('无行列标签时仍渲染且不崩', () => {
    const markup = renderToStaticMarkup(<HeatmapRender props={{ matrix: [[1, 2], [3, 4]] }} />)
    expect(markup).toContain('data-openloop-count="4"')
    expect(markup).toContain('<table')
  })

  it('空矩阵渲染占位且不崩', () => {
    const markup = renderToStaticMarkup(<HeatmapRender props={{ matrix: [] }} />)
    expect(markup).toContain('暂无数据')
  })
})
