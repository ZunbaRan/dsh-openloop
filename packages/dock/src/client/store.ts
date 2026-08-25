/**
 * Dock Board store v2（2026-08-25 Dock 2.0）：多看板 + tile 别名 + localStorage 持久化。
 * 手写 useSyncExternalStore 友好 store（无 zustand 依赖——bundle 尺寸考虑）。
 *
 * v1 → v2 迁移：读到 version:1（单看板）直接包成 boards:[{id:'b-default',...}]
 * 写回 v2，不做双版本兼容层（工程原则：废弃路径直接移除）。
 * STORAGE_KEY 沿用 v1 的 key——迁移在同一 key 原地完成，version 字段区分负载代际。
 */
import { clampLayout, compactTiles, findNearestSlot, fromRglLayout, type RglItem, type TileLayout } from './layout.ts'

const STORAGE_KEY = 'openloop.dock.board.v1'

export interface PanelTileSource { kind: 'panel'; meta: unknown }
export interface ArtifactTileSource { kind: 'artifact'; meta: unknown }
export type DockTileSource = PanelTileSource | ArtifactTileSource

export interface DockTile {
  tileId: string
  title: string
  /** 用户别名；undefined = 用 title（JSON 序列化时自动省略） */
  alias?: string
  source: DockTileSource
  layout: TileLayout
  origin: { sessionId?: string; toolCallId?: string } | null
  createdAt: number
}

export interface DockBoardEntry {
  id: string
  name: string
  tiles: DockTile[]
}

export interface DockBoardState {
  version: 2
  boards: DockBoardEntry[]
  activeBoardId: string
}

let seq = 0
const newTileId = (): string => {
  seq += 1
  return `tile-${Date.now().toString(36)}-${seq.toString(36)}`
}

let boardSeq = 0
const newBoardId = (): string => {
  boardSeq += 1
  return `board-${Date.now().toString(36)}-${boardSeq.toString(36)}`
}

const DEFAULT_BOARD_ID = 'b-default'
const DEFAULT_BOARD_NAME = '默认看板'

const emptyState = (): DockBoardState => ({
  version: 2,
  boards: [{ id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, tiles: [] }],
  activeBoardId: DEFAULT_BOARD_ID,
})

/** 容错：布局逐个 clamp；非法 tile 剔除（错误边界原则——坏数据不进 store） */
function sanitizeTiles(tiles: unknown): DockTile[] {
  if (!Array.isArray(tiles)) return []
  return tiles
    .filter(t => t && typeof t.tileId === 'string' && typeof t.title === 'string' && t.source && t.source.kind)
    .map(t => ({ ...(t as DockTile), layout: clampLayout((t as DockTile).layout ?? {}) }))
}

function persistState(state: DockBoardState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* 持久化失败不阻断 */ }
}

/** v2 负载校验：boards 逐个规整（名称兜底、tile 容错）；activeBoardId 失效回落首板 */
function sanitizeStateV2(parsed: { boards?: unknown; activeBoardId?: unknown }): DockBoardState {
  const rawBoards = Array.isArray(parsed.boards) ? parsed.boards : []
  const boards = rawBoards
    .map(b => {
      const board = b as { id?: unknown; name?: unknown; tiles?: unknown }
      if (!board || typeof board.id !== 'string' || board.id.length === 0) return undefined
      const name = typeof board.name === 'string' && board.name.trim().length > 0 ? board.name : DEFAULT_BOARD_NAME
      return { id: board.id, name, tiles: sanitizeTiles(board.tiles) }
    })
    .filter((b): b is DockBoardEntry => b !== undefined)
  if (boards.length === 0) return emptyState()
  const first = boards[0]
  if (first === undefined) return emptyState()
  const activeBoardId = typeof parsed.activeBoardId === 'string' && boards.some(b => b.id === parsed.activeBoardId)
    ? parsed.activeBoardId
    : first.id
  return { version: 2, boards, activeBoardId }
}

function readState(): DockBoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return emptyState()
    const parsed = JSON.parse(raw) as { version?: unknown; tiles?: unknown; boards?: unknown; activeBoardId?: unknown }
    if (parsed?.version === 2) {
      return sanitizeStateV2(parsed as { boards?: unknown; activeBoardId?: unknown })
    }
    if (parsed?.version === 1 && Array.isArray(parsed.tiles)) {
      // v1 → v2 一次性迁移：包成单板状态并立即写回（key 不变，负载升代）
      const migrated: DockBoardState = {
        version: 2,
        boards: [{ id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, tiles: sanitizeTiles(parsed.tiles) }],
        activeBoardId: DEFAULT_BOARD_ID,
      }
      persistState(migrated)
      return migrated
    }
    return emptyState()
  } catch {
    return emptyState()
  }
}

type Listener = () => void

export class DockStore {
  private state: DockBoardState = emptyState()
  private listeners = new Set<Listener>()
  private initialized = false

