/**
 * 快照悬浮窗层（2026-09-04 快照特性 v1；交互原型 designs/snapshot-proto 四决策用户已批）：
 * - 快照 = 冻结 TileSource（panel meta 含 resolved 数据 / artifact meta 含 html），
 *   内容按冻结 meta 渲染——故意不经 resolveArtifactMeta 取 registry 最新（与 tile 不同）
 * - 纯回看：panel 渲染带 relReadonly（不派发联动事件）；窗口壳只有 拖拽/拉伸/提前/关闭
 * - 新窗右上角堆叠，旧窗向左下级联露边；点击提前——未拖过的窗随堆栈重排位，
 *   拖过的窗位置不变仅 z 提升（标准窗口管理器行为）
 * - 会话级状态，不持久化（刷新即消，与 pin 的持久布局语义分工）
 *
 * 入口：__openloopDockService.openSnapshot（panels/artifact 卡片）+
 * 本包直接 import projectSnapshot（APP 资源列表行/预览）。
 */
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { getPanelsClient, getArtifactClient, getMcpAppsClient } from './openloop-clients.ts'
import { getBaseClient, DependencyMissing } from './base-bridge.tsx'
import { getScope, sourceIdOf } from './DockBoardView.tsx'
import { icons } from './icons.tsx'
import type { DockTileSource } from './store.ts'

interface SnapshotWin {
  readonly id: string
  readonly source: DockTileSource
  readonly title: string
  readonly takenAt: string
  /** null = 跟随堆栈位；拖拽后为自由坐标 */
  readonly pos: { x: number; y: number } | null
  readonly size: { w: number; h: number }
}

interface SnapState {
  readonly wins: readonly SnapshotWin[]
  /** 新建窗口 id（入场动画只给它——React 重排会重放基础动画，见原型踩坑） */
  readonly freshId: string | null
  /** 被点击提前的窗口 id（「重新浮动」反馈） */
  readonly bumpedId: string | null
}

// ---- 会话级 mini store（不持久化；模块级，service 与组件共用） ----

// 0.9.17：锚点在 header 分割线（≈88px）之下——开关已挪进 header 区，不冲突
const STACK_TOP = 96
const STACK_RIGHT = 16
const CASCADE_X = -18
const CASCADE_Y = 16
const DEFAULT_W = 480
const DEFAULT_H = 340
const MIN_W = 300
const MIN_H = 200
/** DockHost 2147483050 之上、DockToggle 2147483100 之下 */
const LAYER_Z = 2147483060

let state: SnapState = { wins: [], freshId: null, bumpedId: null }
let seq = 0
let bumpTimer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function emit(next: SnapState): void {
  state = next
  for (const l of listeners) l()
}
function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** 投影一个快照（冻结 source；标题取卡片/组件名） */
export function projectSnapshot(source: DockTileSource, title: string): void {
  seq += 1
  const now = new Date()
  const takenAt = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
  const id = `snap-${seq}`
  const win: SnapshotWin = { id, source, title, takenAt, pos: null, size: { w: DEFAULT_W, h: DEFAULT_H } }
  emit({ wins: [...state.wins, win], freshId: id, bumpedId: null })
  setTimeout(() => {
    if (state.freshId === id) emit({ ...state, freshId: null })
  }, 400)
}

function closeSnapshot(id: string): void {
  emit({ ...state, wins: state.wins.filter(w => w.id !== id) })
}

/** 点击提前：数组末尾 = 最前；animate=true 时给「重新浮动」反馈（拖拽起手不调动画） */
function bringToFront(id: string, animate: boolean): void {
  const idx = state.wins.findIndex(w => w.id === id)
  if (idx < 0 || idx === state.wins.length - 1) return
  const wins = state.wins.slice()
  const [target] = wins.splice(idx, 1)
  if (target === undefined) return
  wins.push(target)
  emit({ ...state, wins, bumpedId: animate ? id : state.bumpedId })
  if (animate) {
    if (bumpTimer !== undefined) clearTimeout(bumpTimer)
    bumpTimer = setTimeout(() => {
      if (state.bumpedId === id) emit({ ...state, bumpedId: null })
    }, 350)
  }
}

function setWinRect(id: string, rect: { x: number; y: number; w: number; h: number }): void {
  emit({
    ...state,
    wins: state.wins.map(w => w.id === id ? { ...w, pos: { x: rect.x, y: rect.y }, size: { w: rect.w, h: rect.h } } : w),
  })
}

// ---- 层组件 ----

const SNAP_CSS = `
@keyframes openloop-snap-in { from { opacity: 0; transform: translate(26px,-18px) scale(.92); } to { opacity: 1; transform: none; } }
@keyframes openloop-snap-pop { 0% { transform: translateY(0); } 35% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
`

