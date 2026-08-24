/**
 * DockBoardView：12 列网格画板（OCIX workbench 复刻）。
 * - dnd-kit 拖放：drop 时按指针换算网格坐标，碰撞则 swap、空位则 move
 * - 拖角 resize（右下角手柄，按格步进）
 * - tile 渲染：panel → PanelCard（external panels/client）；artifact → ArtifactFrame（external artifact/client）
 */
import { useCallback, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, closestCenter,
  useDraggable, useSensor, useSensors, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { GRID_COLUMNS, clampLayout, collisionAt, gridHeight, swapLayouts, type TileLayout } from './layout.ts'
import { dockStore, type DockTile } from './store.ts'

// 跨插件 client 组件懒桥（DSH ModuleLoader external：评估期 require 在插件
// 被禁用时炸 loader——懒 require 后 tile 按需取，缺失渲染降级条）
import { getBaseClient, DependencyMissing } from './base-bridge.tsx'
import { getPanelsClient, getArtifactClient } from './openloop-clients.ts'

/** scope 惰性单例（base 缺失时 undefined——ArtifactFrame 外壳自行降级） */
let scopeCache: ReturnType<NonNullable<ReturnType<typeof getBaseClient>>['createOpenLoopSettingsScope']> | undefined
function getScope() {
  if (scopeCache === undefined) scopeCache = getBaseClient()?.createOpenLoopSettingsScope()
  return scopeCache
}

const CELL_MIN_PX = 22 // 单元格最小视觉高度（行高）；列宽由容器 12 等分

function TileChrome({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', borderRadius: 12, border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))', background: 'var(--dsw-alias-bg-layer-1, #fff)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.06))', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <button type="button" onClick={onRemove} aria-label="unpin" style={{ border: 0, background: 'transparent', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '2px 4px' }}>✕</button>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'auto', padding: 8 }}>{children}</div>
    </div>
  )
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
  const artifact = getArtifactClient()
  if (artifact === undefined) {
    return <DependencyMissing what="Dock Artifact tile" dep="@openloop/dsh-html-artifact" />
  }
  const ArtifactFrame = artifact.ArtifactFrame
  return <ArtifactFrame meta={tile.source.meta as never} token={`dock-${tile.tileId}`} fullscreen={false} scope={getScope()} />
}

function GridTile({ tile, cellH, onRemove }: { tile: DockTile; cellH: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tile.tileId })
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [resizing, setResizing] = useState(false)

  // resize 手柄（右下角）：按格步进调 columns/rows
  const startResize = useCallback((event: React.PointerEvent) => {
    event.stopPropagation()
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    const start = { ...tile.layout }
    const colW = (boardRef.current?.parentElement?.clientWidth ?? 300) / GRID_COLUMNS
    const move = (e: PointerEvent) => {
      const dCols = Math.round((e.clientX - startX) / colW)
      const dRows = Math.round((e.clientY - startY) / cellH)
      dockStore.move(tile.tileId, clampLayout({ ...start, columns: start.columns + dCols, rows: start.rows + dRows }))
    }
    const up = () => {
      setResizing(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    setResizing(true)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }, [tile.tileId, tile.layout, cellH])

  const style: CSSProperties = {
    position: 'absolute',
    left: `${(tile.layout.column / GRID_COLUMNS) * 100}%`,
    width: `${(tile.layout.columns / GRID_COLUMNS) * 100}%`,
    top: tile.layout.row * cellH,
    height: tile.layout.rows * cellH,
    padding: 4,
    boxSizing: 'border-box',
    opacity: isDragging || resizing ? 0.4 : 1,
  }
  return (
    <div ref={(node) => { setNodeRef(node); boardRef.current = node }} style={style} {...attributes} {...listeners}>
      <TileChrome title={tile.title} onRemove={onRemove}>
        <TileContent tile={tile} />
      </TileChrome>
      <div
        onPointerDown={startResize}
        title="拖动调整大小"
        style={{ position: 'absolute', right: 2, bottom: 2, width: 14, height: 14, cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, var(--dsw-alias-border-l2, rgba(0,0,0,.25)) 50%)', borderRadius: 3, zIndex: 2 }}
      />
    </div>
  )
}

export function DockBoardView({ onEmpty }: { onEmpty?: () => void }): ReactNode {
  const [cellH, setCellH] = useState(52)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState<DockTile | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
  )
  const tiles = useMemo(() => dockStore.getSnapshot().tiles, [dragging]) // 简化：随交互刷新（store listener 由外层驱动重渲染）

  const onDragStart = (event: DragStartEvent) => {
    setDragging(tiles.find(t => t.tileId === event.active.id) ?? null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    setDragging(null)
    const dragId = String(event.active.id)
    const overId = event.over?.id !== undefined ? String(event.over.id) : null
    const board = boardRef.current
    if (!board) return
    if (overId && overId !== dragId) {
      // 拖到别的 tile 上：swap（OCIX 行为）
      const current = dockStore.getSnapshot().tiles
      const swapped = swapLayouts(current, dragId, overId)
      for (const t of swapped) {
        const before = current.find(x => x.tileId === t.tileId)
        if (before && before.layout !== t.layout) dockStore.move(t.tileId, t.layout)
      }
      dockStore.compact()
      return
    }
    // 自由放置：按指针位置换算目标网格
    const pointer = event.activatorEvent instanceof PointerEvent ? event.activatorEvent : null
    const px = pointer?.clientX ?? 0
    const py = pointer?.clientY ?? 0
    const rect = board.getBoundingClientRect()
    const colW = rect.width / GRID_COLUMNS
    const tile = tiles.find(t => t.tileId === dragId)
    if (!tile || colW <= 0) return
    const target: TileLayout = clampLayout({
      ...tile.layout,
      column: Math.floor((px - rect.left) / colW - tile.layout.columns / 2),
      row: Math.max(0, Math.round((py - rect.top) / cellH - tile.layout.rows / 2)),
    })
    const hit = collisionAt(dockStore.getSnapshot().tiles, dragId, target)
    if (hit) {
      const current = dockStore.getSnapshot().tiles
      const swapped = swapLayouts(current, dragId, hit.tileId)
      for (const t of swapped) {
        const before = current.find(x => x.tileId === t.tileId)
        if (before && before.layout !== t.layout) dockStore.move(t.tileId, t.layout)
      }
    } else {
      dockStore.move(dragId, target)
    }
    dockStore.compact()
  }

  const height = Math.max(gridHeight(tiles) * cellH, cellH * 2)

  if (tiles.length === 0) {
    return (
      <div style={{ padding: 24, color: 'var(--dsw-alias-label-caption, #888)', fontSize: 13, textAlign: 'center' }}>
        空画板——在面板 / HTML artifact 卡片上点 📌 固定到这里
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div ref={boardRef} style={{ position: 'relative', height, minHeight: 104 }}>
        {tiles.map(tile => (
          <GridTile key={tile.tileId} tile={tile} cellH={cellH} onRemove={() => { dockStore.remove(tile.tileId); if (dockStore.getSnapshot().tiles.length === 0) onEmpty?.() }} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <div style={{ width: 240, opacity: 0.85 }}>
            <TileChrome title={dragging.title} onRemove={() => {}}>
              <TileContent tile={dragging} />
            </TileChrome>
          </div>
        ) : null}
      </DragOverlay>
      <button type="button" hidden onClick={() => setCellH(cellH)} />
    </DndContext>
  )
}
