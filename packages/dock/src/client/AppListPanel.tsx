/**
 * APP tab 三列结构（0.8.0 三列重构，2026-08-30；原型 designs/dock-app-redesign 已批准）：
 * - col1 AppListPanel：富状态 APP 行（图标/名称/资源计数/来源徽标/连接状态点）
 * - col2 AppResourceList：选中 APP 的资源列表（顶部默认「详情」行 + 组件/API 分组）
 * - col3 AppDetailPane：详情（原 AppDetail 直搬）/ 组件预览（免 pin 选中即看）/ API 详情
 *
 * 旧版（rail APP 分区 + 230px 侧栏 + 详情两列）废止：APP 入口收敛到 col1，
 * rail 只留看板页；预览复用 tile 渲染链（PanelSurface / McpAppResourceView）。
 */
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import type { AppDescriptor, AppComponentDescriptor } from './app-registry.ts'
import { buildTileSourceForComponent } from './app-registry.ts'
import { AppIcon, KindBadge, TypeBadge } from './badges.tsx'
import { RelChips, RelDeclSection, RelTryIt, RelatedPages } from './rel-views.tsx'
import { applySortOrder, cycleSortMode, makeRowDragHandlers, moveBefore, readOrder, readSortMode, SortButton, writeOrder, writeSortMode, type SortMode } from './sort.tsx'

const APPS_SORT_KEY = 'openloop.dock.apps-sort.v1'
const APPS_ORDER_KEY = 'openloop.dock.apps-order.v1'
import { icons } from './icons.tsx'
import { DependencyMissing, getBaseClient } from './base-bridge.tsx'
import { getPanelsClient, getMcpAppsClient, getArtifactClient } from './openloop-clients.ts'
import { dragResize } from './drag-resize.ts'

/** scope 惰性单例（ArtifactFrame 主题注入；与 DockBoardView 同款） */
let appListScopeCache: ReturnType<NonNullable<ReturnType<typeof getBaseClient>>['createOpenLoopSettingsScope']> | undefined
function getScope() {
  if (appListScopeCache === undefined) appListScopeCache = getBaseClient()?.createOpenLoopSettingsScope()
  return appListScopeCache
}

/** col 缩略/拖宽常量（0.8.2 恢复旧侧栏能力：缩略 48px 图标条；拖到 <120px 松手自动缩略） */
const COL_COLLAPSED_WIDTH = 48
const COL_COLLAPSE_THRESHOLD = 120
const COL_MIN_EXPANDED = 160
const COL_MAX_EXPANDED = 420

interface ColUiState {
  width: number
  collapsed: boolean
}

function readColUi(key: string, fallbackWidth: number): ColUiState {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return { width: fallbackWidth, collapsed: false }
    const p = JSON.parse(raw) as Partial<ColUiState>
    const width = typeof p.width === 'number' ? Math.min(COL_MAX_EXPANDED, Math.max(COL_MIN_EXPANDED, Math.round(p.width))) : fallbackWidth
    return { width, collapsed: p.collapsed === true }
  } catch {
    return { width: fallbackWidth, collapsed: false }
  }
}

function writeColUi(key: string, state: ColUiState): void {
  try { localStorage.setItem(key, JSON.stringify(state)) } catch { /* ignore */ }
}

/** col1/col2 共用的缩略+拖宽 hook（UI 态持久化 localStorage；
 *  0.8.3：缩略/展开切换即时化——拖到 <120px 即缩、拖回 ≥120px 即展开，不等松手） */
function useCollapsibleColumn(key: string, fallbackWidth: number): {
  ui: ColUiState
  expand: () => void
  collapse: () => void
  onHandleDown: (e: PointerEvent<HTMLDivElement>) => void
} {
  const [ui, setUi] = useState<ColUiState>(() => readColUi(key, fallbackWidth))
  const update = (patch: Partial<ColUiState>): void => {
    const next = { ...ui, ...patch }
    setUi(next)
    writeColUi(key, next)
  }
  const expand = (): void => update({ collapsed: false })
  const collapse = (): void => update({ collapsed: true })
  const onHandleDown = (e: PointerEvent<HTMLDivElement>): void => {
    const startW = ui.collapsed ? COL_COLLAPSED_WIDTH : ui.width
    dragResize(
      e, startW, COL_COLLAPSED_WIDTH, COL_MAX_EXPANDED,
      // 拖动中即时切换（只写 state，不持久化）
      w => {
        const collapsed = w < COL_COLLAPSE_THRESHOLD
        setUi(u => ({
          collapsed,
          // 缩略时保持展开宽备还原；展开时实时跟随（≥160 下限）
          width: collapsed ? u.width : Math.max(COL_MIN_EXPANDED, w),
        }))
      },
      // 松手只持久化（切换早已发生）
      w => {
        const collapsed = w < COL_COLLAPSE_THRESHOLD
        const width = collapsed ? ui.width : Math.max(COL_MIN_EXPANDED, Math.round(w))
        const next = { collapsed, width }
        setUi(next)
        writeColUi(key, next)
      },
    )
  }
  return { ui, expand, collapse, onHandleDown }
}