  subscribe(listener: Listener): () => void {
    this.ensureInit()
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot(): DockBoardState {
    this.ensureInit()
    return this.state
  }

  private ensureInit(): void {
    if (!this.initialized && typeof localStorage !== 'undefined') {
      this.state = readState()
      this.initialized = true
    }
  }

  private emit(next: DockBoardState, persist = true): void {
    this.state = next
    if (persist) persistState(next)
    for (const listener of this.listeners) listener()
  }

  /** 当前激活板（activeBoardId 失效时回落首板；state 规整后恒有 ≥1 板，undefined 仅理论值） */
  getActiveBoard(): DockBoardEntry | undefined {
    this.ensureInit()
    return this.state.boards.find(b => b.id === this.state.activeBoardId) ?? this.state.boards[0]
  }

  private updateActiveTiles(fn: (tiles: DockTile[]) => DockTile[]): void {
    const board = this.getActiveBoard()
    if (board === undefined) return
    const tiles = fn(board.tiles)
    this.emit({
      ...this.state,
      boards: this.state.boards.map(b => (b.id === board.id ? { ...b, tiles } : b)),
    })
  }

  // ---- 看板页管理 ----

  /** 新增看板页并激活；返回新板 id */
  addBoard(): string {
    this.ensureInit()
    const id = newBoardId()
    const name = this.nextBoardName()
    this.emit({
      ...this.state,
      boards: [...this.state.boards, { id, name, tiles: [] }],
      activeBoardId: id,
    })
    return id
  }

  private nextBoardName(): string {
    for (let n = this.state.boards.length + 1; ; n++) {
      const name = `看板 ${n}`
      if (!this.state.boards.some(b => b.name === name)) return name
    }
  }

  renameBoard(id: string, name: string): void {
    this.ensureInit()
    const trimmed = name.trim()
    if (!trimmed) return
    this.emit({
      ...this.state,
      boards: this.state.boards.map(b => (b.id === id ? { ...b, name: trimmed } : b)),
    })
  }

  /** 删除看板页；末板不可删（UI 在单板时隐藏删除入口）；删的是激活板则回落首板 */
  removeBoard(id: string): void {
    this.ensureInit()
    if (this.state.boards.length <= 1) return
    const boards = this.state.boards.filter(b => b.id !== id)
    if (boards.length === this.state.boards.length) return
    const fallback = boards[0]
    if (fallback === undefined) return
    const activeBoardId = this.state.activeBoardId === id ? fallback.id : this.state.activeBoardId
    this.emit({ ...this.state, boards, activeBoardId })
  }

  setActiveBoard(id: string): void {
    this.ensureInit()
    if (id === this.state.activeBoardId || !this.state.boards.some(b => b.id === id)) return
    this.emit({ ...this.state, activeBoardId: id })
  }

  // ---- tile 操作（全部作用于激活板） ----

  setTileAlias(tileId: string, alias: string | null): void {
    this.updateActiveTiles(tiles => tiles.map(t => {
      if (t.tileId !== tileId) return t
      if (alias === null || alias.length === 0) {
        const { alias: _dropped, ...rest } = t
        return rest
      }
      return { ...t, alias }
    }))
  }

  pin(source: DockTileSource, title: string, origin: DockTile['origin'] = null, layoutHint?: Partial<TileLayout>): DockTile {
    const board = this.getActiveBoard()
    const layout = findNearestSlot(board?.tiles ?? [], { columns: layoutHint?.columns ?? 6, rows: layoutHint?.rows ?? 4 })
    const tile: DockTile = {
      tileId: newTileId(),
      title,
      source,
      layout: { ...layout, ...(layoutHint?.column !== undefined || layoutHint?.row !== undefined ? clampLayout({ ...layout, ...layoutHint }) : {}) },
      origin,
      createdAt: Date.now(),
    }
    this.updateActiveTiles(tiles => [...tiles, tile])
    return tile
  }

  remove(tileId: string): void {
    this.updateActiveTiles(tiles => tiles.filter(t => t.tileId !== tileId))
  }

  move(tileId: string, target: TileLayout): void {
    this.updateActiveTiles(tiles => tiles.map(t => (t.tileId === tileId ? { ...t, layout: clampLayout(target) } : t)))
  }

  /**
   * RGL onLayoutChange 回写（2026-08-24 v0.3.0）：一次 emit 写回全部 tile 布局
   * （RGL 的 verticalCompactor 会同时移动多个 tile）。未知 tileId 忽略。
   */
  applyLayout(items: ReadonlyArray<RglItem>): void {
    const next = fromRglLayout(items)
    if (next.size === 0) return
    const board = this.getActiveBoard()
    if (board === undefined) return
    let changed = false
    const tiles = board.tiles.map(t => {
      const layout = next.get(t.tileId)
      if (layout === undefined || layout === t.layout) return t
      changed = true
      return { ...t, layout }
    })
    if (changed) {
      this.emit({
        ...this.state,
        boards: this.state.boards.map(b => (b.id === board.id ? { ...b, tiles } : b)),
      })
    }
  }

  /** 清空激活板的全部 tile */
  clear(): void {
    const board = this.getActiveBoard()
    if (board === undefined || board.tiles.length === 0) return
    this.emit({
      ...this.state,
      boards: this.state.boards.map(b => (b.id === board.id ? { ...b, tiles: [] } : b)),
    })
  }

  /** 「整理」：重力紧凑（消除空洞、保持相对顺序）——无变化时不 emit */
  compact(): void {
    const board = this.getActiveBoard()
    if (board === undefined || board.tiles.length === 0) return
    const compacted = compactTiles(board.tiles)
    const changed = compacted.some((t, i) => t.layout !== board.tiles[i]?.layout)
    if (changed) {
      this.emit({
        ...this.state,
        boards: this.state.boards.map(b => (b.id === board.id ? { ...b, tiles: compacted } : b)),
      })
    }
  }
}

export const dockStore = new DockStore()
