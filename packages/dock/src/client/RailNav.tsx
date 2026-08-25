/**
 * RailNav：Dock 2.0 左侧导航轨（两态一轨，原型 direction-a.jsx 直搬 + TS 化）。
 *
 * - 图标态 52px：看板 tab + 每个看板页 mini icon（页名首字）→ 分隔线 → APP tab + APP mini icon
 * - 中枢态 216px（拖宽 ≥100px 进入，松手吸附 52/216）：「工作台 + ⊕」看板页行
 *   （双击重命名、悬停 × 删除）+「APP」分组行
 * - 右缘 8px 拖拽把手：实时改宽（父层只写 state）；松手吸附后经 onWidthCommit 持久化；
 *   双击把手 52↔216 快捷切换
 * - 导航收口原则（DOCK_V2_FRONTEND_IMPL §1.4）：看板页与 APP 同级，主区无页签条
 */
import { useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { icons } from './icons.tsx'
import { AppIcon, type AppKind } from './badges.tsx'
import { dragResize } from './drag-resize.ts'
import type { DockBoardEntry } from './store.ts'

export type DockTab = 'board' | 'apps'

/** rail 行所需的最小 APP 视图模型（M2 由 app-registry 派生；M1 传空数组占位） */
export interface RailAppItem {
  id: string
  name: string
  kind: AppKind
  /** API 健康态：任一 API warn 则整行 warn */
  apiTone: 'ok' | 'warn'
  /** tooltip 摘要（如「N 组件 · N API」） */
  hint: string
}

export const RAIL_ICON_WIDTH = 52
export const RAIL_HUB_WIDTH = 216
/** 拖宽 ≥ 此值进入中枢态（仅运行时判定；松手仍吸附 52/216） */
const RAIL_EXPAND_THRESHOLD = 100
const RAIL_DRAG_MAX = 260

export interface RailNavProps {
  tab: DockTab
  onTabChange: (tab: DockTab) => void
  apps: RailAppItem[]
  selectedAppId: string | null
  onOpenApp: (id: string) => void
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
  const { tab, onTabChange, apps, selectedAppId, onOpenApp, boards, activeBoardId } = props
  const { onSelectBoard, onAddBoard, onRenameBoard, onRemoveBoard } = props
  const { width, onWidthChange, onWidthCommit } = props
  const expanded = width >= RAIL_EXPAND_THRESHOLD
  const [dragging, setDragging] = useState(false)
  const [editingBoard, setEditingBoard] = useState<string | null>(null)

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
            <button type="button" className="d2-sec-add" title="新增看板页" onClick={onAddBoard}><icons.plus size={11} /></button>
          </div>
          {boards.map(b => (
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
                className={`d2-rail-row${tab === 'board' && b.id === activeBoardId ? ' on' : ''}`}
                onClick={() => openBoard(b.id)}
                onDoubleClick={() => setEditingBoard(b.id)}
                title="双击重命名"
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
          ))}
          <div className="d2-rail-sec">APP</div>
          <div className="d2-rail-apps">
            {apps.map(a => (
              <button
                type="button"
                key={a.id}
                className={`d2-rail-app${tab === 'apps' && a.id === selectedAppId ? ' on' : ''}`}
                onClick={() => onOpenApp(a.id)}
                title={a.hint}
              >
                <AppIcon app={a} size={22} />
                <span className="d2-lbl">{a.name}</span>
                <span className={`d2-dot ${a.apiTone}`} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button type="button" className={`d2-rail-tab${tab === 'board' ? ' on' : ''}`} title="看板" onClick={() => onTabChange('board')}>
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
          <div className="d2-rail-sep" />
          <button type="button" className={`d2-rail-tab${tab === 'apps' ? ' on' : ''}`} title="APP" onClick={() => onTabChange('apps')}>
            <icons.apps size={17} />
          </button>
          {apps.map(a => (
            <button
              type="button"
              key={a.id}
              className={`d2-rail-mini${tab === 'apps' && a.id === selectedAppId ? ' on' : ''}`}
              title={a.name}
              onClick={() => onOpenApp(a.id)}
            >
              <AppIcon app={a} size={16} />
            </button>
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