/** col1/col2/col3 的资源选择态 */
export type ResourceSelection =
  | { kind: 'detail' }
  | { kind: 'component'; rid: string }
  | { kind: 'api'; rid: string }

type AppTone = 'ok' | 'warn' | 'off'

/** MCP server 连接态（/openloop/mcp/servers；mcp bundle 未装时恒为空 map → 回退 API 健康态） */
function useMcpServerStates(): Map<string, string> {
  const [states, setStates] = useState<Map<string, string>>(() => new Map())
  useEffect(() => {
    let cancelled = false
    const load = (): void => {
      void fetch('/openloop/mcp/servers', { credentials: 'same-origin' })
        .then(res => {
          if (!res.ok) return null
          const contentType = res.headers.get('content-type') ?? ''
          return contentType.includes('application/json') ? res.json() : null
        })
        .then((body: unknown) => {
          if (cancelled) return
          const servers = (body as { servers?: unknown } | null)?.servers
          if (!Array.isArray(servers)) return
          const map = new Map<string, string>()
          for (const s of servers) {
            const entry = s as { id?: unknown; state?: unknown }
            if (typeof entry?.id === 'string' && typeof entry?.state === 'string') map.set(entry.id, entry.state)
          }
          setStates(map)
        })
        .catch(() => undefined)
    }
    load()
    const timer = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])
  return states
}

function toneOfApp(app: AppDescriptor, mcpStates: ReadonlyMap<string, string>): AppTone {
  const state = mcpStates.get(app.id)
  if (state !== undefined) {
    if (state === 'connected' || state === 'connecting') return 'ok'
    if (state === 'error' || state === 'disconnected') return 'warn'
    return 'off' // closed
  }
  return app.apis.some(x => x.status === 'warn') ? 'warn' : 'ok'
}

// ---- col1：富状态 APP 列表 ----

export interface AppListPanelProps {
  apps: AppDescriptor[]
  selectedAppId: string | null
  onSelect: (id: string) => void
  toneOf: (app: AppDescriptor) => AppTone
}

