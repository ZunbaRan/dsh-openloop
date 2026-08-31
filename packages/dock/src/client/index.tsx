/**
 * OpenLoop Dock client 半（Dock 2.0；0.8.0 三列重构 2026-08-30）：
 * - DockHost 挂载（margin+width push，与 better-sidebar 共通道；空间探测读 --dsh-sidebar-width，见 DockHost.tsx）
 * - 顶栏：看板/APP 段控 + 收起按钮（issue 2；取代 rail 的 APP 入口与 board head 的收起）
 * - RailNav 两态导航轨（52 图标态 ↔ 216 中枢态，只管看板页——APP 分区已移除）
 * - APP tab 三列（AppListPanel.tsx）：col1 富状态 APP 列表 → col2 资源列表（默认
 *   「详情」）→ col3 详情/组件预览（免 pin 选中即看，复用 tile 渲染链）/API 详情
 * - 展开态持久化（issue 3 B 方案）：记住上次离开状态；无存档默认收起
 * - 持久化（M3）：localStorage 恒为本地副本；dsh-app 门面（/openloop/app/boards）
 *   为权威存储——启动 syncBackend（载入/迁移/挂钩推送），不可用降级本地 + 提示条
 * - UI 态独立持久化：rail 宽 / tab+选中 APP / 展开态（不进 dockStore）
 * - cordis service `openloop-dock/client`：pinPanel / pinArtifact / toggle / open
 * - 右上角浮动开关（不依赖 slots，零冲突）
 */
import type { Context } from '@deepseek-ai/cordis'
import { createElement, useEffect, useRef, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DockHost, clampDockWidth, DOCK_MIN_WIDTH, probeDockRightEdge } from './DockHost.tsx'
import { DockBoardView, sourceIdOf } from './DockBoardView.tsx'
import { RailNav, RAIL_HUB_WIDTH, RAIL_ICON_WIDTH, type DockTab } from './RailNav.tsx'
import { AppsTab } from './AppListPanel.tsx'
import { listBuiltinApps, buildTileSourceForComponent, fetchRemoteApps, fetchRegistryRev, mergeApps, type AppDescriptor } from './app-registry.ts'
import { syncBackend, revalidateBackend, type BackendMode } from './backend-sync.ts'
import { V2_CSS } from './v2-styles.ts'
import { dockStore, type DockTile } from './store.ts'
import { icons } from './icons.tsx'

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
  // 开态隐藏：顶栏自带「收起」按钮（0.8.0 起统一入口）
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
        // top 50% 垂直居中（0.8.3 用户反馈：top:12 与 header 按钮排重叠；
        // 垂直居中独立于一切 header/底部控件，且是面板展开把手的惯例位置）
        top: '50%',
        transform: 'translateY(-50%)',
        right,
        zIndex: 2147483100,
        minWidth: 34,
        height: 34,
        padding: '0 8px',
        borderRadius: 10,
        // 低存在感处理：无阴影、静止半透明，hover 才完全显现——浮动按钮不该抢视觉
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        cursor: 'pointer',
        lineHeight: 1,
        opacity: hover ? 1 : 0.55,
        transition: 'opacity .15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--dsw-alias-label-secondary, inherit)',
      }}
    >
      {/* 0.8.3 icon 替换：四宫格 tiles 拼贴——「看板」的本体形态 */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      {count > 0 ? <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span> : null}
    </button>
  )
}

const WIDTH_KEY = 'openloop.dock.width.v1'
const RAIL_WIDTH_KEY = 'openloop.dock.rail-width.v1'
const TAB_KEY = 'openloop.dock.tab.v1'
const OPEN_KEY = 'openloop.dock.open.v1'
/** 默认展开宽（0.8.2：三列 APP tab 的从容布局起步宽——col1 230 + col2 290 + col3 ≥180） */
const DEFAULT_WIDTH = 720

/**
 * 展开态读取（0.8.0 issue 3：进入 DSH 不再默认展开）：
 * 有存档按存档（记住上次离开状态）；无存档默认收起。
 * 旧行为（有 tile 即展开）废止——展开是用户动作，不是启动副作用。
 */
function readOpenState(): boolean {
  try {
    const raw = localStorage.getItem(OPEN_KEY)
    if (raw === '1') return true
    if (raw === '0') return false
  } catch { /* ignore */ }
  return false
}

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

