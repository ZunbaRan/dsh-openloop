import { describe, expect, it } from 'vitest'
import { clampLayout, compactTiles, findNearestSlot, toRglLayout, fromRglLayout } from '../src/client/layout.ts'

describe('dock 布局坐标层（RGL v2 时代，2026-08-24）', () => {
  it('clamp：宽 1-12、不越右缘', () => {
    expect(clampLayout({ column: 11, columns: 4, row: -1, rows: 99 })).toEqual({ column: 8, row: 0, columns: 4, rows: 24 })
  })

  it('findNearestSlot：首个可放空位（紧凑下落）——pin 落位语义', () => {
    const tiles = [{ tileId: 'a', layout: { column: 0, row: 0, columns: 12, rows: 2 } }]
    expect(findNearestSlot(tiles, { columns: 6, rows: 2 })).toEqual({ column: 0, row: 2, columns: 6, rows: 2 })
  })

  it('toRglLayout：TileLayout → LayoutItem 映射', () => {
    const items = toRglLayout([{ tileId: 'a', layout: { column: 3, row: 4, columns: 6, rows: 2 } }])
    expect(items).toEqual([{ i: 'a', x: 3, y: 4, w: 6, h: 2 }])
  })

  it('fromRglLayout：LayoutItem → 钳制后的 TileLayout；坏项跳过', () => {
    const map = fromRglLayout([
      { i: 'a', x: 2, y: 1, w: 4, h: 3 },
      { i: 'b', x: 99, y: -5, w: 99, h: 99 },
      { i: '', x: 0, y: 0, w: 1, h: 1 },
    ])
    expect(map.get('a')).toEqual({ column: 2, row: 1, columns: 4, rows: 3 })
    expect(map.get('b')).toEqual({ column: 0, row: 0, columns: 12, rows: 24 })
    expect(map.has('')).toBe(false)
  })

  it('往返一致：to → from 保持坐标', () => {
    const tiles = [
      { tileId: 'a', layout: { column: 0, row: 0, columns: 6, rows: 4 } },
      { tileId: 'b', layout: { column: 6, row: 0, columns: 6, rows: 2 } },
    ]
    const round = fromRglLayout(toRglLayout(tiles))
    for (const t of tiles) expect(round.get(t.tileId)).toEqual(t.layout)
  })
})

describe('compactTiles 重力紧凑（整理按钮，2026-08-24 恢复）', () => {
  it('消除空洞且保持相对顺序', () => {
    const tiles = [
      { tileId: 'a', layout: { column: 0, row: 0, columns: 6, rows: 2 } },
      { tileId: 'b', layout: { column: 0, row: 5, columns: 6, rows: 2 } }, // 与 a 之间有空洞
      { tileId: 'c', layout: { column: 6, row: 8, columns: 6, rows: 2 } },
    ]
    const result = compactTiles(tiles)
    // a 不动；b 上移到 row 0 右侧或 row 2；c 紧随其后——无重叠
    const ids = result.map(t => t.tileId)
    expect(ids).toEqual(['a', 'b', 'c'])
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const x = result[i]!.layout, y = result[j]!.layout
        const overlap = x.column < y.column + y.columns && y.column < x.column + x.columns && x.row < y.row + y.rows && y.row < x.row + x.rows
        expect(overlap).toBe(false)
      }
    }
    // 紧凑后最大 row 应小于紧凑前
    expect(Math.max(...result.map(t => t.layout.row))).toBeLessThan(8)
  })

  it('已紧凑的板子不产生变化（幂等）', () => {
    const tiles = [
      { tileId: 'a', layout: { column: 0, row: 0, columns: 12, rows: 4 } },
      { tileId: 'b', layout: { column: 0, row: 4, columns: 6, rows: 4 } },
      { tileId: 'c', layout: { column: 6, row: 4, columns: 6, rows: 4 } },
    ]
    const result = compactTiles(tiles)
    expect(result.map(t => t.layout)).toEqual(tiles.map(t => t.layout))
  })
})
