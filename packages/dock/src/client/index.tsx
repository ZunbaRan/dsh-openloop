/**
 * OpenLoop Dock client 半（Dock 2.0，2026-08-25）：
 * - DockHost 挂载（margin+width push，与 better-sidebar 共通道；空间探测读 --dsh-sidebar-width，见 DockHost.tsx）
 * - RailNav 两态导航轨（52 图标态 ↔ 216 中枢态）+ 内容区（board | apps）
 * - UI 态独立持久化：rail 宽 / 当前 tab（不进 dockStore——store 只收看板数据）
 * - cordis service `openloop-dock/client`：pinPanel / pinArtifact / toggle / open
 *   （panels/artifact 的 PinButton 经可选 inject 消费——dock 未装时按钮自动降级隐藏）
 * - 右上角浮动开关（不依赖 slots，零冲突）
 */
import type { Context } from '@deepseek-ai/cordis'
import { createElement, useEffect, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DockHost, clampDockWidth, DOCK_MIN_WIDTH, probeDockRightEdge } from './DockHost.tsx'
import { DockBoardView } from './DockBoardView.tsx'
import { RailNav, RAIL_HUB_WIDTH, RAIL_ICON_WIDTH, type DockTab } from './RailNav.tsx'
import { V2_CSS } from './v2-styles.ts'
import { dockStore, type DockTile } from './store.ts'

export const name = 'openloop-dock'
// dock 不依赖宿主 cordis 服务（自主渲染 + provide service）——空 inject
export const inject: string[] = []

export interface DockClientService {
  /** 固定一个面板（快照语义：meta 含 panel + resolved） */
  pinPanel(meta: unknown, title: string, origin?: DockTile['origin']): void
  /** 固定一个 html artifact */
  pinArtifact(meta: unknown, title: string, origin?: DockTile['origin']): void
  /** 打开/收起 dock */
  toggle(): void
  /** dock 是否打开 */
  isOpen(): boolean
}

function DockToggle({ open, onToggle, count, right }: { open: boolean; onToggle: () => void; count: number; right: number }): ReactNode {
  // 开态隐藏：面板 board head 自带「收起」按钮（bsb 同款——开着的面板用面板自己的
  // 关闭控制，不再让浮动按钮遮挡 tile 内容）
  const [hover, setHover] = useState(false)
  if (open) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      title="展开 OpenLoop Dock"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed',
        // top 52 错层（2026-08-24 真机冲突修复）：bsb 的面板开关在 header 行
        // （y≈3-40），dock toggle 与其垂直错开避免命中冲突。
        top: 52,
        right,
        zIndex: 2147483100,
        minWidth: 34,
        height: 34,
        padding: '0 8px',
        borderRadius: 10,
        // 低存在感处理（2026-08-24 对比 bsb）：无阴影、静止半透明，
        // hover 才完全显现——浮动按钮不该抢视觉
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        opacity: hover ? 1 : 0.55,
        transition: 'opacity .15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      📌{count > 0 ? <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span> : null}
    </button>
  )
}

const WIDTH_KEY = 'openloop.dock.width.v1'
const RAIL_WIDTH_KEY = 'openloop.dock.rail-width.v1'
const TAB_KEY = 'openloop.dock.tab.v1'
const DEFAULT_WIDTH = 420

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) ? clampDockWidth(n) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

function readRailWidth(): number {
  try {
    const raw = localStorage.getItem(RAIL_WIDTH_KEY)
    const n = raw === null ? NaN : Number(raw)
    return n === RAIL_ICON_WIDTH || n === RAIL_HUB_WIDTH ? n : RAIL_ICON_WIDTH
  } catch {
    return RAIL_ICON_WIDTH
  }
}

function readTab(): DockTab {
  try {
    return localStorage.getItem(TAB_KEY) === 'apps' ? 'apps' : 'board'
  } catch {
    return 'board'
  }
}

/** APP tab 占位（M1：注册表未接，M2 由 AppListPanel + AppDetail 替换） */
function AppsPlaceholder(): ReactNode {
  return (
    <section style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="d2-empty-note">
        <div style={{ fontSize: 22, opacity: 0.6 }}>🧩</div>
        <div>APP 体系建设中</div>
        <div className="d2-tcap">组件与 API 注册表接入后，这里可以浏览和固定资源</div>
      </div>
    </section>
  )
}

