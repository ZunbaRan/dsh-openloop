/**
 * Dock 布局坐标层（2026-08-24 v0.3.0：交互引擎迁至 react-grid-layout v2）。
 *
 * 本文件只保留纯数据语义：
 * - TileLayout 坐标模型 + clamp 边界（store 持久化/容错用）
 * - findNearestSlot（pin 新 tile 落位——RGL 只管既有 tile 的排列）
 * - 与 RGL LayoutItem {i,x,y,w,h} 的双向映射（view 边界转换）
 *
 * 拖拽/resize/碰撞/紧凑全部由 RGL 的 verticalCompactor 承担——
 * 此前的手写 collisionAt/swapLayouts/compactTiles 已删（dnd-kit 时代产物）。
 */

export const GRID_COLUMNS = 12
export const DEFAULT_COLUMNS = 6
export const DEFAULT_ROWS = 4
export const MIN_COLUMNS = 2
export const MIN_ROWS = 2
export const MAX_ROWS = 24

export interface TileLayout {
  column: number
  row: number
  columns: number
  rows: number
}

/** react-grid-layout 的 LayoutItem（结构映射子集） */
export interface RglItem {
  i: string
  x: number
  y: number
  w: number
  h: number
}

const int = (value: number, fallback: number): number =>
  Number.isFinite(value) ? Math.round(value) : fallback

/** 钳制布局到合法边界（宽 1-12 列 / 高 1-24 行 / 不越出右缘） */
export function clampLayout(layout: Partial<TileLayout>): TileLayout {
  const columns = Math.min(GRID_COLUMNS, Math.max(1, int(layout.columns ?? DEFAULT_COLUMNS, DEFAULT_COLUMNS)))
  const rows = Math.min(MAX_ROWS, Math.max(1, int(layout.rows ?? DEFAULT_ROWS, DEFAULT_ROWS)))
  const column = Math.min(GRID_COLUMNS - columns, Math.max(0, int(layout.column ?? 0, 0)))
  const row = Math.max(0, int(layout.row ?? 0, 0))
  return { column, row, columns, rows }
}

/** 网格占用图（行数动态）：occupied[r][c] */
function buildOccupancy(tiles: ReadonlyArray<{ tileId: string; layout: TileLayout }>, skipId?: string): Map<number, Set<number>> {
  const occupied = new Map<number, Set<number>>()
  for (const tile of tiles) {
    if (tile.tileId === skipId) continue
    for (let r = tile.layout.row; r < tile.layout.row + tile.layout.rows; r++) {
      for (let c = tile.layout.column; c < tile.layout.column + tile.layout.columns; c++) {
        if (!occupied.has(r)) occupied.set(r, new Set())
        occupied.get(r)!.add(c)
      }
    }
  }
  return occupied
}

const cellFree = (occupied: Map<number, Set<number>>, row: number, column: number): boolean =>
  !(occupied.get(row)?.has(column) ?? false)

/**
 * pin 落位：从上往下找第一个能放下的空位（RGL 接管后仍保留——
 * 新 tile 进板需要一个合法非重叠的初始位置，RGL 不会为外部新增项找位）。
 */
export function findNearestSlot(
  tiles: ReadonlyArray<{ tileId: string; layout: TileLayout }>,
  size: { columns: number; rows: number },
  skipId?: string,
): TileLayout {
  const { columns, rows } = clampLayout({ ...size, column: 0, row: 0 })
  const occupied = buildOccupancy(tiles, skipId)
  for (let r = 0; r <= MAX_ROWS - rows; r++) {
    for (let c = 0; c <= GRID_COLUMNS - columns; c++) {
      let free = true
      for (let dr = 0; dr < rows && free; dr++) {
        for (let dc = 0; dc < columns && free; dc++) {
          if (!cellFree(occupied, r + dr, c + dc)) free = false
        }
      }
      if (free) return { column: c, row: r, columns, rows }
    }
  }
  return { column: 0, row: MAX_ROWS, columns, rows }
}

// ---- RGL LayoutItem 双向映射（view 边界） ----

/** DockTile[] → RGL layout（渲染输入） */
export function toRglLayout(tiles: ReadonlyArray<{ tileId: string; layout: TileLayout }>): RglItem[] {
  return tiles.map(t => ({ i: t.tileId, x: t.layout.column, y: t.layout.row, w: t.layout.columns, h: t.layout.rows }))
}

/** RGL layout → tileId → TileLayout（onLayoutChange 回写输入；非法项钳制） */
export function fromRglLayout(items: ReadonlyArray<RglItem>): Map<string, TileLayout> {
  const result = new Map<string, TileLayout>()
  for (const item of items) {
    if (typeof item?.i !== 'string' || item.i.length === 0 || typeof item.x !== 'number' || typeof item.y !== 'number') continue
    result.set(item.i, clampLayout({ column: item.x, row: item.y, columns: item.w, rows: item.h }))
  }
  return result
}