export function SnapshotLayer(): ReactNode {
  const snap = useSyncExternalStore(subscribe, () => state)
  // 动画 keyframes 注入一次（inline style 无法声明 @keyframes）
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-openloop-snapshot', '')
    el.textContent = SNAP_CSS
    document.head.appendChild(el)
    return () => { el.remove() }
  }, [])

  if (snap.wins.length === 0) return null
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: LAYER_Z }} data-openloop-snapshot-layer>
      {snap.wins.map((w, i) => (
        <SnapshotWindow
          key={w.id}
          win={w}
          fromFront={snap.wins.length - 1 - i}
          fresh={w.id === snap.freshId}
          bumped={w.id === snap.bumpedId}
        />
      ))}
    </div>
  )
}

// ---- 窗口组件 ----

interface Rect { x: number; y: number; w: number; h: number }

function stackRect(fromFront: number, size: { w: number; h: number }): Rect {
  const vw = window.innerWidth
  const maxSteps = Math.max(0, Math.floor((vw - size.w - STACK_RIGHT - 8) / -CASCADE_X))
  const steps = Math.min(fromFront, maxSteps)
  return {
    x: vw - STACK_RIGHT - size.w + steps * CASCADE_X,
    y: STACK_TOP + fromFront * CASCADE_Y,
    w: size.w,
    h: size.h,
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

function moveRect(start: Rect, dx: number, dy: number): Rect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  return {
    x: clamp(start.x + dx, -start.w + 90, vw - 90),
    y: clamp(start.y + dy, 0, vh - 42),
    w: start.w,
    h: start.h,
  }
}

function resizeRect(start: Rect, dir: string, dx: number, dy: number): Rect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = start.x
  let right = start.x + start.w
  let top = start.y
  let bottom = start.y + start.h
  if (dir.includes('w')) left = clamp(start.x + dx, -start.w + 90, right - MIN_W)
  if (dir.includes('e')) right = clamp(right + dx, left + MIN_W, vw - 8)
  if (dir.includes('n')) top = clamp(start.y + dy, 0, bottom - MIN_H)
  if (dir.includes('s')) bottom = clamp(bottom + dy, top + MIN_H, vh - 8)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

const RESIZE_HANDLES: ReadonlyArray<{ d: string; style: CSSProperties }> = [
  { d: 'nw', style: { left: 0, top: 0, width: 16, height: 16, cursor: 'nwse-resize' } },
  { d: 'n', style: { left: 14, right: 14, top: 0, height: 8, cursor: 'ns-resize' } },
  { d: 'ne', style: { right: 0, top: 0, width: 16, height: 16, cursor: 'nesw-resize' } },
  { d: 'w', style: { left: 0, top: 14, bottom: 14, width: 8, cursor: 'ew-resize' } },
  { d: 'e', style: { right: 0, top: 14, bottom: 14, width: 8, cursor: 'ew-resize' } },
  { d: 'sw', style: { left: 0, bottom: 0, width: 16, height: 16, cursor: 'nesw-resize' } },
  { d: 's', style: { left: 14, right: 14, bottom: 0, height: 8, cursor: 'ns-resize' } },
  { d: 'se', style: { right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize' } },
]

const SNAP_PURPLE = '#7a5af8'

function SnapshotWindow({ win, fromFront, fresh, bumped }: {
  win: SnapshotWin
  fromFront: number
  fresh: boolean
  bumped: boolean
}): ReactNode {
  const [interacting, setInteracting] = useState(false)
  const cancelRef = useRef<() => void>(() => {})
  useEffect(() => () => cancelRef.current(), [])

  const rect: Rect = win.pos !== null
    ? { x: win.pos.x, y: win.pos.y, w: win.size.w, h: win.size.h }
    : stackRect(fromFront, win.size)

  /** 拖拽/8向拉伸：pointer capture + window 级监听（univer 同款手写，零依赖）。
   *  起手只提前不播动画——拖拽本身就是反馈。 */
  const beginSession = (event: React.PointerEvent<HTMLElement>, mode: string): void => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    bringToFront(win.id, false)
    cancelRef.current()
    const view = event.currentTarget.ownerDocument.defaultView
    if (view === null) return
    const pointerId = event.pointerId
    const origin = { x: event.clientX, y: event.clientY }
    const start = rect
    const el = event.currentTarget
    setInteracting(true)
    try { el.setPointerCapture(pointerId) } catch { /* 捕获可选 */ }
    const move = (next: PointerEvent): void => {
      if (next.pointerId !== pointerId) return
      const dx = next.clientX - origin.x
      const dy = next.clientY - origin.y
      setWinRect(win.id, mode === 'move' ? moveRect(start, dx, dy) : resizeRect(start, mode, dx, dy))
    }
    const cleanup = (): void => {
      view.removeEventListener('pointermove', move)
      view.removeEventListener('pointerup', finish)
      view.removeEventListener('pointercancel', finish)
      cancelRef.current = () => {}
      try { el.releasePointerCapture(pointerId) } catch { /* 已释放 */ }
    }
    const finish = (next: PointerEvent): void => {
      if (next.pointerId !== pointerId) return
      cleanup()
      setInteracting(false)
    }
    cancelRef.current = cleanup
    view.addEventListener('pointermove', move)
    view.addEventListener('pointerup', finish)
    view.addEventListener('pointercancel', finish)
  }

  const rid = sourceIdOf(win.source)
  const anim: CSSProperties = fresh
    ? { animation: 'openloop-snap-in .28s cubic-bezier(.2,.9,.3,1.2)' }
    : bumped
      ? { animation: 'openloop-snap-pop .3s ease-out' }
      : {}

  return (
    <section
      style={{
        position: 'fixed',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        boxShadow: '0 2px 6px rgba(0,0,0,.1), 0 18px 48px rgba(0,0,0,.28)',
        ...anim,
      }}
      data-openloop-snapshot-window={win.id}
      onPointerDown={() => bringToFront(win.id, true)}
      aria-label={`快照 · ${win.title}`}
    >
      <header
        style={{
          flex: '0 0 38px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 8px 0 11px',
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
          background: `linear-gradient(180deg, color-mix(in srgb, var(--dsw-alias-bg-layer-2, #f6f6f7) 88%, ${SNAP_PURPLE}), var(--dsw-alias-bg-layer-2, #f6f6f7))`,
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
        }}
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[data-snap-control]') !== null) return
          beginSession(e, 'move')
        }}
      >
        <span style={{
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontSize: 9,
          fontWeight: 600,
          padding: '1.5px 7px',
          borderRadius: 999,
          color: SNAP_PURPLE,
          background: `color-mix(in srgb, ${SNAP_PURPLE} 13%, transparent)`,
          border: `1px solid color-mix(in srgb, ${SNAP_PURPLE} 32%, transparent)`,
          whiteSpace: 'nowrap',
        }}>
          <icons.snap size={9} sw={1.8} />
          快照 {win.takenAt}
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{win.title}</span>
        {rid !== null ? (
          <span style={{
            flexShrink: 0,
            fontSize: 9,
            fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            color: 'var(--dsw-alias-label-caption, #888)',
            background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))',
            padding: '1.5px 6px',
            borderRadius: 5,
            whiteSpace: 'nowrap',
          }}>{rid}</span>
        ) : null}
        <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <button
            type="button"
            data-snap-control=""
            title="关闭快照"
            onClick={() => closeSnapshot(win.id)}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: 0,
              background: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--dsw-alias-label-tertiary, #888)',
            }}
          >
            <icons.x size={12} />
          </button>
        </span>
      </header>
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
        <SnapshotContent win={win} />
      </div>
      {/* 拖拽/拉伸中透明罩：防止内容 iframe（artifact/mcp-app）吞掉 pointermove */}
      {interacting ? <div style={{ position: 'absolute', inset: 0, zIndex: 18 }} /> : null}
      <footer style={{
        flex: '0 0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        fontSize: 9,
        color: 'var(--dsw-alias-label-caption, #888)',
        borderTop: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
        background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)',
      }}>
        <span style={{ color: SNAP_PURPLE, fontWeight: 600 }}>只读回看</span>
        <span>·</span>
        <span>内容冻结于投影时刻，pin 到看板才会持久保留</span>
      </footer>
      {RESIZE_HANDLES.map(h => (
        <span
          key={h.d}
          style={{ position: 'absolute', zIndex: 20, touchAction: 'none', ...h.style }}
          onPointerDown={(e) => beginSession(e, h.d)}
        />
      ))}
    </section>
  )
}

