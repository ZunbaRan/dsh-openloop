/**
 * DockBoardView：看板视图（Dock 2.0，RGL v2 引擎保留不变）。
 *
 * v2 变更（2026-08-25，原型 direction-a.jsx 看板段直搬）：
 * - 头部：当前页名（双击重命名）+ tile 计数 + 整理/清空/收起（收起经 onCollapse 上抛）
 * - tile 外壳：别名内联编辑（Enter/失焦提交、Esc 取消、置空恢复原名、✎ 标记）
 *   + 右下角来源 ID（包名:组件名，命名即寻址）
 * - 空态：引导去 APP 页固定 / 让 Agent 生成
 * - 数据流不变：dockStore（v2 多板）→ 激活板 tiles ↔ RGL 双向映射
 */
import { Component, useEffect, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import { GRID_COLUMNS, STORAGE_MAX_COLUMNS, toRglLayout } from './layout.ts'
import { dockStore, type DockTile, type DockTileSource } from './store.ts'
import { icons } from './icons.tsx'

// 跨插件 client 组件懒桥（DSH ModuleLoader external：评估期 require 在插件
// 被禁用时炸 loader——懒 require 后 tile 按需取，缺失渲染降级条）
import { getBaseClient, DependencyMissing } from './base-bridge.tsx'
import { getPanelsClient, getArtifactClient, getMcpAppsClient } from './openloop-clients.ts'

/** scope 惰性单例（base 缺失时 undefined——ArtifactFrame 外壳自行降级） */
let scopeCache: ReturnType<NonNullable<ReturnType<typeof getBaseClient>>['createOpenLoopSettingsScope']> | undefined
function getScope() {
  if (scopeCache === undefined) scopeCache = getBaseClient()?.createOpenLoopSettingsScope()
  return scopeCache
}

const ROW_HEIGHT = 48
const GRID_MARGIN: readonly [number, number] = [12, 12]

/**
 * 0.9.1（用户拍板 A）：RGL 渲染列数与存储上限同源（视口/60px 格宽）——拖多大
 * 松手稳定多大；GRID_COLUMNS 保留为 pin 落位与紧凑的参考网格。maxRows 不再
 * 硬限（行高自由，容器滚动）。
 */
const RGL_COLS = (): number => STORAGE_MAX_COLUMNS()

/**
 * RGL 运行必需 CSS + dock 主题化覆写（注入一次）。
 * 必需部分等价于官方 styles.css 的核心规则（容器 transition / item 定位过渡 /
 * placeholder / resize 手柄）；主题化部分：placeholder 虚线框、手柄隐藏至 hover、
 * 拖拽中 tile 抬升阴影——对齐 DSH 设置壳的设计语言（hairline、克制的层次）。
 */
const GRID_CSS = `
.react-grid-layout { position: relative; transition: height 200ms ease; }
.react-grid-item { box-sizing: border-box; transition: all 200ms ease; transition-property: left, top, width, height; }
.react-grid-item img { pointer-events: none; user-select: none; }
.react-grid-item.cssTransforms { transition-property: transform, width, height; }
.react-grid-item.resizing { transition: none; z-index: 3; will-change: width, height; }
.react-grid-item.react-draggable-dragging { transition: none; z-index: 3; will-change: transform; }
.react-grid-item.dropping { visibility: hidden; }
.react-grid-item.react-grid-placeholder {
  background: var(--dsw-alias-state-business-primary, rgba(88, 101, 242, 0.35));
  opacity: 0.14;
  border: 1.5px dashed var(--dsw-alias-state-business-primary, rgba(88, 101, 242, 0.55));
  border-radius: 10px;
  transition-duration: 100ms;
  z-index: 2;
  user-select: none;
}
.react-grid-item.react-grid-placeholder.placeholder-resizing { transition: none; }
.react-grid-item > .react-resizable-handle { position: absolute; width: 18px; height: 18px; opacity: 0; transition: opacity .15s ease; }
.react-grid-item:hover > .react-resizable-handle { opacity: 1; }
.react-grid-item > .react-resizable-handle::after {
  content: ""; position: absolute; right: 4px; bottom: 4px; width: 5px; height: 5px;
  border-right: 2px solid var(--dsw-alias-label-caption, rgba(128, 128, 128, 0.7));
  border-bottom: 2px solid var(--dsw-alias-label-caption, rgba(128, 128, 128, 0.7));
}
.react-grid-item > .react-resizable-handle.react-resizable-handle-se { bottom: 0; right: 0; cursor: se-resize; }
.react-grid-item > .react-resizable-handle.react-resizable-handle-e { top: 50%; margin-top: -9px; right: 0; cursor: ew-resize; }
.react-grid-item > .react-resizable-handle.react-resizable-handle-s { left: 50%; margin-left: -9px; bottom: 0; cursor: ns-resize; }
/* dock tile 抬升感：拖拽/缩放中的 tile 略微上浮（阴影在 chrome 上，避免双 border 视觉） */
.react-grid-item.react-draggable-dragging > .dock-tile-chrome,
.react-grid-item.resizing > .dock-tile-chrome {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}
.dock-tile-handle { cursor: grab; }
.dock-tile-handle:active { cursor: grabbing; }
`

function GridStyles(): null {
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-openloop-dock-grid', '')
    el.textContent = GRID_CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, [])
  return null
}