/** tab 态 = 当前 tab + 选中的 APP（M2 起存 JSON；M1 的纯字符串 'apps'/'board' 兼容读） */
interface TabState {
  tab: DockTab
  selectedAppId: string | null
}

function readTabState(): TabState {
  try {
    const raw = localStorage.getItem(TAB_KEY)
    if (raw === null) return { tab: 'board', selectedAppId: null }
    // M1 旧格式：纯字符串
    if (raw === 'apps' || raw === 'board') return { tab: raw, selectedAppId: null }
    const p = JSON.parse(raw) as Partial<TabState>
    return {
      tab: p.tab === 'apps' ? 'apps' : 'board',
      selectedAppId: typeof p.selectedAppId === 'string' ? p.selectedAppId : null,
    }
  } catch {
    return { tab: 'board', selectedAppId: null }
  }
}

function DockShell(): ReactNode {
  const [open, setOpen] = useState(readOpenState)
  // issue 3（B 方案）：展开/收起态持久化——记住上次离开状态
  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, open ? '1' : '0') } catch { /* ignore */ }
  }, [open])
  const [version, setVersion] = useState(0)
  const [width, setWidth] = useState(readStoredWidth)
  const [tabState, setTabState] = useState<TabState>(readTabState)
  const [railWidth, setRailWidth] = useState(readRailWidth)
  const [toast, setToast] = useState<string | null>(null)
  // M3：后端同步模式（degraded → 提示条；remote/local 静默）
  const [backendMode, setBackendMode] = useState<BackendMode>('local')
  // 探测循环闭包读最新模式用（不触发重渲染）
  const backendModeRef = useRef<BackendMode>('local')
  useEffect(() => { backendModeRef.current = backendMode }, [backendMode])
  // 远端 APP 清单（M3：门面 registry；不可用为空数组——APP tab 只剩内置）
  const [remoteApps, setRemoteApps] = useState<AppDescriptor[]>([])
  useEffect(() => dockStore.subscribe(() => setVersion(v => v + 1)), [])
  // toast 2.2s 自动消隐（原型同款节奏）
  useEffect(() => {
    if (toast === null) return
    const timer = setTimeout(() => setToast(null), 2200)
    return () => clearTimeout(timer)
  }, [toast])
  // M3+P4：启动编排（读门面 boards → 决策 → 载入/迁移/对齐 → 挂钩）+ registry 拉取。
  // 绝不炸页：syncBackend 内部全捕获，degraded 只出提示条
  useEffect(() => {
    let cancelled = false
    void syncBackend(dockStore, {
      onRemoteError: message => { if (!cancelled) setToast(message) },
      onDegradedChange: degraded => { if (!cancelled) setBackendMode(degraded ? 'degraded' : 'remote') },
    }).then(mode => { if (!cancelled) setBackendMode(mode) })
    void fetchRemoteApps().then(apps => { if (!cancelled) setRemoteApps(apps) })
    return () => { cancelled = true }
  }, [])

  // P1 registry 刷新 + P4 恢复对齐（共用一个探测循环）：
  // - 轻探 GET /openloop/app/status 拿 registryRev，代次变了才拉全量 registry
  // - 降级态时探测兼作恢复探测：门面可达 → revalidateBackend（pending 镜像回推对齐 + 撤降级）
  useEffect(() => {
    let cancelled = false
    let knownRev: number | null = null
    let timer: ReturnType<typeof setTimeout> | undefined

    const probe = async (): Promise<void> => {
      const rev = await fetchRegistryRev()
      if (cancelled) return
      if (rev !== null && knownRev !== null && rev !== knownRev) {
        const apps = await fetchRemoteApps()
        if (!cancelled) setRemoteApps(apps)
      }
      if (rev !== null) {
        knownRev = rev
        // P4：曾处降级 → 门面恢复 → 对齐（pending 回推）+ 撤降级提示条
        if (backendModeRef.current === 'degraded') {
          const mode = await revalidateBackend(dockStore, {
            onRemoteError: message => { if (!cancelled) setToast(message) },
            onDegradedChange: degraded => { if (!cancelled) setBackendMode(degraded ? 'degraded' : 'remote') },
          })
          if (!cancelled) setBackendMode(mode)
        }
      }
      timer = setTimeout(() => { void probe() }, rev !== null ? 15_000 : 60_000)
    }

    void probe()
    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [])
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

  // APP 注册表（M3：内置恒在 + 门面追加合并；panels 桥懒 require 每渲染读一次）
  const { apps: builtinApps, panelsMissing } = listBuiltinApps()
  const apps = mergeApps(builtinApps, remoteApps)
  const selectedApp: AppDescriptor | undefined = apps.find(a => a.id === tabState.selectedAppId) ?? apps[0]
  const activeBoard = state.boards.find(b => b.id === state.activeBoardId) ?? state.boards[0]
  // 当前看板页已固定的资源 ID（`openloop:<kind>`）——AppDetail 的 pinned 判定
  const pinnedIds = new Set((activeBoard?.tiles ?? []).map(t => sourceIdOf(t.source)).filter((v): v is string => v !== null))

  const persistTabState = (next: TabState): void => {
    setTabState(next)
    try { localStorage.setItem(TAB_KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }

  const persistTab = (tab: DockTab): void => {
    persistTabState({ ...tabState, tab })
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

  /** APP tab 选中（rail mini icon / 侧栏行共用） */
  const openApp = (id: string): void => {
    persistTabState({ tab: 'apps', selectedAppId: id })
  }

  /** pin：以示例 props 建面板实例 → 落到当前看板页 → 跳回看板（M2 验收点）。
   *  v2：mcp-app 组件 pin 引用形态 tile（渲染时取数）；门面组件（无渲染数据）拒绝并提示。 */
  const pinComponent = (_app: AppDescriptor, component: AppDescriptor['components'][number]): void => {
    const source = buildTileSourceForComponent(component)
    if (source === null) {
      setToast(`「${component.title}」暂无渲染数据——让 Agent 经 app_backend 生成内容后再固定`)
      return
    }
    dockStore.pin(source, component.title)
    persistTabState({ tab: 'board', selectedAppId: tabState.selectedAppId })
    setToast(`已固定「${component.title}」到当前看板`)
  }

  return (
    <>
      <DockToggle open={open} onToggle={() => setOpen(o => !o)} count={totalTiles} right={toggleRight} />
      <DockHost open={open} width={width} onWidthChange={(w) => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }} data-dock-version={version}>
          {/* 顶栏（0.8.0 issue 2：收起按钮随展开态常驻；tab 段控取代 rail 的 APP 入口） */}
          <header className="d2-topbar">
            <div className="d2-topbar-seg" role="tablist" aria-label="工作台视图切换">
              <button type="button" role="tab" aria-selected={tabState.tab === 'board'} className={tabState.tab === 'board' ? 'on' : ''} onClick={() => persistTab('board')}>
                <icons.board size={13} /> 看板
              </button>
              <button type="button" role="tab" aria-selected={tabState.tab === 'apps'} className={tabState.tab === 'apps' ? 'on' : ''} onClick={() => persistTab('apps')}>
                <icons.apps size={13} /> APP
              </button>
            </div>
            <span className="d2-topbar-spacer" />
            <button type="button" className="d2-collapse-btn" title="收起工作台（tile 保留，再点右上角 📌 展开）" onClick={() => setOpen(false)}>
              <icons.chevronR size={14} /> 收起
            </button>
          </header>
          <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0 }}>
            {tabState.tab === 'board' ? (
              <>
                <RailNav
                  tab={tabState.tab}
                  onTabChange={persistTab}
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
                <DockBoardView />
              </>
            ) : panelsMissing ? (
              <div className="d2-empty-note" style={{ margin: 'auto' }}>
                <div style={{ fontSize: 22, opacity: 0.6 }}>🧩</div>
                <div>APP 注册表不可用</div>
                <div className="d2-tcap">安装 / 启用 @openloop/dsh-panels 后，这里可以浏览和固定组件</div>
              </div>
            ) : (
              <AppsTab apps={apps} selectedAppId={selectedApp?.id ?? null} onOpenApp={openApp} pinnedIds={pinnedIds} onPin={pinComponent} onManaged={() => { void fetchRemoteApps().then(merged => setRemoteApps(merged)) }} />
            )}
          </div>
        </div>
      </DockHost>
      {toast !== null ? <div className="d2-toast">{toast}</div> : null}
      {backendMode === 'degraded' ? (
        <div className="d2-banner" role="status">
          应用后端暂不可用——看板已降级为本地存储（数据不丢，恢复后自动同步）
        </div>
      ) : null}
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