export function AppListPanel({ apps, selectedAppId, onSelect, toneOf }: AppListPanelProps): ReactNode {
  const { ui, expand, onHandleDown } = useCollapsibleColumn('openloop.dock.apps-col1.v1', 230)
  // 应用搜索（2026-09-03）：按名称 / id 过滤 col1
  const [appQuery, setAppQuery] = useState('')
  const filteredApps = appQuery.trim().length === 0
    ? apps
    : apps.filter(a => `${a.name} ${a.id}`.toLowerCase().includes(appQuery.trim().toLowerCase()))
  // 应用拖拽排序（2026-09-03）：custom = 用户拖拽顺序（localStorage 持久化）；az/za 仅影响展示
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode(APPS_SORT_KEY))
  const [order, setOrder] = useState<string[]>(() => readOrder(APPS_ORDER_KEY))
  const orderRef = useRef(order)
  orderRef.current = order
  const [dragId, setDragId] = useState<string | null>(null)
  const sortedApps = applySortOrder(filteredApps, sortMode, order, a => a.id, a => a.name)
  const cycleMode = (): void => {
    const next = cycleSortMode(sortMode)
    setSortMode(next)
    writeSortMode(APPS_SORT_KEY, next)
  }

  if (ui.collapsed) {
    return (
      <aside className="d2-applist d2-col-collapsed" aria-label="APP 列表（缩略）">
        <div className="d2-col-head">
          <button type="button" className="d2-collapse-btn" title="展开 APP 列表" onClick={expand}><icons.chevronR size={14} /></button>
        </div>
        <div className="d2-rows">
          {apps.map(a => (
            <button
              type="button"
              key={a.id}
              className={`d2-col-mini${a.id === selectedAppId ? ' on' : ''}`}
              title={a.name}
              onClick={() => { onSelect(a.id); expand() }}
            >
              <AppIcon app={a} size={22} />
            </button>
          ))}
        </div>
        <div className="d2-resize-h" role="separator" aria-orientation="vertical" title="拖动调宽（拖到最左变缩略，缩略态向右拖恢复）" onPointerDown={onHandleDown} />
      </aside>
    )
  }

  return (
    <aside className="d2-applist" style={{ width: ui.width }} aria-label="APP 列表">
      <div className="d2-col-head">
        <span>APP</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <SortButton mode={sortMode} onCycle={cycleMode} />
          <span className="d2-tcap">{filteredApps.length}</span>
        </span>
      </div>
      <div style={{ padding: '0 12px 6px' }}>
        <input
          className="d2-search"
          style={{ width: '100%' }}
          type="search"
          value={appQuery}
          placeholder="搜索应用…"
          aria-label="搜索应用"
          onChange={e => setAppQuery(e.target.value)}
        />
      </div>
      <div className="d2-rows">
        {sortedApps.map(a => {
          const tone = toneOf(a)
          return (
            <button
              type="button"
              key={a.id}
              className={`d2-app-row${a.id === selectedAppId ? ' on' : ''}${dragId === a.id ? ' d2-row-dragging' : ''}`}
              onClick={() => onSelect(a.id)}
              title={`${tone === 'warn' ? 'MCP server 不可达（惰性重连中）' : tone === 'off' ? 'MCP server 已关闭' : ''}按住上下拖动调整顺序`}
              {...makeRowDragHandlers({
                id: a.id,
                getDragId: () => dragId,
                setDragId,
                onHover: (drag, target) => {
                  const base = orderRef.current.length > 0 ? orderRef.current : apps.map(x => x.id)
                  setOrder(moveBefore(base, drag, target))
                },
                onCommit: () => {
                  writeOrder(APPS_ORDER_KEY, orderRef.current)
                  if (sortMode !== 'custom') { setSortMode('custom'); writeSortMode(APPS_SORT_KEY, 'custom') }
                },
              })}
            >
              <AppIcon app={a} />
              <span className="d2-meta">
                <span className="d2-name">{a.name}</span>
                <span className="d2-sub">{a.components.length} 组件 · {a.apis.length} API <KindBadge kind={a.kind} /></span>
              </span>
              <span className="d2-status"><span className={`d2-dot ${tone}`} /></span>
            </button>
          )
        })}
      </div>
      <div className="d2-resize-h" role="separator" aria-orientation="vertical" title="拖动调宽（拖到最左变缩略）" onPointerDown={onHandleDown} />
    </aside>
  )
}

// ---- col2：选中 APP 的资源列表 ----

export interface AppResourceListProps {
  app: AppDescriptor
  selection: ResourceSelection
  onSelect: (selection: ResourceSelection) => void
  pinnedIds: ReadonlySet<string>
}