/** 来源 ID（包名:组件名）：panel meta.panel.id / artifact meta.path 文件名；拿不到则不显示。
 *  APP tab 的 pinned 判定也走这里（AppDetail 的组件资源 ID 与之同命名空间）。 */
export function sourceIdOf(source: DockTileSource): string | null {
  if (source.kind === 'panel') {
    const panel = (source.meta as { panel?: { id?: unknown } } | null)?.panel
    return typeof panel?.id === 'string' && panel.id.length > 0 ? `openloop:${panel.id}` : null
  }
  if (source.kind === 'mcp-app') {
    if (source.meta.rid !== undefined && source.meta.rid.length > 0) return source.meta.rid
    return `${source.meta.serverId}:${source.meta.toolName.toLowerCase().replace(/[^a-z0-9-]+/g, '-')}`
  }
  // artifact：meta.rid 优先（与 col2 资源列表 c.id 同命名空间）；无 rid 时退化到 path 文件名
  const meta = source.meta as { rid?: unknown; path?: unknown } | null
  if (typeof meta?.rid === 'string' && meta.rid.length > 0) return meta.rid
  const path = meta?.path
  if (typeof path !== 'string' || path.length === 0) return null
  const base = path.split('/').pop() ?? path
  return base.length > 0 ? `openloop:${base}` : null
}