function DockShell(): ReactNode {
  const [open, setOpen] = useState(() => dockStore.getSnapshot().boards.some(b => b.tiles.length > 0))
  const [version, setVersion] = useState(0)
  const [width, setWidth] = useState(readStoredWidth)
  const [tab, setTab] = useState<DockTab>(readTab)
  const [railWidth, setRailWidth] = useState(readRailWidth)
  const [toast, setToast] = useState<string | null>(null)
  useEffect(() => dockStore.subscribe(() => setVersion(v => v + 1)), [])
  // toast 2.2s 自动消隐（原型同款节奏）
  useEffect(() => {
    if (toast === null) return
    const timer = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(timer)
  }, [toast])
  // toggle 跟随 bsb 右缘（bsb 开时挪到其左侧 10px，避免与其按钮重叠）
  const [toggleRight, setToggleRight] = useState(10)
  useEffect(() => {
    const update = () => setToggleRight(Math.max(10, window.innerWidth - probeDockRightEdge() + 10))
    update()
    // 与 DockHost 同款：500ms poll（CSS 变量驱动的 push 无法被 MutationObserver 捕获）
    const timer = setInterval(update, 500)
    window.addEventListener('resize', update)
    return () => { clearInterval(timer); window.removeEventListener('resize', update) }
  }, [])

  // v2 组件样式注入一次（token 直接引用宿主 --dsw-alias-*，见 v2-styles.ts）
  useEffect(() => {
    const el = document.createElement('style')
    el.setAttribute('data-openloop-dock-v2', '')
    el.textContent = V2_CSS
    document.head.appendChild(el)
    return () => el.remove()
  }, [])

  // service 桥：toggle 给手动操作、ensureOpen 给 pin（2026-08-24 修复：pinPanel
  // 之前用 toggle 但 toggle 无状态翻转——dock 已开时 pin 反而把它关掉；
  // ensureOpen 强制开，幂等）
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__openloopDockToggle = () => setOpen(o => !o)
    w.__openloopDockOpen = () => setOpen(true)
    return () => {
      delete w.__openloopDockToggle
      delete w.__openloopDockOpen
    }
  }, [])

  const state = dockStore.getSnapshot()
  const totalTiles = state.boards.reduce((n, b) => n + b.tiles.length, 0)

  const persistTab = (next: DockTab): void => {
    setTab(next)
    try { localStorage.setItem(TAB_KEY, next) } catch { /* ignore */ }
  }

  /** rail 松手吸附：持久化 rail 宽；内容区保底 DOCK_MIN_WIDTH（rail 变宽挤压时自动撑开 dock） */
  const commitRailWidth = (next: number): void => {
    setRailWidth(next)
    try { localStorage.setItem(RAIL_WIDTH_KEY, String(next)) } catch { /* ignore */ }
    if (width < next + DOCK_MIN_WIDTH) {
      const widened = clampDockWidth(next + DOCK_MIN_WIDTH)
      setWidth(widened)
      try { localStorage.setItem(WIDTH_KEY, String(widened)) } catch { /* ignore */ }
    }
  }

  const addBoard = (): void => {
    const board = dockStore.getSnapshot().boards
    dockStore.addBoard()
    persistTab('board')
    const created = dockStore.getSnapshot().boards[board.length]
    if (created !== undefined) setToast(`已新增「${created.name}」（双击页名可重命名）`)
  }

  const removeBoard = (id: string): void => {
    const target = state.boards.find(b => b.id === id)
    dockStore.removeBoard(id)
    if (target !== undefined) setToast(`已删除「${target.name}」`)
  }

  return (
    <>
      <DockToggle open={open} onToggle={() => setOpen(o => !o)} count={totalTiles} right={toggleRight} />
      <DockHost open={open} width={width} onWidthChange={(w) => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }}>
        <div style={{ display: 'flex', height: '100%', minWidth: 0 }} data-dock-version={version}>
          <RailNav
            tab={tab}
            onTabChange={persistTab}
            apps={[]}
            selectedAppId={null}
            onOpenApp={() => persistTab('apps')}
            boards={state.boards}
            activeBoardId={state.activeBoardId}
            onSelectBoard={id => dockStore.setActiveBoard(id)}
            onAddBoard={addBoard}
            onRenameBoard={(id, name) => dockStore.renameBoard(id, name)}
            onRemoveBoard={removeBoard}
            width={railWidth}
            onWidthChange={setRailWidth}
            onWidthCommit={commitRailWidth}
          />
          {tab === 'board' ? <DockBoardView onCollapse={() => setOpen(false)} /> : <AppsPlaceholder />}
        </div>
      </DockHost>
      {toast !== null ? <div className="d2-toast">{toast}</div> : null}
    </>
  )
}

export function apply(ctx: Context): void {
  // service：panels/artifact 经 ctx.inject(['openloop-dock/client']) 可选消费
  const service: DockClientService = {
    pinPanel(meta, title, origin) {
      dockStore.pin({ kind: 'panel', meta }, title, origin)
      ;(window as unknown as { __openloopDockOpen?: () => void }).__openloopDockOpen?.()
    },
    pinArtifact(meta, title, origin) {
      dockStore.pin({ kind: 'artifact', meta }, title, origin)
      ;(window as unknown as { __openloopDockOpen?: () => void }).__openloopDockOpen?.()
    },
    toggle() {
      ;(window as unknown as { __openloopDockToggle?: () => void }).__openloopDockToggle?.()
    },
    isOpen() {
      return document.querySelector('[data-openloop-dock-panel]') !== null
    },
  }
  // service 双通道：cordis provide（保留语义）+ window 直通（消费方零 inject 依赖——
  // 真机验证 cordis client 侧动态 inject(['openloop-dock/client']) 回调未触发，
  // pin 按钮两包全灭；window 直通是 __openloopDockToggle 已实证的同款模式，
  // 且渲染时读取天然支持时序（晚渲染的卡片拿到最新状态））
  ctx.provide('openloop-dock/client', service)
  ;(window as unknown as Record<string, unknown>).__openloopDockService = service
  // 自主渲染（better-sidebar 同款模式）：自建 host + createRoot，
  // cordis 生命周期负责 dispose。
  ctx.effect(() => {
    const host = document.createElement('div')
    host.setAttribute('data-openloop-dock-root', '')
    document.body.appendChild(host)
    let root: Root | undefined
    try {
      root = createRoot(host)
      root.render(createElement(DockShell))
    } catch { /* 渲染失败静默——不影响宿主页面 */ }
    return () => {
      delete (window as unknown as Record<string, unknown>).__openloopDockService
      void root?.unmount()
      host.remove()
    }
  }, 'openloop-dock: shell mount')
}
