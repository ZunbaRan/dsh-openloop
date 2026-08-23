/**
 * Dock 布局引擎（移植自 OCIX workbench-layout，12 列网格）。
 * 纯函数、无 DOM 依赖——可单测。
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

export interface Rect extends TileLayout {}

const overlaps = (a: Rect, b: Rect): boolean =>
  a.column < b.column + b.columns && b.column < a.column + a.columns &&
  a.row < b.row + b.rows && b.row < a.row + a.rows

/** 网格占用图（行数动态）：occupied[r][c] = tileId */
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

/** 从上往下找第一个能放下的空位（紧凑布局：新 tile 落到最上可用位置） */
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
  // 满了：落到网格底部之后（clamp 引擎允许溢出行，渲染层滚动）
  return { column: 0, row: MAX_ROWS, columns, rows }
}

/** 紧凑化：所有 tile 依次按原顺序下落到最低可能位置（重力排序） */
export function compactTiles<T extends { tileId: string; layout: TileLayout }>(tiles: readonly T[]): T[] {
  const sorted = [...tiles].sort((a, b) => (a.layout.row - b.layout.row) || (a.layout.column - b.layout.column))
  const placed: Array<{ tileId: string; layout: TileLayout }> = []
  const result: T[] = []
  for (const tile of sorted) {
    const slot = findNearestSlot(placed, tile.layout)
    placed.push({ tileId: tile.tileId, layout: slot })
    result.push({ ...tile, layout: slot })
  }
  return result
}

/** 网格总高度（行数）：空板为 0 */
export function gridHeight(tiles: ReadonlyArray<{ layout: TileLayout }>): number {
  return tiles.reduce((max, t) => Math.max(max, t.layout.row + t.layout.rows), 0)
}

/** 放置校验：target 位置若与其他 tile 碰撞则返回被撞者（用于拖放交换判定） */
export function collisionAt(
  tiles: ReadonlyArray<{ tileId: string; layout: TileLayout }>,
  tileId: string,
  target: TileLayout,
): { tileId: string; layout: TileLayout } | undefined {
  const clamped = clampLayout(target)
  return tiles.find(other => other.tileId !== tileId && overlaps(clamped, other.layout))
}

/** 交换两 tile 的布局（拖到已占用格时的 OCIX swap 行为） */
export function swapLayouts<T extends { tileId: string; layout: TileLayout }>(
  tiles: readonly T[], dragId: string, overId: string,
): T[] {
  const drag = tiles.find(t => t.tileId === dragId)
  const over = tiles.find(t => t.tileId === overId)
  if (!drag || !over) return [...tiles]
  return tiles.map(t => {
    if (t.tileId === dragId) return { ...t, layout: over.layout }
    if (t.tileId === overId) return { ...t, layout: drag.layout }
    return t
  })
}
