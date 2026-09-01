/**
 * Dock Board store v2（2026-08-25 Dock 2.0）：多看板 + tile 别名。
 * 手写 useSyncExternalStore 友好 store（无 zustand 依赖——bundle 尺寸考虑）。
 *
 * 持久化（M3 双层）：localStorage 恒为本地副本（v1→v2 迁移也在此完成）；
 * 远端门面（@openloop/dsh-app 的 /openloop/app/boards）为权威存储——经
 * setRemotePersist 挂钩后每次 emit 异步推送（fire-and-forget，失败由挂钩方提示）。
 * 门面不可用时 store 退化为纯 localStorage（降级不炸页，DOCK_V2_FRONTEND_IMPL §7 M3）。
 */
import { clampLayout, compactTiles, findNearestSlot, fromRglLayout, type RglItem, type TileLayout } from './layout.ts'

const STORAGE_KEY = 'openloop.dock.board.v1'

export interface PanelTileSource { kind: 'panel'; meta: unknown }
export interface ArtifactTileSource { kind: 'artifact'; meta: unknown }
/**
 * 方向 1 v2（2026-08-29）：MCP Apps 引用形态 tile——只存 (serverId, toolName,
 * resourceUri) 引用，不复制内容；渲染时经 refresh 端点取数（与对话流卡同通道）。
 */
export interface McpAppTileSource {
  kind: 'mcp-app'
  meta: { serverId: string; toolName: string; resourceUri: string; rid?: string }
}
export type DockTileSource = PanelTileSource | ArtifactTileSource | McpAppTileSource

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
    .map(migrateArtifactTile)
}

/**
 * 0.5.5 命名迁移（2026-09-01）：旧 artifact 内置组件 rid 带 `example-` 前缀，
 * seed 后已改为正式 rid（openloop:system-map / agent-dashboard / usage-report /
 * backend-console）。已 pin 的旧 tile 是快照，rid/path 仍是 example 形态，导致
 * sourceIdOf 退化为旧 path 文件名、与 registry 新 rid 匹配不上（「已固定」徽章
 * 不显示、渲染用旧 HTML）。此处一次性迁移：把旧 rid / 旧 path 归一化为新 rid，
 * 使后续 registry 按 rid 查找命中、渲染取最新 entry。
 */
const LEGACY_ARTIFACT_RIDS: Record<string, string> = {
  'openloop:example-system-map': 'openloop:system-map',
  'openloop:example-agent-dashboard': 'openloop:agent-dashboard',
  'openloop:example-usage-report': 'openloop:usage-report',
  'openloop:example-backend-console': 'openloop:backend-console',
}

function migrateArtifactTile(tile: DockTile): DockTile {
  if (tile.source.kind !== 'artifact') return tile
  const meta = tile.source.meta as { rid?: unknown; path?: unknown }
  // 直接命中旧 rid
  if (typeof meta.rid === 'string' && LEGACY_ARTIFACT_RIDS[meta.rid] !== undefined) {
    return { ...tile, source: { ...tile.source, meta: { ...meta, rid: LEGACY_ARTIFACT_RIDS[meta.rid] } } }
  }
  // 旧 tile 无 rid、path = openloop-examples/example-X.html → 由 path 推导新 rid
  if (typeof meta.path === 'string') {
    const match = meta.path.match(/example-([a-z-]+)\.html/)
    if (match !== null) {
      const newRid = `openloop:${match[1] ?? ''}`
      if (LEGACY_ARTIFACT_RIDS[`openloop:example-${match[1] ?? ''}`] !== undefined) {
        return { ...tile, source: { ...tile.source, meta: { ...meta, rid: newRid } } }
      }
    }
  }
  return tile
}

function persistState(state: DockBoardState): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* 持久化失败不阻断 */ }
}

/** v2 负载校验：v1 负载（单板 tiles）包成 v2（一次性迁移，无兼容层）；坏数据不进 store */
function coerceStateV2(parsed: { version?: unknown; tiles?: unknown; boards?: unknown; activeBoardId?: unknown }): DockBoardState | undefined {
  if (parsed?.version === 2) {
    return sanitizeStateV2(parsed as { boards?: unknown; activeBoardId?: unknown })
  }
  if (parsed?.version === 1 && Array.isArray(parsed.tiles)) {
    // v1 → v2 一次性迁移：包成单板状态（写回由调用方决定）
    return {
      version: 2,
      boards: [{ id: DEFAULT_BOARD_ID, name: DEFAULT_BOARD_NAME, tiles: sanitizeTiles(parsed.tiles) }],
      activeBoardId: DEFAULT_BOARD_ID,
    }
  }
  return undefined
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
    const state = coerceStateV2(parsed)
    if (state === undefined) return emptyState()
    // v1 迁移的写回（key 不变，负载升代）；v2 无需写回
    if (parsed?.version !== 2) persistState(state)
    return state
  } catch {
    return emptyState()
  }
}

type Listener = () => void

export class DockStore {
  private state: DockBoardState = emptyState()
  private listeners = new Set<Listener>()
  private initialized = false
  /** 远端门面写钩子（M3：backend-sync 在门面可用后安装；fire-and-forget） */
  private remotePersist: ((state: DockBoardState) => void) | null = null
  /** 远端钩子安装后抑制一次推送（载入远端数据本身不该回推） */
  private suppressRemoteOnce = false

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
    if (this.remotePersist !== null && !this.suppressRemoteOnce) {
      this.remotePersist(next)
    } else {
      this.suppressRemoteOnce = false
    }
    for (const listener of this.listeners) listener()
  }

  /** M3：安装远端写钩子（门面模式启动后调用；此后每次 emit 推送远端） */
  setRemotePersist(fn: ((state: DockBoardState) => void) | null): void {
    this.remotePersist = fn
  }

  /**
   * M3：载入远端权威数据（sanitize；坏数据不进 store）。
   * 输入契约 = 门面 loadDockState（恒 v2 或 null）——v1 只在 localStorage 读取时迁移，
   * 远端出现 v1/垃圾负载一律拒绝（严格，返回 false 保持本地态）。
   */
  importState(remote: unknown): boolean {
    this.ensureInit()
    const parsed = remote as { version?: unknown; boards?: unknown; activeBoardId?: unknown } | null
    if (typeof parsed !== 'object' || parsed === null || parsed.version !== 2) return false
    // 空 boards = 畸形负载（门面空时返回 null 而非空数组）——拒绝，防清空本地
    if (!Array.isArray(parsed.boards) || parsed.boards.length === 0) return false
    const state = sanitizeStateV2(parsed)
    // 远端载入不回推（PUT 刚拿到的数据无意义）
    this.suppressRemoteOnce = true
    this.emit(state, true)
    return true
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
