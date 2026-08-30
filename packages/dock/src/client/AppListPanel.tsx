/**
 * APP tab 三列结构（0.8.0 三列重构，2026-08-30；原型 designs/dock-app-redesign 已批准）：
 * - col1 AppListPanel：富状态 APP 行（图标/名称/资源计数/来源徽标/连接状态点）
 * - col2 AppResourceList：选中 APP 的资源列表（顶部默认「详情」行 + 组件/API 分组）
 * - col3 AppDetailPane：详情（原 AppDetail 直搬）/ 组件预览（免 pin 选中即看）/ API 详情
 *
 * 旧版（rail APP 分区 + 230px 侧栏 + 详情两列）废止：APP 入口收敛到 col1，
 * rail 只留看板页；预览复用 tile 渲染链（PanelSurface / McpAppResourceView）。
 */
import { useEffect, useState, type PointerEvent, type ReactNode } from 'react'
import type { AppDescriptor, AppComponentDescriptor } from './app-registry.ts'
import { buildTileSourceForComponent } from './app-registry.ts'
import { AppIcon, KindBadge, TypeBadge } from './badges.tsx'
import { icons } from './icons.tsx'
import { DependencyMissing } from './base-bridge.tsx'
import { getPanelsClient, getMcpAppsClient } from './openloop-clients.ts'
import { dragResize } from './drag-resize.ts'

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

/** col1/col2 共用的缩略+拖宽 hook（UI 态持久化 localStorage） */
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
      w => setUi(u => ({ ...u, width: w })),
      w => {
        // 松手吸附：<120px → 缩略图标条（width 保持展开值备还原）；≥120 → 展开态持久化
        if (w < COL_COLLAPSE_THRESHOLD) update({ collapsed: true })
        else update({ collapsed: false, width: Math.max(COL_MIN_EXPANDED, Math.round(w)) })
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
        <span className="d2-tcap">{apps.length}</span>
      </div>
      <div className="d2-rows">
        {apps.map(a => {
          const tone = toneOf(a)
          return (
            <button
              type="button"
              key={a.id}
              className={`d2-app-row${a.id === selectedAppId ? ' on' : ''}`}
              onClick={() => onSelect(a.id)}
              title={tone === 'warn' ? 'MCP server 不可达（惰性重连中）' : tone === 'off' ? 'MCP server 已关闭' : undefined}
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
          <h3>组件资源 <span className="d2-badge kind">{app.components.length}</span></h3>
          <div className="d2-resource-list">
            {app.components.length === 0 ? <div className="d2-resource-row" style={{ color: 'var(--dsw-alias-label-caption, #888)', fontSize: 11.5, cursor: 'default' }}>暂无组件资源</div> : null}
            {app.components.map(c => (
              <button
                type="button"
                key={c.id}
                className={`d2-resource-row${selection.kind === 'component' && selection.rid === c.id ? ' on' : ''}`}
                onClick={() => onSelect({ kind: 'component', rid: c.id })}
                title="选中后在右侧预览"
              >
                <TypeBadge type={c.type} />
                <div className="d2-meta">
                  <div className="d2-name">{c.title}</div>
                  <div className="d2-rid">{c.id}</div>
                </div>
                {pinnedIds.has(c.id) ? <span className="d2-pin-dot" title="已固定到看板"><span className="d2-dot ok" /></span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="d2-resource-group">
          <h3>API 资源 <span className="d2-badge kind">{app.apis.length}</span></h3>
          <div className="d2-resource-list">
            {app.apis.length === 0 ? <div className="d2-resource-row" style={{ color: 'var(--dsw-alias-label-caption, #888)', fontSize: 11.5, cursor: 'default' }}>暂无 API 资源</div> : null}
            {app.apis.map(a => (
              <button
                type="button"
                key={a.id}
                className={`d2-resource-row${selection.kind === 'api' && selection.rid === a.id ? ' on' : ''}`}
                onClick={() => onSelect({ kind: 'api', rid: a.id })}
                title="选中后在右侧查看详情"
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

// ---- col3a：详情（原 AppDetail 直搬；组件行可点选进预览） ----

export interface AppDetailProps {
  app: AppDescriptor
  /** 当前看板页已固定的资源 ID 集合 */
  pinnedIds: ReadonlySet<string>
  onPin: (app: AppDescriptor, component: AppDescriptor['components'][number]) => void
  /** 组件行点选（进入 col3 预览） */
  onSelectComponent?: (component: AppComponentDescriptor) => void
}

export function AppDetail({ app, pinnedIds, onPin, onSelectComponent }: AppDetailProps): ReactNode {
  return (
    <div className="d2-app-detail">
      <header className="d2-app-detail-head">
        <AppIcon app={app} size={36} />
        <div className="d2-title-block">
          <h2>{app.name} <span className="d2-ver">v{app.version}</span></h2>
          <div className="d2-desc">{app.desc}</div>
        </div>
        <KindBadge kind={app.kind} />
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
}

function ComponentPreview({ app, comp, pinned, onPin, tone }: ComponentPreviewProps): ReactNode {
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
            </div>
          </div>
        )}
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
}

export function AppsTab({ apps, selectedAppId, onOpenApp, pinnedIds, onPin }: AppsTabProps): ReactNode {
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
          <AppDetail app={app} pinnedIds={pinnedIds} onPin={onPin} onSelectComponent={c => setSelection({ kind: 'component', rid: c.id })} />
        ) : null}
        {selection.kind === 'component' && selectedComp !== undefined ? (
          <ComponentPreview app={app} comp={selectedComp} pinned={pinnedIds.has(selectedComp.id)} onPin={() => onPin(app, selectedComp)} tone={toneOf(app)} />
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
