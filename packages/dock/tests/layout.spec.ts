import { describe, expect, it } from 'vitest'
import { clampLayout, compactTiles, findNearestSlot, collisionAt, swapLayouts, gridHeight } from '../src/client/layout.ts'

describe('dock 布局引擎（OCIX 算法移植）', () => {
  it('clamp：宽 1-12、不越右缘', () => {
    expect(clampLayout({ column: 11, columns: 4, row: -1, rows: 99 })).toEqual({ column: 8, row: 0, columns: 4, rows: 24 })
  })

  it('findNearestSlot：首个可放空位（紧凑下落）', () => {
    const tiles = [{ tileId: 'a', layout: { column: 0, row: 0, columns: 12, rows: 2 } }]
    expect(findNearestSlot(tiles, { columns: 6, rows: 2 })).toEqual({ column: 0, row: 2, columns: 6, rows: 2 })
  })

  it('compact：重力排序后无空洞', () => {
    const tiles = [
      { tileId: 'a', layout: { column: 0, row: 4, columns: 6, rows: 2 } },
      { tileId: 'b', layout: { column: 6, row: 4, columns: 6, rows: 2 } },
    ]
    const result = compactTiles(tiles)
    expect(result.map(t => t.layout.row)).toEqual([0, 0])
    expect(gridHeight(result)).toBe(2)
  })

  it('collisionAt：碰撞检测与 swap', () => {
    const tiles = [
      { tileId: 'a', layout: { column: 0, row: 0, columns: 6, rows: 4 } },
      { tileId: 'b', layout: { column: 6, row: 0, columns: 6, rows: 4 } },
    ]
    expect(collisionAt(tiles, 'b', { column: 0, row: 0, columns: 6, rows: 4 })?.tileId).toBe('a')
    const swapped = swapLayouts(tiles, 'a', 'b')
    expect(swapped.find(t => t.tileId === 'a')?.layout.column).toBe(6)
    expect(swapped.find(t => t.tileId === 'b')?.layout.column).toBe(0)
  })
})
