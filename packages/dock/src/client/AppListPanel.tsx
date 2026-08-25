/**
 * APP tab：左侧 AppListPanel 侧栏 + 右侧 AppDetail 详情（原型 direction-a.jsx
 * apps 段直搬 + TS 化，类名 d2- 前缀，样式见 v2-styles.ts）。
 *
 * - 侧栏三交互（M2 验收点）：拖宽（190–420，连续值）/ 收起（48px 图标条）/ 列表↔卡片视图
 * - UI 态持久化 openloop.dock.app-panel.v1：{ width, collapsed, view }（不进 dockStore）
 * - 详情：组件资源（pin 到当前看板页）/ API 资源（状态点 + 鉴权徽章）
 * - pin = 以示例 props 建一个面板实例（app-registry.buildPanelMetaForComponent），
 *   pin 后由父层跳回看板 tab（验收点：pin 后 tile 出现）
 */
import { useState, type PointerEvent, type ReactNode } from 'react'
import type { AppDescriptor } from './app-registry.ts'
import { AppIcon, KindBadge, TypeBadge } from './badges.tsx'
import { icons } from './icons.tsx'
import { dragResize } from './drag-resize.ts'

const PANEL_UI_KEY = 'openloop.dock.app-panel.v1'
const DEFAULT_WIDTH = 230
const MIN_WIDTH = 190
const MAX_WIDTH = 420

interface AppPanelUiState {
  width: number
  collapsed: boolean
  view: 'card' | 'list'
}

function readPanelUi(): AppPanelUiState {
  try {
    const raw = localStorage.getItem(PANEL_UI_KEY)
    if (raw === null) return { width: DEFAULT_WIDTH, collapsed: false, view: 'card' }
    const p = JSON.parse(raw) as Partial<AppPanelUiState>
    const width = typeof p.width === 'number' ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(p.width))) : DEFAULT_WIDTH
    return {
      width,
      collapsed: p.collapsed === true,
      view: p.view === 'list' ? 'list' : 'card',
    }
  } catch {
    return { width: DEFAULT_WIDTH, collapsed: false, view: 'card' }
  }
}

function writePanelUi(state: AppPanelUiState): void {
  try { localStorage.setItem(PANEL_UI_KEY, JSON.stringify(state)) } catch { /* ignore */ }
}

export interface AppListPanelProps {
  apps: AppDescriptor[]
  selectedAppId: string | null
  onSelect: (id: string) => void
}

export function AppListPanel({ apps, selectedAppId, onSelect }: AppListPanelProps): ReactNode {
  const [ui, setUi] = useState<AppPanelUiState>(readPanelUi)
  const [query, setQuery] = useState('')
  const [dragging, setDragging] = useState(false)

  const update = (patch: Partial<AppPanelUiState>): void => {
    const next = { ...ui, ...patch }
    setUi(next)
    writePanelUi(next)
  }

  const filtered = query.trim() === ''
    ? apps
    : apps.filter(a => a.name.toLowerCase().includes(query.trim().toLowerCase()))

  const onHandleDown = (e: PointerEvent<HTMLDivElement>): void => {
    setDragging(true)
    // 拖动中只写内存 state（无吸附，连续值）；松手才持久化（手感纪律同 rail）
    dragResize(
      e, ui.width, MIN_WIDTH, MAX_WIDTH,
      w => setUi(u => ({ ...u, width: w })),
      w => {
        setDragging(false)
        // view/collapsed 取拖动开始时的快照（拖宽不会改它们），宽度取松手终值
        const next = { ...ui, width: Math.round(w) }
        setUi(next)
        writePanelUi(next)
      },
    )
  }

  return (
    <aside
      className={`d2-app-list${ui.collapsed ? ' collapsed' : ''}${dragging ? ' d2-dragging' : ''}`}
      style={ui.collapsed ? undefined : { width: ui.width }}
    >
      {ui.collapsed ? (
        <>
          <div className="d2-list-head">
            <button type="button" className="d2-collapse-btn" title="展开 APP 列表" onClick={() => update({ collapsed: false })}>
              <icons.chevronR size={14} />
            </button>
          </div>
          <div className="d2-rows">
            {apps.map(a => (
              <button
                type="button"
                key={a.id}
                className={`d2-app-mini${a.id === selectedAppId ? ' on' : ''}`}
                title={a.name}
                onClick={() => { onSelect(a.id); update({ collapsed: false }) }}
              >
                <AppIcon app={a} size={22} />
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="d2-list-head">
            <div className="d2-search-input">
              <icons.search size={13} />
              <input
                placeholder="搜索 APP"
                aria-label="搜索 APP"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="d2-view-seg" role="group" aria-label="列表视图切换">
              <button type="button" className={ui.view === 'list' ? 'on' : ''} title="列表视图" onClick={() => update({ view: 'list' })}><icons.list size={13} /></button>
              <button type="button" className={ui.view === 'card' ? 'on' : ''} title="卡片视图" onClick={() => update({ view: 'card' })}><icons.grid size={13} /></button>
            </div>
            <button type="button" className="d2-collapse-btn" title="收起" onClick={() => update({ collapsed: true })}><icons.chevronL size={14} /></button>
          </div>
          <div className="d2-rows">
            {filtered.map(a => (
              <button
                type="button"
                key={a.id}
                className={`d2-app-row${ui.view === 'list' ? ' compact' : ''}${a.id === selectedAppId ? ' on' : ''}`}
                onClick={() => onSelect(a.id)}
              >
                <AppIcon app={a} />
                <span className="d2-meta">
                  <span className="d2-name">{a.name}</span>
                  <span className="d2-sub">{a.components.length} 组件 · {a.apis.length} API</span>
                </span>
                <KindBadge kind={a.kind} />
              </button>
            ))}
            {filtered.length === 0 ? <div className="d2-app-empty">无匹配 APP</div> : null}
          </div>
          <div
            className="d2-resize-h"
            role="separator"
            aria-orientation="vertical"
            aria-label="调整 APP 列表宽度"
            title="拖动调整宽度"
            onPointerDown={onHandleDown}
          />
        </>
      )}
    </aside>
  )
}

export interface AppDetailProps {
  app: AppDescriptor
  /** 当前看板页已固定的资源 ID 集合（`openloop:<kind>`） */
  pinnedIds: ReadonlySet<string>
  onPin: (app: AppDescriptor, component: AppDescriptor['components'][number]) => void
}

export function AppDetail({ app, pinnedIds, onPin }: AppDetailProps): ReactNode {
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
                <div className={`d2-resource-row${pinned ? ' pinned' : ''}`} key={c.id}>
                  <TypeBadge type={c.type} />
                  <div className="d2-meta">
                    <div className="d2-name">{c.title}</div>
                    <div className="d2-rid">{c.id}</div>
                  </div>
                  <span className="d2-rowdesc">{c.desc}</span>
                  <button
                    type="button"
                    className="d2-ghost-btn d2-pin-btn"
                    title={pinned ? '已在看板' : '固定到看板'}
                    onClick={() => onPin(app, c)}
                  >
                    {pinned ? <icons.check size={13} /> : <icons.pin size={13} />}
                    {pinned ? '已固定' : '固定'}
                  </button>
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