function TileChrome({ tile, onRemove, onAlias, children }: { tile: DockTile; onRemove: () => void; onAlias: (alias: string | null) => void; children: ReactNode }): ReactNode {
  const [editing, setEditing] = useState(false)
  const displayTitle = tile.alias ?? tile.title
  const sourceId = sourceIdOf(tile.source)
  const commit = (value: string): void => {
    const trimmed = value.trim()
    // 置空或与原名相同 → 清除别名（恢复原名）
    onAlias(!trimmed || trimmed === tile.title ? null : trimmed)
    setEditing(false)
  }
  const onEditKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') commit(e.currentTarget.value)
    if (e.key === 'Escape') setEditing(false)
  }
  return (
    <div
      className="dock-tile-chrome"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        overflow: 'hidden',
      }}
    >
      <div
        className="dock-tile-handle"
        title="拖动排列"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '5px 6px 5px 10px', flexShrink: 0,
          borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))',
          fontSize: 11.5, fontWeight: 600, letterSpacing: 0.2,
          color: 'var(--dsw-alias-label-primary, inherit)',
          userSelect: 'none',
        }}
      >
        {editing ? (
          <input
            className="d2-title-edit"
            defaultValue={displayTitle}
            autoFocus
            aria-label="编辑别名"
            onBlur={e => commit(e.target.value)}
            onKeyDown={onEditKeyDown}
          />
        ) : (
          <span
            className="d2-tile-title"
            style={{ flex: 1 }}
            title={`双击编辑别名（原名：${tile.title}）`}
            onDoubleClick={() => setEditing(true)}
          >
            {displayTitle}
            {tile.alias ? <span className="d2-alias-mark" title={`原名：${tile.title}`}>✎</span> : null}
          </span>
        )}
        <button
          type="button"
          className="dock-tile-cancel"
          onClick={onRemove}
          aria-label="unpin"
          title="取消固定"
          style={{
            border: 0, background: 'transparent', cursor: 'pointer', flexShrink: 0,
            fontSize: 12, lineHeight: 1, padding: '3px 6px', borderRadius: 6,
            color: 'var(--dsw-alias-label-caption, #888)',
          }}
        >✕</button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', padding: 10 }}>{children}</div>
      {sourceId ? <span className="d2-tile-src" style={{ right: 26 }}>{sourceId}</span> : null}
    </div>
  )
}

/**
 * tile 级错误边界（2026-08-24 真机事故）：单个 tile 内容渲染崩溃（如持久化的
 * 损坏 meta、上游面板/artifact 组件抛错）不再炸掉整个 dock React 树——
 * 降级为该 tile 内的错误卡，用户可单独 unpin。
 */
class TileErrorBoundary extends Component<{ tileId: string; children: ReactNode }, { failed: boolean }> {
  constructor(props: { tileId: string; children: ReactNode }) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: unknown): void {
    console.warn(`[openloop-dock] tile ${this.props.tileId} render failed:`, error)
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <div style={{ padding: 14, fontSize: 12, lineHeight: 1.7, opacity: 0.7 }}>
          此 tile 渲染失败（内容数据可能已损坏）——<br />可点右上角 ✕ 移除后重新固定
        </div>
      )
    }
    return this.props.children
  }
}

function TileContent({ tile }: { tile: DockTile }) {
  if (tile.source.kind === 'panel') {
    const panels = getPanelsClient()
    if (panels === undefined) {
      return <DependencyMissing what="Dock 面板 tile" dep="@openloop/dsh-panels" />
    }
    const PanelSurface = panels.PanelSurface
    return <PanelSurface meta={tile.source.meta as never} />
  }
  if (tile.source.kind === 'mcp-app') {
    // 方向 1 v2：引用形态 tile——渲染时经 refresh 端点取数（与对话流卡同沙箱同通道）
    const mcpApps = getMcpAppsClient()
    if (mcpApps === undefined) {
      return <DependencyMissing what="Dock MCP App tile" dep="@openloop/dsh-mcp" />
    }
    const McpAppResourceView = mcpApps.McpAppResourceView
    const meta = tile.source.meta
    return <McpAppResourceView serverId={meta.serverId} toolName={meta.toolName} resourceUri={meta.resourceUri} title={tile.title} frameId={`dock-${tile.tileId}`} />
  }
  const artifact = getArtifactClient()
  if (artifact === undefined) {
    return <DependencyMissing what="Dock Artifact tile" dep="@openloop/dsh-html-artifact" />
  }
  const ArtifactFrame = artifact.ArtifactFrame
  return <ArtifactFrame meta={tile.source.meta as never} token={`dock-${tile.tileId}`} fullscreen={false} scope={getScope()} />
}

