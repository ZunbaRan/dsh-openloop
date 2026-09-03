/**
 * RailNav：Dock 左侧导航轨（两态一轨，只管看板页；0.8.0 起 APP 分区移除——
 * APP 导航收敛到顶栏 tab + APP tab 的 col1 富状态列表，消灭两列重合）。
 *
 * - 图标态 52px：看板 tab + 每个看板页 mini icon（页名首字）
 * - 中枢态 216px（拖宽 ≥100px 进入，松手吸附 52/216）：「工作台 + ⊕」看板页行
 *   （双击重命名、悬停 × 删除）
 * - 右缘 8px 拖拽把手：实时改宽（父层只写 state）；松手吸附后经 onWidthCommit 持久化；
 *   双击把手 52↔216 快捷切换
 * - tab 切换（看板 ↔ APP）由顶栏段控负责（DockShell），rail 不再承载
 */
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { applySortOrder, cycleSortMode, readSortMode, SortableRows, SortButton, writeSortMode, type SortMode } from './sort.tsx'

const BOARDS_SORT_KEY = 'openloop.dock.boards-sort.v1'
import { dockStore } from './store.ts'
import { icons } from './icons.tsx'
import { dragResize } from './drag-resize.ts'
import type { DockBoardEntry } from './store.ts'

export type DockTab = 'board' | 'apps'

export const RAIL_ICON_WIDTH = 52
export const RAIL_HUB_WIDTH = 216
/** 拖宽 ≥ 此值进入中枢态（仅运行时判定；松手仍吸附 52/216） */
const RAIL_EXPAND_THRESHOLD = 100
const RAIL_DRAG_MAX = 260

export interface RailNavProps {
  tab: DockTab
  onTabChange: (tab: DockTab) => void
  boards: DockBoardEntry[]
  activeBoardId: string
  onSelectBoard: (id: string) => void
  onAddBoard: () => void
  onRenameBoard: (id: string, name: string) => void
  onRemoveBoard: (id: string) => void
  /** rail 宽度（52 / 216 吸附值，拖动中可为中间值） */
  width: number
  /** 拖动中实时回调（只写 state，不持久化） */
  onWidthChange: (width: number) => void
  /** 松手吸附后的最终宽度（持久化时机） */
  onWidthCommit: (width: number) => void
}

export function RailNav(props: RailNavProps): ReactNode {
  const { tab, onTabChange, boards, activeBoardId } = props
  const { onSelectBoard, onAddBoard, onRenameBoard, onRemoveBoard } = props
  const { width, onWidthChange, onWidthCommit } = props
  const expanded = width >= RAIL_EXPAND_THRESHOLD
  const [dragging, setDragging] = useState(false)
  const [editingBoard, setEditingBoard] = useState<string | null>(null)
  // 拖拽排序（2026-09-04 dnd-kit）：看板页顺序 = dockStore 的 boards 顺序（custom 即存储序）；
  // az/za 仅影响展示。拖动松手即切回 custom。
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode(BOARDS_SORT_KEY))
  const sortedBoards = applySortOrder(boards, sortMode, [], b => b.id, b => b.name)
  const cycleMode = (): void => {
    const next = cycleSortMode(sortMode)
    setSortMode(next)
    writeSortMode(BOARDS_SORT_KEY, next)
  }
  const onReorder = (ids: string[]): void => {
    dockStore.reorderBoards(ids)
    if (sortMode !== 'custom') { setSortMode('custom'); writeSortMode(BOARDS_SORT_KEY, 'custom') }
  }

  const openBoard = (id: string): void => {
    onSelectBoard(id)
    onTabChange('board')
  }

  const commitRename = (id: string, value: string): void => {
    const trimmed = value.trim()
    if (trimmed) onRenameBoard(id, trimmed)
    setEditingBoard(null)
  }

  const onRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string): void => {
    if (e.key === 'Enter') commitRename(id, e.currentTarget.value)
    if (e.key === 'Escape') setEditingBoard(null)
  }

  const onHandleDown = (e: PointerEvent<HTMLDivElement>): void => {
    setDragging(true)
    dragResize(e, width, RAIL_ICON_WIDTH, RAIL_DRAG_MAX, onWidthChange, w => {
      setDragging(false)
      onWidthCommit(w < RAIL_EXPAND_THRESHOLD ? RAIL_ICON_WIDTH : RAIL_HUB_WIDTH)
    })
  }

  return (
    <nav className={`d2-rail${expanded ? ' d2-expanded' : ''}${dragging ? ' d2-dragging' : ''}`} style={{ width }} aria-label="Dock 导航">
      {expanded ? (
        <>
          <div className="d2-rail-sec">
            工作台
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              <SortButton mode={sortMode} onCycle={cycleMode} />
              <button type="button" className="d2-sec-add" title="新增看板页" onClick={onAddBoard}><icons.plus size={11} /></button>
            </span>
          </div>
          <SortableRows items={sortedBoards} keyOf={b => b.id} onReorder={onReorder}>
            {(b, rowProps) => (
              editingBoard === b.id ? (
                <input
                  key={b.id}
                  className="d2-board-rename d2-rail-rename"
                  autoFocus
                  defaultValue={b.name}
                  size={Math.max(4, b.name.length + 2)}
                  aria-label="重命名看板页"
                  onBlur={e => commitRename(b.id, e.target.value)}
                  onKeyDown={e => onRenameKeyDown(e, b.id)}
                />
              ) : (
                <button
                  type="button"
                  key={b.id}
                  ref={rowProps.setNodeRef}
                  {...rowProps.attributes}
                  {...rowProps.listeners}
                  style={rowProps.style}
                  className={`d2-rail-row${tab === 'board' && b.id === activeBoardId ? ' on' : ''}`}
                  onClick={() => openBoard(b.id)}
                  onDoubleClick={() => setEditingBoard(b.id)}
                  title="双击重命名；按住上下拖动调整顺序"
                >
                  <icons.board size={14} />
                  <span className="d2-lbl">{b.name}</span>
                  <span className="d2-cnt">{b.tiles.length}</span>
                  {boards.length > 1 ? (
                    <span
                      role="button"
                      aria-label={`删除 ${b.name}`}
                      title="删除此页"
                      onClick={e => { e.stopPropagation(); onRemoveBoard(b.id) }}
                    ><icons.x size={9} /></span>
                  ) : null}
                </button>
              )
            )}
          </SortableRows>
        </>
      ) : (
        <>
          <button type="button" className={`d2-rail-tab${tab === 'board' ? ' on' : ''}`} title="看板" onClick={() => openBoard(activeBoardId)}>
            <icons.board size={17} />
          </button>
          {boards.map(b => (
            <button
              type="button"
              key={b.id}
              className={`d2-rail-mini${tab === 'board' && b.id === activeBoardId ? ' on' : ''}`}
              title={b.name}
              onClick={() => openBoard(b.id)}
            >{b.name.slice(0, 1)}</button>
          ))}
        </>
      )}
      <div
        className="d2-resize-h"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整导航轨宽度"
        title="拖动调宽（≥100px 变中枢态，双击快捷切换）"
        onPointerDown={onHandleDown}
        onDoubleClick={() => onWidthCommit(expanded ? RAIL_ICON_WIDTH : RAIL_HUB_WIDTH)}
      />
    </nav>
  )
}
