/**
 * Dock Board store：tile 集合 + localStorage 持久化（OCIX useExtensionWorkbenchStore 同款语义）。
 * 使用 useSyncExternalStore 友好的手写 store（无 zustand 依赖——bundle 尺寸考虑）。
 */
import { clampLayout, compactTiles, findNearestSlot, fromRglLayout, type RglItem, type TileLayout } from './layout.ts'

const STORAGE_KEY = 'openloop.dock.board.v1'

export interface PanelTileSource { kind: 'panel'; meta: unknown }
export interface ArtifactTileSource { kind: 'artifact'; meta: unknown }
export type DockTileSource = PanelTileSource | ArtifactTileSource

export interface DockTile {
  tileId: string
  title: string
  source: DockTileSource
  layout: TileLayout
  origin: { sessionId?: string; toolCallId?: string } | null
  createdAt: number
}

export interface DockBoard { version: 1; tiles: DockTile[] }

let seq = 0
const newTileId = (): string => {
  seq += 1
  return `tile-${Date.now().toString(36)}-${seq.toString(36)}`
}

const emptyBoard = (): DockBoard => ({ version: 1, tiles: [] })

function readBoard(): DockBoard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return emptyBoard()
    const parsed = JSON.parse(raw) as DockBoard
    if (parsed?.version !== 1 || !Array.isArray(parsed.tiles)) return emptyBoard()
    // 容错：布局逐个 clamp；非法 tile 剔除
    const tiles = parsed.tiles
      .filter(t => t && typeof t.tileId === 'string' && t.source && t.source.kind)
      .map(t => ({ ...t, layout: clampLayout(t.layout ?? {}) }))
    return { version: 1, tiles }
  } catch {
    return emptyBoard()
  }
}

type Listener = () => void

class DockStore {
  private board: DockBoard = emptyBoard()
  private listeners = new Set<Listener>()
  private initialized = false

  subscribe(listener: Listener): () => void {
    if (!this.initialized && typeof localStorage !== 'undefined') {
      this.board = readBoard()
      this.initialized = true
    }
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot(): DockBoard {
    if (!this.initialized && typeof localStorage !== 'undefined') {
      this.board = readBoard()
      this.initialized = true
    }
    return this.board
  }

  private emit(next: DockBoard, persist = true): void {
    this.board = next
    if (persist && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch { /* 持久化失败不阻断 */ }
    }
    for (const listener of this.listeners) listener()
  }

  pin(source: DockTileSource, title: string, origin: DockTile['origin'] = null, layoutHint?: Partial<TileLayout>): DockTile {
    const current = this.getSnapshot()
    const layout = findNearestSlot(current.tiles, { columns: layoutHint?.columns ?? 6, rows: layoutHint?.rows ?? 4 })
    const tile: DockTile = {
      tileId: newTileId(),
      title,
      source,
      layout: { ...layout, ...(layoutHint?.column !== undefined || layoutHint?.row !== undefined ? clampLayout({ ...layout, ...layoutHint }) : {}) },
      origin,
      createdAt: Date.now(),
    }
    this.emit({ version: 1, tiles: [...current.tiles, tile] })
    return tile
  }

  remove(tileId: string): void {
    const current = this.getSnapshot()
    this.emit({ version: 1, tiles: current.tiles.filter(t => t.tileId !== tileId) })
  }

  move(tileId: string, target: TileLayout): void {
    const current = this.getSnapshot()
    this.emit({
      version: 1,
      tiles: current.tiles.map(t => (t.tileId === tileId ? { ...t, layout: clampLayout(target) } : t)),
    })
  }

  /**
   * RGL onLayoutChange 回写（2026-08-24 v0.3.0）：一次 emit 写回全部 tile 布局
   * （RGL 的 verticalCompactor 会同时移动多个 tile）。未知 tileId 忽略。
   */
  applyLayout(items: ReadonlyArray<RglItem>): void {
    const next = fromRglLayout(items)
    if (next.size === 0) return
    const current = this.getSnapshot()
    let changed = false
    const tiles = current.tiles.map(t => {
      const layout = next.get(t.tileId)
      if (layout === undefined || layout === t.layout) return t
      changed = true
      return { ...t, layout }
    })
    if (changed) this.emit({ version: 1, tiles })
  }

  clear(): void {
    this.emit(emptyBoard())
  }

  /** 「整理」：重力紧凑（消除空洞、保持相对顺序）——无变化时不 emit */
  compact(): void {
    const current = this.getSnapshot()
    if (current.tiles.length === 0) return
    const compacted = compactTiles(current.tiles)
    const changed = compacted.some((t, i) => t.layout !== current.tiles[i]?.layout)
    if (changed) this.emit({ version: 1, tiles: compacted })
  }
}

export const dockStore = new DockStore()