export function AppResourceList({ app, selection, onSelect, pinnedIds }: AppResourceListProps): ReactNode {
  const { ui, expand, onHandleDown } = useCollapsibleColumn('openloop.dock.apps-col2.v1', 290)
  // 资源搜索（2026-09-03）：按组件标题/rid 与 API 路径/域过滤 col2
  const [resQuery, setResQuery] = useState('')
  const q = resQuery.trim().toLowerCase()
  const components = q.length === 0 ? app.components : app.components.filter(c => `${c.title} ${c.id}`.toLowerCase().includes(q))
  const apis = q.length === 0 ? app.apis : app.apis.filter(a => `${a.path} ${a.domain}`.toLowerCase().includes(q))
  // 资源拖拽排序（2026-09-03）：组件/API 分组各自维护拖拽顺序，按 app 持久化
  const COMP_ORDER_KEY = `openloop.dock.res-comp-order.v1:${app.id}`
  const API_ORDER_KEY = `openloop.dock.res-api-order.v1:${app.id}`
  const RES_SORT_KEY = 'openloop.dock.res-sort.v1'
  const [sortMode, setSortMode] = useState<SortMode>(() => readSortMode(RES_SORT_KEY))
  const [compOrder, setCompOrder] = useState<string[]>(() => readOrder(COMP_ORDER_KEY))
  const [apiOrder, setApiOrder] = useState<string[]>(() => readOrder(API_ORDER_KEY))
  const compOrderRef = useRef(compOrder); compOrderRef.current = compOrder
  const apiOrderRef = useRef(apiOrder); apiOrderRef.current = apiOrder
  useEffect(() => {
    setCompOrder(readOrder(COMP_ORDER_KEY))
    setApiOrder(readOrder(API_ORDER_KEY))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.id])
  const [dragId, setDragId] = useState<string | null>(null)
  const sortedComponents = applySortOrder(components, sortMode, compOrder, c => c.id, c => c.title)
  const sortedApis = applySortOrder(apis, sortMode, apiOrder, a => a.id, a => a.path)
  const cycleMode = (): void => {
    const next = cycleSortMode(sortMode)
    setSortMode(next)
    writeSortMode(RES_SORT_KEY, next)
  }
  const commitCustom = (mode: SortMode): void => {
    if (mode !== 'custom') { setSortMode('custom'); writeSortMode(RES_SORT_KEY, 'custom') }
  }

  if (ui.collapsed) {
    return (
      <aside className="d2-rescol d2-col-collapsed" aria-label="资源列表（缩略）">
        <div className="d2-col-head">
          <button type="button" className="d2-collapse-btn" title="展开资源列表" onClick={expand}><icons.chevronR size={14} /></button>
        </div>
        <div className="d2-rescol-rows">
          <button
            type="button"
            className={`d2-col-mini${selection.kind === 'detail' ? ' on' : ''}`}
            title="详情"
            onClick={() => { onSelect({ kind: 'detail' }); expand() }}
          >
            <icons.info size={16} />
          </button>
          {app.components.map(c => (
            <button
              type="button"
              key={c.id}
              className={`d2-col-mini${selection.kind === 'component' && selection.rid === c.id ? ' on' : ''}`}
              title={c.title}
              onClick={() => { onSelect({ kind: 'component', rid: c.id }); expand() }}
            >
              <span className={`badge plain d2-mini-badge`}>{c.type === 'mcp-app' ? 'mcp' : 'pnl'}</span>
            </button>
          ))}
          {app.apis.map(a => (
            <button
              type="button"
              key={a.id}
              className={`d2-col-mini${selection.kind === 'api' && selection.rid === a.id ? ' on' : ''}`}
              title={a.path}
              onClick={() => { onSelect({ kind: 'api', rid: a.id }); expand() }}
            >
              <span className={`d2-dot ${a.status}`} />
            </button>
          ))}
        </div>
        <div className="d2-resize-h" role="separator" aria-orientation="vertical" title="拖动调宽（拖到最左变缩略，缩略态向右拖恢复）" onPointerDown={onHandleDown} />
      </aside>
    )
  }

  return (
    <aside className="d2-rescol" style={{ width: ui.width }} aria-label="资源列表">
      <div className="d2-rescol-head">
        <AppIcon app={app} size={24} />
        <span className="d2-rescol-name">{app.name}</span>
        <span className="d2-rescol-kind"><KindBadge kind={app.kind} /></span>
        <span style={{ marginLeft: 'auto' }}><SortButton mode={sortMode} onCycle={cycleMode} /></span>
      </div>
      <div style={{ padding: '0 12px 6px' }}>
        <input
          className="d2-search"
          style={{ width: '100%' }}
          type="search"
          value={resQuery}
          placeholder="搜索组件 / API…"
          aria-label="搜索组件或 API"
          onChange={e => setResQuery(e.target.value)}
        />
      </div>
      <div className="d2-rescol-rows">
        <button
          type="button"
          className={`d2-detail-row${selection.kind === 'detail' ? ' on' : ''}`}
          onClick={() => onSelect({ kind: 'detail' })}
        >
          <span className="d2-di"><icons.info size={13} /></span>
          <span className="d2-lbl">详情</span>
          <span className="d2-hint">应用概览</span>
        </button>

        <section className="d2-resource-group">
          <h3>组件资源 <span className="d2-badge kind">{components.length}</span></h3>
          <div className="d2-resource-list">
            {components.length === 0 ? <div className="d2-resource-row" style={{ color: 'var(--dsw-alias-label-caption, #888)', fontSize: 11.5, cursor: 'default' }}>暂无组件资源</div> : null}
            {sortedComponents.map(c => (
              <button
                type="button"
                key={c.id}
                className={`d2-resource-row${selection.kind === 'component' && selection.rid === c.id ? ' on' : ''}${dragId === c.id ? ' d2-row-dragging' : ''}`}
                onClick={() => onSelect({ kind: 'component', rid: c.id })}
                title="选中后在右侧预览；按住上下拖动调整顺序"
                {...makeRowDragHandlers({
                  id: c.id,
                  getDragId: () => dragId,
                  setDragId,
                  onHover: (drag, target) => {
                    const base = compOrderRef.current.length > 0 ? compOrderRef.current : components.map(x => x.id)
                    setCompOrder(moveBefore(base, drag, target))
                  },
                  onCommit: () => { writeOrder(COMP_ORDER_KEY, compOrderRef.current); commitCustom(sortMode) },
                })}
              >
                <TypeBadge type={c.type} />
                <div className="d2-meta">
                  <div className="d2-name">{c.title}</div>
                  <div className="d2-rid">{c.id}</div>
                </div>
                <RelChips rid={c.id} onJump={rid => onSelect({ kind: 'component', rid })} />
                {pinnedIds.has(c.id) ? <span className="d2-pin-dot" title="已固定到看板"><span className="d2-dot ok" /></span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="d2-resource-group">
          <h3>API 资源 <span className="d2-badge kind">{apis.length}</span></h3>
          <div className="d2-resource-list">
            {apis.length === 0 ? <div className="d2-resource-row" style={{ color: 'var(--dsw-alias-label-caption, #888)', fontSize: 11.5, cursor: 'default' }}>暂无 API 资源</div> : null}
            {sortedApis.map(a => (
              <button
                type="button"
                key={a.id}
                className={`d2-resource-row${selection.kind === 'api' && selection.rid === a.id ? ' on' : ''}${dragId === a.id ? ' d2-row-dragging' : ''}`}
                onClick={() => onSelect({ kind: 'api', rid: a.id })}
                title="选中后在右侧查看详情；按住上下拖动调整顺序"
                {...makeRowDragHandlers({
                  id: a.id,
                  getDragId: () => dragId,
                  setDragId,
                  onHover: (drag, target) => {
                    const base = apiOrderRef.current.length > 0 ? apiOrderRef.current : apis.map(x => x.id)
                    setApiOrder(moveBefore(base, drag, target))
                  },
                  onCommit: () => { writeOrder(API_ORDER_KEY, apiOrderRef.current); commitCustom(sortMode) },
                })}
              >
                <span className={`d2-dot ${a.status}`} />
                <div className="d2-meta">
                  <div className="d2-name"><span className="d2-mono">{a.path}</span></div>
                  <div className="d2-rid">{a.domain} · {a.id}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
      <div className="d2-resize-h" role="separator" aria-orientation="vertical" title="拖动调宽（拖到最左变缩略）" onPointerDown={onHandleDown} />
    </aside>
  )
}

// ---- col3a：详情（原 AppDetail 直搬；组件行可点选进预览；第三方 app 带管理入口） ----

/** 受控管理动作（POST /openloop/app/manage/*；错误以 toast 文案返回） */
function useManageAction(onDone: () => void): { run: (action: 'disconnect' | 'reconnect' | 'delete', appName: string, confirm: string | null) => void; busy: string | null } {
  const [busy, setBusy] = useState<string | null>(null)
  const run = (action: 'disconnect' | 'reconnect' | 'delete', appName: string, confirm: string | null): void => {
    if (busy !== null) return
    // delete 二次确认（同 app-manager 预设语义：第一次点只亮「确认」，3s 复位）
    if (action === 'delete' && confirm !== appName) { onDone(); return }
    setBusy(`${action}:${appName}`)
    const body = action === 'delete' ? { appName } : { serverId: appName }
    void fetch(`/openloop/app/manage/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    })
      .then(async res => {
        const contentType = res.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json() as { ok?: unknown; error?: unknown }
        if (!res.ok || payload.ok !== true) throw new Error(typeof payload.error === 'string' ? payload.error : `HTTP ${res.status}`)
        onDone()
      })
      .catch(() => { /* 静默——详情页不做错误 toast（面板卡有完整态） */ })
      .finally(() => setBusy(null))
  }
  return { run, busy }
}

export interface AppDetailProps {
  app: AppDescriptor
  /** 当前看板页已固定的资源 ID 集合 */
  pinnedIds: ReadonlySet<string>
  onPin: (app: AppDescriptor, component: AppDescriptor['components'][number]) => void
  /** 组件行点选（进入 col3 预览） */
  onSelectComponent?: (component: AppComponentDescriptor) => void
  /** 管理动作完成后的刷新回调（registry 变化重拉） */
  onManaged?: (() => void) | undefined
}

export function AppDetail({ app, pinnedIds, onPin, onSelectComponent, onManaged }: AppDetailProps): ReactNode {
  const [confirming, setConfirming] = useState<string | null>(null)
  useEffect(() => {
    if (confirming === null) return
    const timer = setTimeout(() => setConfirming(null), 3000)
    return () => clearTimeout(timer)
  }, [confirming])
  const manage = useManageAction(() => {
    setConfirming(null)
    onManaged?.()
  })
  const isThirdparty = app.kind === 'thirdparty'
  const isBuiltin = app.kind === 'builtin'

  return (
    <div className="d2-app-detail">
      <header className="d2-app-detail-head">
        <AppIcon app={app} size={36} />
        <div className="d2-title-block">
          <h2>{app.name} <span className="d2-ver">v{app.version}</span></h2>
          <div className="d2-desc">
            {app.desc.trim().length > 0
              ? app.desc
              : <span style={{ opacity: 0.55 }}>暂无描述——让 Agent 经 app_backend upsert_app 补充 description（面向用户的一句话：这个 APP 是什么、给谁用）</span>}
          </div>
        </div>
        <KindBadge kind={app.kind} />
        {/* 管理入口（0.4.0 自管理：第三方=断开/删除；自研=删除；内置=无） */}
        {!isBuiltin ? (
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
            {isThirdparty ? (
              <button type="button" className="d2-ghost-btn" disabled={manage.busy !== null}
                title="断开（热移除工具与连接；保留配置，可重连）"
                onClick={() => manage.run('disconnect', app.id, null)}>断开</button>
            ) : null}
            {confirming === app.id ? (
              <button type="button" className="d2-ghost-btn danger" disabled={manage.busy !== null}
                onClick={() => manage.run('delete', app.id, app.id)}>确认删除？</button>
            ) : (
              <button type="button" className="d2-ghost-btn danger" disabled={manage.busy !== null}
                title="删除（级联清理组件与 API 资源）"
                onClick={() => setConfirming(app.id)}>删除</button>
            )}
          </div>
        ) : null}
      </header>

      <div className="d2-resource-groups">
        <section className="d2-resource-group">
          <h3>组件资源 <span className="d2-badge kind">{app.components.length}</span></h3>
          <div className="d2-resource-list">
            {app.components.map(c => {
              const pinned = pinnedIds.has(c.id)
              return (
                <div
                  className={`d2-resource-row${pinned ? ' pinned' : ''}${onSelectComponent !== undefined ? ' d2-row-selectable' : ''}`}
                  key={c.id}
                  onClick={onSelectComponent !== undefined ? () => onSelectComponent(c) : undefined}
                >
                  <TypeBadge type={c.type} />
                  <div className="d2-meta">
                    <div className="d2-name">{c.title}</div>
                    <div className="d2-rid">{c.id}</div>
                  </div>
                  <span className="d2-rowdesc">{c.desc}</span>
                  {c.pinnable ? (
                    <button
                      type="button"
                      className="d2-ghost-btn d2-pin-btn"
                      title={pinned ? '已在看板' : '固定到看板'}
                      onClick={e => { e.stopPropagation(); onPin(app, c) }}
                    >
                      {pinned ? <icons.check size={13} /> : <icons.pin size={13} />}
                      {pinned ? '已固定' : '固定'}
                    </button>
                  ) : (
                    <span className="d2-pin-locked" title="该组件的 entry 无可渲染面板——让 Agent 经 app_backend 重新注册，entry 内联完整 PanelDefinition（entry: { panel: {...} }），文件路径无效">待生成</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="d2-resource-group">
          <h3>API 资源 <span className="d2-badge kind">{app.apis.length}</span></h3>
          <div className="d2-resource-list">
            {app.apis.map(api => (
              <div className="d2-resource-row" key={api.id}>
                <span className={`d2-dot ${api.status}`} title={api.status === 'ok' ? '已配置' : '需要注意'} />
                <div className="d2-meta">
                  <div className="d2-name"><span className="d2-mono">{api.path}</span></div>
                  <div className="d2-rid">{api.domain} · {api.id}</div>
                </div>
                <span className="d2-rowdesc">{api.summary}</span>
                <span className="d2-badge kind">{api.auth === 'key' ? 'key + 域名' : '无鉴权'}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

// ---- col3b：组件预览（免 pin 选中即看；复用 tile 渲染链） ----

interface ComponentPreviewProps {
  app: AppDescriptor
  comp: AppComponentDescriptor
  pinned: boolean
  onPin: () => void
  tone: AppTone
  /** 相关页面跳转（M4）：选中另一个组件预览 */
  onSelectComponent: (rid: string) => void
}

function ComponentPreview({ app, comp, pinned, onPin, tone, onSelectComponent }: ComponentPreviewProps): ReactNode {
  const source = buildTileSourceForComponent(comp)
  return (
    <div className="d2-detailpane">
      <div className="d2-preview-head">
        <TypeBadge type={comp.type} />
        <div className="d2-meta">
          <div className="d2-name">{comp.title}</div>
          <div className="d2-rid">{comp.id}</div>
        </div>
        <span className="d2-mode-badge d2-badge kind">预览</span>
        {comp.pinnable ? (
          <button type="button" className={`d2-pin-primary${pinned ? ' pinned' : ''}`} onClick={onPin}>
            {pinned ? '✓ 已固定到看板' : '固定到看板'}
          </button>
        ) : (
          <span className="d2-pin-locked">待生成</span>
        )}
      </div>
      <div className="d2-preview-canvas">
        <div className="d2-preview-note">
          <span className={`d2-dot ${tone}`} />
          {tone === 'warn'
            ? 'MCP server 当前不可达——pin 后 tile 会显示可重试错误态（惰性重连自愈）'
            : tone === 'off'
              ? 'MCP server 已关闭'
              : comp.type === 'mcp-app'
                ? `来自 ${app.name} · 渲染时经 refresh 端点取数（沙箱）`
                : `来自 ${app.name} · 宿主车道渲染`}
        </div>
        {source === null ? (
          <div className="d2-empty-note">
            <div style={{ fontSize: 22, opacity: 0.6 }}>🧩</div>
            <div>暂无可渲染内容</div>
            <div className="d2-tcap">让 Agent 经 app_backend 生成内容后重新注册</div>
          </div>
        ) : (
          <div className="d2-frame">
            <div className="d2-frame-bar">
              <span className="d2-fdots"><i></i><i></i><i></i></span>
              <span>{source.kind === 'mcp-app' ? 'opaque-origin 沙箱 · AppBridge' : 'panel 宿主车道'}</span>
            </div>
            <div className="d2-frame-body">
              {source.kind === 'panel' ? <PanelPreviewBody meta={source.meta} /> : null}
              {source.kind === 'mcp-app' ? <McpAppPreviewBody comp={comp} /> : null}
              {source.kind === 'artifact' ? <ArtifactPreviewBody meta={source.meta} /> : null}
            </div>
          </div>
        )}
        {/* 联动 v1（M4）：页面关系双语表 → 关联预览（可交互）→ 相关页面跳转（原型对齐） */}
        <RelDeclSection rid={comp.id} />
        <RelTryIt rid={comp.id} />
        <RelatedPages rid={comp.id} onJump={onSelectComponent} />
      </div>
    </div>
  )
}

function PanelPreviewBody({ meta }: { meta: unknown }): ReactNode {
  const panels = getPanelsClient()
  if (panels === undefined) return <DependencyMissing what="APP 组件预览" dep="@openloop/dsh-panels" />
  const PanelSurface = panels.PanelSurface
  return <PanelSurface meta={meta as never} />
}

/** artifact 预览（0.5.2 few-shot 库）：复用 tile 渲染链的 ArtifactFrame */
function ArtifactPreviewBody({ meta }: { meta: unknown }): ReactNode {
  const artifact = getArtifactClient()
  if (artifact === undefined) return <DependencyMissing what="APP Artifact 预览" dep="@openloop/dsh-html-artifact" />
  const ArtifactFrame = artifact.ArtifactFrame
  return <ArtifactFrame meta={meta as never} token="app-artifact-preview" fullscreen={false} scope={getScope()} />
}

function McpAppPreviewBody({ comp }: { comp: AppComponentDescriptor }): ReactNode {
  const mcpApps = getMcpAppsClient()
  if (mcpApps === undefined) return <DependencyMissing what="APP MCP 组件预览" dep="@openloop/dsh-mcp" />
  const McpAppResourceView = mcpApps.McpAppResourceView
  const reference = buildTileSourceForComponent(comp)
  if (reference === null || reference.kind !== 'mcp-app') {
    return <div className="d2-empty-note">MCP App 引用形态无效</div>
  }
  return (
    <McpAppResourceView
      serverId={reference.meta.serverId}
      toolName={reference.meta.toolName}
      resourceUri={reference.meta.resourceUri}
      title={comp.title}
      frameId={`app-preview-${comp.id}`}
    />
  )
}

// ---- col3c：API 详情 ----

interface ApiDetailProps {
  app: AppDescriptor
  api: AppDescriptor['apis'][number]
}

function ApiDetail({ app, api }: ApiDetailProps): ReactNode {
  return (
    <div className="d2-detailpane">
      <div className="d2-preview-head">
        <span className={`d2-dot ${api.status}`} />
        <div className="d2-meta">
          <div className="d2-name"><span className="d2-mono">{api.path}</span></div>
          <div className="d2-rid">{api.id}</div>
        </div>
        <span className="d2-mode-badge d2-badge kind">API 详情</span>
      </div>
      <div className="d2-preview-canvas">
        <div className="d2-preview-note">凭据只写不读——此处仅显示配置状态；key 经 set_api_key 服务端存储，任何途径不可取回。</div>
        <div className="d2-api-card">
          <div className="d2-api-row"><div className="d2-k">归属 APP</div><div className="d2-v plain">{app.name}</div></div>
          <div className="d2-api-row"><div className="d2-k">域名</div><div className="d2-v">{api.domain}</div></div>
          <div className="d2-api-row"><div className="d2-k">路径</div><div className="d2-v">{api.path}</div></div>
          <div className="d2-api-row"><div className="d2-k">鉴权</div><div className="d2-v plain">{api.auth === 'key' ? 'API Key（服务端注入，widget 绑定调用时自动带上）' : '无'}</div></div>
          <div className="d2-api-row"><div className="d2-k">配置状态</div><div className="d2-v plain"><span className={`d2-status-pill ${api.status}`}>{api.status === 'ok' ? '● 已配置' : '● 未配置 key'}</span></div></div>
          <div className="d2-api-row"><div className="d2-k">说明</div><div className="d2-v plain">{api.summary}</div></div>
        </div>
      </div>
    </div>
  )
}

// ---- 三列组装（APP tab 顶层） ----

export interface AppsTabProps {
  apps: AppDescriptor[]
  selectedAppId: string | null
  onOpenApp: (id: string) => void
  pinnedIds: ReadonlySet<string>
  onPin: (app: AppDescriptor, component: AppDescriptor['components'][number]) => void
  /** 管理动作（断开/删除）后刷新 registry */
  onManaged?: () => void
}

export function AppsTab({ apps, selectedAppId, onOpenApp, pinnedIds, onPin, onManaged }: AppsTabProps): ReactNode {
  const mcpStates = useMcpServerStates()
  const [selection, setSelection] = useState<ResourceSelection>({ kind: 'detail' })
  const app = apps.find(a => a.id === selectedAppId) ?? apps[0]
  // 切 APP 重置选择（回到「详情」）
  const appId = app?.id
  useEffect(() => { setSelection({ kind: 'detail' }) }, [appId])

  if (app === undefined) {
    return (
      <div className="d2-empty-note" style={{ margin: 'auto' }}>
        <div style={{ fontSize: 22, opacity: 0.6 }}>🧩</div>
        <div>暂无 APP</div>
      </div>
    )
  }

  const toneOf = (a: AppDescriptor): AppTone => toneOfApp(a, mcpStates)
  const selectedComp = selection.kind === 'component' ? app.components.find(c => c.id === selection.rid) : undefined
  const selectedApi = selection.kind === 'api' ? app.apis.find(a => a.id === selection.rid) : undefined

  return (
    <section className="d2-apps" data-screen-label="apps">
      <AppListPanel apps={apps} selectedAppId={app.id} onSelect={onOpenApp} toneOf={toneOf} />
      <AppResourceList app={app} selection={selection} onSelect={setSelection} pinnedIds={pinnedIds} />
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
        {selection.kind === 'detail' ? (
          <AppDetail app={app} pinnedIds={pinnedIds} onPin={onPin} onSelectComponent={c => setSelection({ kind: 'component', rid: c.id })} onManaged={onManaged} />
        ) : null}
        {selection.kind === 'component' && selectedComp !== undefined ? (
          <ComponentPreview app={app} comp={selectedComp} pinned={pinnedIds.has(selectedComp.id)} onPin={() => onPin(app, selectedComp)} tone={toneOf(app)} onSelectComponent={rid => setSelection({ kind: 'component', rid })} />
        ) : null}
        {selection.kind === 'api' && selectedApi !== undefined ? (
          <ApiDetail app={app} api={selectedApi} />
        ) : null}
        {(selection.kind === 'component' && selectedComp === undefined) || (selection.kind === 'api' && selectedApi === undefined) ? (
          <div className="d2-empty-note" style={{ margin: 'auto' }}>该资源已不存在（可能被移除）——<button type="button" className="d2-ghost-btn" onClick={() => setSelection({ kind: 'detail' })}>回详情</button></div>
        ) : null}
      </div>
    </section>
  )
}