export function DockBoardView(): ReactNode {
  const { width, containerRef, mounted } = useContainerWidth()
  // 每渲染读最新 snapshot（外层 DockShell 的 store 订阅驱动重渲染）
  const state = dockStore.getSnapshot()
  const board = state.boards.find(b => b.id === state.activeBoardId) ?? state.boards[0]
  const tiles = board?.tiles ?? []
  const layout = toRglLayout(tiles)

  const [editingName, setEditingName] = useState(false)
  const [confirmingClear, setConfirmingClear] = useState(false)
  // 两步确认 3 秒未确认自动复位（替代原生 confirm 弹窗）
  useEffect(() => {
    if (!confirmingClear) return
    const timer = setTimeout(() => setConfirmingClear(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmingClear])

  const commitName = (value: string): void => {
    const trimmed = value.trim()
    if (trimmed && board !== undefined) dockStore.renameBoard(board.id, trimmed)
    setEditingName(false)
  }
  const onNameKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') commitName(e.currentTarget.value)
    if (e.key === 'Escape') setEditingName(false)
  }

  return (
    <section style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }} data-screen-label="board">
      <header className="d2-board-head">
        {board === undefined ? null : editingName ? (
          <input
            className="d2-board-rename"
            autoFocus
            defaultValue={board.name}
            size={Math.max(4, board.name.length + 2)}
            aria-label="重命名看板页"
            onBlur={e => commitName(e.target.value)}
            onKeyDown={onNameKeyDown}
          />
        ) : (
          <span className="d2-board-name" title="双击重命名看板页" onDoubleClick={() => setEditingName(true)}>{board.name}</span>
        )}
        <span className="d2-badge kind">{tiles.length} tiles</span>
        <div className="d2-actions">
          <button type="button" className="d2-ghost-btn" title="重力紧凑：消除空洞，保持相对顺序" onClick={() => dockStore.compact()}>
            <icons.sort size={13} /> 整理
          </button>
          <button
            type="button"
            className={confirmingClear ? 'd2-ghost-btn danger' : 'd2-ghost-btn'}
            title={confirmingClear ? '再次点击确认清空当前页 tile' : '清空当前页 tile（其他看板页不受影响）'}
            onClick={() => {
              if (confirmingClear) {
                dockStore.clear()
                setConfirmingClear(false)
              } else {
                setConfirmingClear(true)
              }
            }}
          >
            <icons.trash size={13} /> {confirmingClear ? '确认清空？' : '清空'}
          </button>
        </div>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tiles.length === 0 ? (
          <div className="d2-empty-note" style={{ paddingTop: 60 }}>
            <div style={{ fontSize: 22, opacity: 0.6 }}>📌</div>
            <div>这一页还是空的</div>
            <div className="d2-tcap">到 APP 页把组件「固定」到看板，或让 Agent 帮你生成</div>
          </div>
        ) : (
          <div ref={containerRef as RefObject<HTMLDivElement>} style={{ minHeight: 104 }}>
            <GridStyles />
            {mounted && width > 0
              ? (
                  <GridLayout
                    width={width}
                    layout={layout}
                    gridConfig={{ cols: RGL_COLS(), rowHeight: ROW_HEIGHT, margin: GRID_MARGIN }}
                    dragConfig={{ enabled: true, handle: '.dock-tile-handle', cancel: '.dock-tile-cancel, .d2-title-edit' }}
                    resizeConfig={{ enabled: true, handles: ['se', 'e', 's'] }}
                    onLayoutChange={items => dockStore.applyLayout(items)}
                  >
                    {tiles.map(tile => (
                      <div key={tile.tileId}>
                        <TileChrome
                          tile={tile}
                          onRemove={() => dockStore.remove(tile.tileId)}
                          onAlias={alias => dockStore.setTileAlias(tile.tileId, alias)}
                        >
                          <TileErrorBoundary tileId={tile.tileId}>
                            <TileContent tile={tile} />
                          </TileErrorBoundary>
                        </TileChrome>
                      </div>
                    ))}
                  </GridLayout>
                )
              : null}
          </div>
        )}
      </div>
    </section>
  )
}