// ---- 内容分发（与 DockBoardView TileContent 同链，唯二差异：relReadonly + 不取 registry 最新） ----

function SnapshotContent({ win }: { win: SnapshotWin }): ReactNode {
  const { source } = win
  if (source.kind === 'panel') {
    const panels = getPanelsClient()
    if (panels === undefined) return <DependencyMissing what="快照面板" dep="@openloop/dsh-panels" />
    const PanelSurface = panels.PanelSurface
    return <PanelSurface meta={source.meta as never} relReadonly />
  }
  if (source.kind === 'mcp-app') {
    const mcpApps = getMcpAppsClient()
    if (mcpApps === undefined) return <DependencyMissing what="快照 MCP App" dep="@openloop/dsh-mcp" />
    const McpAppResourceView = mcpApps.McpAppResourceView
    const meta = source.meta
    return <McpAppResourceView serverId={meta.serverId} toolName={meta.toolName} resourceUri={meta.resourceUri} title={win.title} frameId={`snap-${win.id}`} />
  }
  const artifact = getArtifactClient()
  if (artifact === undefined) return <DependencyMissing what="快照 Artifact" dep="@openloop/dsh-html-artifact" />
  const ArtifactFrame = artifact.ArtifactFrame
  return <ArtifactFrame meta={source.meta as never} token={`snap-${win.id}`} fullscreen={false} scope={getScope()} />
}
