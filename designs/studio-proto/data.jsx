/**
 * Studio 原型 · mock 数据 + 共享渲染件（panels 预设语法的高保真 mock）。
 * 渲染语法对齐 packages/panels/src/presets 真实实现：panel 卡 / 字阶 / tone / tabular-nums。
 */

// ---------------- 数据（跨场景一致） ----------------

const PLATFORMS = ['视频号', 'B站', '小红书', '公众号']

const IDEAS = [
  { id: 'i1', title: 'Claude Code 隐藏功能 Top10', tags: ['AI', '工具'], heat: 92, status: '采中', created: '09-01', source: '社群讨论' },
  { id: 'i2', title: '我用 DSH 搭了个工作室（本系统）', tags: ['AI', '产品'], heat: 88, status: '采中', created: '09-02', source: '自我复盘' },
  { id: 'i3', title: '30 天 AI 工具挑战', tags: ['AI', '挑战'], heat: 76, status: '采中', created: '08-30', source: '粉丝提议' },
  { id: 'i4', title: 'Cursor vs CodeBuddy 实测', tags: ['AI', '工具'], heat: 64, status: '候选', created: '09-03', source: '竞品观察' },
  { id: 'i5', title: '一人公司内容管线复盘', tags: ['产品', '复盘'], heat: 58, status: '候选', created: '09-03', source: '自我复盘' },
  { id: 'i6', title: 'MCP 协议三分钟讲透', tags: ['AI', '科普'], heat: 51, status: '候选', created: '09-04', source: '评论区提问' },
  { id: 'i7', title: '内容创作者的自动化栈', tags: ['工具', '自动化'], heat: 44, status: '搁置', created: '08-25', source: '自我复盘' },
  { id: 'i8', title: '2026 上半年 AI 视频工具横评', tags: ['AI', '视频'], heat: 39, status: '候选', created: '09-04', source: '社群讨论' },
  { id: 'i9', title: '播客化尝试：双人对谈 AI 圈', tags: ['播客', '实验'], heat: 12, status: '归档', created: '08-10', source: '头脑风暴' },
]

/** 想法状态机：候选 → 采中 → 立项（转稿件）/ 搁置 → 归档；搁置可复活回候选 */
const IDEA_FILTERS = ['全部', '采中', '候选', '搁置', '归档']
const IDEA_STATUS_TONE = { '采中': 'primary', '候选': 'neutral', '搁置': 'warning', '归档': 'neutral' }

const DRAFTS = [
  { id: 'd1', ideaId: 'i1', title: 'Claude Code 隐藏功能 Top10（视频）', stage: '制作中', platform: 'B站', due: '09-08', owner: '阿洛' },
  { id: 'd2', ideaId: 'i2', title: '我用 DSH 搭了个工作室', stage: '审核中', platform: '视频号', due: '09-07', owner: '阿洛' },
  { id: 'd3', ideaId: 'i3', title: '30 天挑战 · Day 1-7 合集', stage: '排期中', platform: '小红书', due: '09-10', owner: '阿洛' },
  { id: 'd4', ideaId: 'i1', title: 'Claude Code Top10（图文版）', stage: '排期中', platform: '公众号', due: '09-09', owner: '阿洛' },
  { id: 'd5', ideaId: 'i3', title: '30 天挑战 · 预告片', stage: '已发布', platform: 'B站', due: '09-03', owner: '阿洛' },
  { id: 'd6', ideaId: 'i2', title: '工作室搭建日志 #1', stage: '已发布', platform: '公众号', due: '09-04', owner: '阿洛' },
]

/** 管线阶段：count 之外必须有 aging/top —— 否则管线只是美化版计数器（用户 2026-09-05 指正） */
const STAGES = [
  { key: 'backlog', label: '想法池', tone: 'neutral', count: 5, aging: null, top: ['Cursor vs CodeBuddy 实测', 'MCP 协议三分钟讲透'] },
  { key: 'doing', label: '制作中', tone: 'info', count: 1, aging: '1.5 天', top: ['Claude Code 隐藏功能 Top10'] },
  { key: 'review', label: '审核中', tone: 'warning', count: 1, aging: '3.2 天', stuck: true, top: ['我用 DSH 搭了个工作室'] },
  { key: 'scheduled', label: '排期中', tone: 'primary', count: 2, aging: '0.8 天', top: ['30 天挑战 · Day 1-7 合集', 'Top10 图文版'] },
  { key: 'published', label: '已发布', tone: 'success', count: 2, aging: null, top: ['30 天挑战 · 预告片', '工作室搭建日志 #1'] },
]

const CALENDAR = [
  { day: '09-07', dow: '日', title: '我用 DSH 搭了个工作室', platform: '视频号', draftId: 'd2', hot: true },
  { day: '09-08', dow: '一', title: 'Claude Code 隐藏功能 Top10', platform: 'B站', draftId: 'd1', hot: true },
  { day: '09-09', dow: '二', title: 'Claude Code Top10（图文版）', platform: '公众号', draftId: 'd4', hot: false },
  { day: '09-10', dow: '三', title: '30 天挑战 · Day 1-7 合集', platform: '小红书', draftId: 'd3', hot: false },
  { day: '09-12', dow: '五', title: '30 天挑战 · 中场快报', platform: '视频号', draftId: null, hot: false },
  { day: '09-13', dow: '六', title: '周报：本周 AI 工具圈', platform: '公众号', draftId: null, hot: false },
]

const ASSETS = [
  { id: 'a1', name: 'cover-claude-top10.png', kind: '封面图', size: '1.2 MB', usedBy: 'd1 · d4', updated: '09-04' },
  { id: 'a2', name: 'studio-screenshot-01.png', kind: '截图', size: '2.4 MB', usedBy: 'd2', updated: '09-05' },
  { id: 'a3', name: 'broll-ai-tools.mp4', kind: '素材视频', size: '48 MB', usedBy: 'i3', updated: '09-02' },
  { id: 'a4', name: 'intro-music-v3.mp3', kind: '片头音乐', size: '3.1 MB', usedBy: '通用', updated: '08-28' },
  { id: 'a5', name: 'script-dsh-studio.md', kind: '脚本', size: '18 KB', usedBy: 'd2', updated: '09-05' },
  { id: 'a6', name: 'cover-30day.png', kind: '封面图', size: '0.9 MB', usedBy: 'd3', updated: '09-01' },
  { id: 'a7', name: 'logo-pack.zip', kind: '品牌素材', size: '5.6 MB', usedBy: '通用', updated: '08-20' },
  { id: 'a8', name: 'voiceover-draft.wav', kind: '配音粗剪', size: '12 MB', usedBy: 'd1', updated: '09-04' },
]

const EVENTS = [
  { ts: '14:32:18', kind: 'write', msg: 'studio/drafts · d2 stage → 审核中', src: 'panel:pipeline' },
  { ts: '14:31:02', kind: 'read', msg: 'studio/ideas?heat>50 · 数据绑定注入', src: 'panel:idea-bank' },
  { ts: '14:28:44', kind: 'pin', msg: 'studio:idea-bank → 看板「工作室驾驶舱」', src: 'dock' },
  { ts: '14:22:10', kind: 'write', msg: 'studio/assets · a5 created', src: 'agent' },
  { ts: '14:15:37', kind: 'read', msg: 'studio/calendar?week=37', src: 'panel:calendar' },
  { ts: '14:09:55', kind: 'mcp', msg: 'connect excalidraw · 注册 4 个工具', src: 'mcp-runtime' },
  { ts: '13:58:21', kind: 'write', msg: 'studio/drafts · d5 stage → 已发布', src: 'panel:pipeline' },
  { ts: '13:44:02', kind: 'api', msg: 'GET /openloop/app/boards · 200 · 12ms', src: 'dock' },
  { ts: '13:40:19', kind: 'write', msg: 'studio/ideas · i2 heat 84 → 88', src: 'agent' },
  { ts: '13:32:47', kind: 'api', msg: 'POST /mcp-app/refresh · excalidraw · 200', src: 'mcp-apps' },
]

const API_USAGE = [
  { route: '/openloop/app/*', count: 128, pct: 100 },
  { route: '/panels/data', count: 96, pct: 75 },
  { route: '/mcp-app/refresh', count: 24, pct: 19 },
  { route: '/mcp-app/call/*', count: 7, pct: 5 },
]

const REL_DECLS = [
  { from: 'studio:idea-bank', dir: 'out', ev: 'studio:idea:open', to: 'studio:draft-list · studio:idea-detail', tpl: '{{ideaId}}' },
  { from: 'studio:draft-list', dir: 'out', ev: 'studio:draft:open', to: 'studio:draft-detail · studio:calendar', tpl: '{{draftId}}' },
  { from: 'studio:pipeline-flow', dir: 'out', ev: 'studio:stage:open', to: 'studio:draft-list', tpl: '{{stage}}' },
  { from: 'studio:calendar', dir: 'out', ev: 'studio:day:open', to: 'studio:draft-list', tpl: '{{date}}' },
  { from: 'studio:asset-table', dir: 'out', ev: 'studio:asset:open', to: 'studio:draft-detail', tpl: '{{assetId}}' },
  { from: 'studio:draft-list', dir: 'in', ev: 'studio:idea:open · studio:stage:open · studio:day:open', to: '（多消费方聚合）', tpl: '—' },
  { from: 'studio:idea-detail', dir: 'in', ev: 'studio:idea:open', to: '（详情即消费方）', tpl: '{{ideaId}}' },
  { from: 'studio:idea-detail', dir: 'out', ev: 'studio:idea:promote', to: 'studio:draft-list（立项 → 建稿件）', tpl: '{{ideaId}}' },
  { from: 'studio:idea-detail', dir: 'out', ev: 'studio:idea:edit', to: 'studio:idea-edit（独立编辑组件 · 浮窗打开）', tpl: '{{ideaId}}' },
  { from: 'studio:idea-edit', dir: 'out', ev: 'studio:idea:updated', to: 'studio:idea-detail · studio:idea-bank（刷新）', tpl: '{{ideaId}}' },
  { from: 'studio:idea-create', dir: 'out', ev: 'studio:idea:created', to: 'studio:idea-bank（刷新）', tpl: '—' },
  { from: 'studio:draft-detail', dir: 'in', ev: 'studio:draft:open · studio:asset:open', to: '（多消费方聚合）', tpl: '—' },
]

const STUDIO_RESOURCES = [
  { rid: 'studio:idea-bank', name: '想法库', kind: 'panel', desc: 'data-table 预设 · 数据绑定 ideas · 状态筛选', emits: 'studio:idea:open' },
  { rid: 'studio:idea-detail', name: '想法详情', kind: 'panel', desc: '组合模式 · detail-grid + 关联稿件 + 状态时间线', emits: 'studio:idea:promote' },
  { rid: 'studio:draft-detail', name: '稿件详情', kind: 'panel', desc: '组合模式 · detail-grid + 素材引用 + 阶段流转', emits: null },
  { rid: 'studio:pipeline-flow', name: '创作管线', kind: 'panel', desc: 'flow 预设 · 五阶段状态机', emits: 'studio:stage:open' },
  { rid: 'studio:draft-list', name: '稿件列表', kind: 'panel', desc: 'data-table 预设 · 多消费方聚合', emits: 'studio:draft:open' },
  { rid: 'studio:calendar', name: '排期日历', kind: 'panel', desc: 'timeline 预设 · 本周排期', emits: 'studio:day:open' },
  { rid: 'studio:asset-table', name: '素材库', kind: 'panel', desc: 'data-table 预设 · 搜索栏', emits: 'studio:asset:open' },
  { rid: 'studio:methodology', name: '创作方法论', kind: 'panel', desc: 'markdown 预设 · 静态文档', emits: null },
  { rid: 'studio:system-map', name: '系统地图', kind: 'artifact', desc: 'network 档 · 导航中枢 + 健康状态 + Agent 说明书', emits: null },
  { rid: 'studio:idea-create', name: '新建想法', kind: 'panel', desc: 'form 预设族 · 校验 fail-closed', emits: 'studio:idea:created' },
  { rid: 'studio:idea-edit', name: '编辑想法', kind: 'panel', desc: 'form 预设族 · 独立编辑组件，consumes idea:edit', emits: 'studio:idea:updated' },
  { rid: 'studio:draft-edit', name: '编辑稿件', kind: 'panel', desc: 'form 预设族 · 独立编辑组件，consumes draft:edit', emits: 'studio:draft:updated' },
]

/** API 资源（10 个）：5 集合 CRUD + 2 配置查询 + 2 聚合 + 1 动作——每个组件的数据绑定都能指到具体一个 */
const STUDIO_APIS = [
  { rid: 'studio:ideas', path: '/openloop/app/collections/ideas/records', method: 'GET · POST', desc: '?status=&tag=&heat_gte= · idea-bank / idea-detail 数据源' },
  { rid: 'studio:drafts', path: '/openloop/app/collections/drafts/records', method: 'GET · POST', desc: '?ideaId=&stage=&date= · relations 三参数取数通道' },
  { rid: 'studio:assets', path: '/openloop/app/collections/assets/records', method: 'GET · POST', desc: '?q=&kind= · 素材搜索栏的后端' },
  { rid: 'studio:calendar', path: '/openloop/app/collections/calendar/records', method: 'GET · POST', desc: '?week= · POST = 改期写操作' },
  { rid: 'studio:events', path: '/openloop/app/events', method: 'GET', desc: '只读 · 系统自写 · event-log 数据源' },
  { rid: 'studio:tags', path: '/openloop/app/studio/tags', method: 'GET', desc: '标签聚合 · 筛选 chips 与表单 options 数据源' },
  { rid: 'studio:platforms', path: '/openloop/app/studio/platforms', method: 'GET', desc: '平台配置 · 表单 select options 数据源' },
  { rid: 'studio:pipeline-stats', path: '/openloop/app/studio/pipeline-stats', method: 'GET', desc: '阶段计数 + 滞留聚合 · 管线瓶颈监测数据源' },
  { rid: 'studio:overview', path: '/openloop/app/studio/overview', method: 'GET', desc: '本周概览聚合 · metric-grid 数据源' },
  { rid: 'studio:idea-actions', path: '/openloop/app/studio/ideas/:id/action', method: 'POST', desc: 'pick / hold / revive / archive / promote / bulk · 状态流转与批量' },
]

// ---------------- 共享渲染件（panels 预设语法 mock） ----------------

function PanelShell({ preset, title, desc, children, fill }) {
  return (
    <div className="ol-panel" data-openloop-preset={preset} style={fill ? { height: '100%' } : undefined}>
      {(title || preset) && (
        <div className="ol-panel-head" style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            {title ? <div className="ol-panel-title">{title}</div> : null}
            {desc ? <div className="ol-panel-desc">{desc}</div> : null}
          </div>
          {preset ? <span className="preset-chip" style={{ marginLeft: 'auto' }}>{preset}</span> : null}
        </div>
      )}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{children}</div>
    </div>
  )
}

function ToneBadge({ tone, children }) {
  return <span className={`tone-badge ${tone}`}>{children}</span>
}

function TagList({ tags }) {
  return (
    <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
      {tags.map((t) => <span key={t} className="ol-tag">{t}</span>)}
    </span>
  )
}

/** data-table 预设 mock：columns [{key,label,num?,render?}] */
function DataTableMock({ columns, rows, rowKey, selKey, onSelect, compact }) {
  return (
    <table className="ol-table" style={compact ? { fontSize: 11 } : undefined}>
      <thead>
        <tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row[rowKey]}
            className={selKey === row[rowKey] ? 'sel' : ''}
            onClick={() => onSelect && onSelect(row)}
          >
            {columns.map((c) => (
              <td key={c.key} className={c.num ? 'num' : ''}>
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** heatmap 预设 mock：行=标签，列=周 */
function HeatmapMock({ title, rowLabels, colLabels, matrix }) {
  const flat = matrix.flat()
  const min = Math.min(...flat)
  const max = Math.max(...flat)
  const extent = max - min
  return (
    <div className="ol-body" style={{ paddingTop: 12 }}>
      <table className="ol-heat">
        <thead>
          <tr>
            <th aria-hidden="true"></th>
            {colLabels.map((c) => <th key={c} className="col">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, ri) => (
            <tr key={ri}>
              <th>{rowLabels[ri]}</th>
              {row.map((v, ci) => {
                const step = Math.max(1, Math.min(5, Math.ceil((extent > 0 ? (v - min) / extent : 0.5) * 5)))
                return <td key={ci} className={`s${step}`} title={`${rowLabels[ri]} · ${colLabels[ci]}: ${v}`}>{v}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** flow 预设 mock：节点卡 + 序号圆 + 竖线 connector */
function FlowMock({ nodes, selKey, onSelect }) {
  return (
    <div className="ol-body ol-flow">
      {nodes.map((n, i) => (
        <React.Fragment key={n.key}>
          {i > 0 ? <div className="ol-flow-conn">{n.edgeLabel || ''}</div> : null}
          <div className={`ol-flow-node ${selKey === n.key ? 'sel' : ''}`} onClick={() => onSelect && onSelect(n)}>
            <span className={`ol-flow-badge tone-badge ${n.tone}`} style={{ padding: 0 }}>{n.count}</span>
            <div>
              <div className="ol-flow-label">
                {n.label}
                {n.badge ? <ToneBadge tone={n.tone}>{n.badge}</ToneBadge> : null}
              </div>
              <div className="ol-flow-detail">{n.detail}</div>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  )
}

/** timeline 预设 mock */
function TimelineMock({ items, onSelect }) {
  return (
    <ol className="ol-tl ol-body" style={{ paddingTop: 12 }}>
      {items.map((it) => (
        <li key={it.key || it.time + it.title} className="ol-tl-item" onClick={() => onSelect && onSelect(it)} style={onSelect ? { cursor: 'pointer' } : undefined}>
          <div className="ol-tl-time">{it.time}</div>
          <div className="ol-tl-rail"><span className={`ol-tl-dot ${it.status || ''}`}></span></div>
          <div className="ol-tl-content">
            <div className="ol-tl-title">{it.title}</div>
            {it.detail ? <div className="ol-tl-detail">{it.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

/** metric-grid + progress 预设 mock */
function MetricGridMock({ cells }) {
  return (
    <div className="ol-metrics">
      {cells.map((c) => (
        <div key={c.k} className="ol-metric">
          <div className="k">{c.k}</div>
          <div className="v">{c.v}</div>
          <div className={`d ${c.dir || ''}`}>{c.d}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressMock({ label, pct, note }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--openloop-muted-foreground)', marginBottom: 5 }}>
        <span>{label}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{pct}%</span>
      </div>
      <div className="ol-progress"><i style={{ width: `${pct}%` }}></i></div>
      {note ? <div className="ol-micro" style={{ marginTop: 5 }}>{note}</div> : null}
    </div>
  )
}

/** event-log 预设 mock（自观察层） */
const EV_COLORS = { write: 'var(--openloop-success)', read: 'var(--openloop-info)', pin: 'var(--openloop-primary)', api: 'var(--openloop-muted-foreground)', mcp: 'var(--openloop-warning)' }
function EventLogMock({ events, max }) {
  return (
    <div className="ol-body ol-events" style={{ paddingTop: 10, paddingBottom: 10 }}>
      {events.slice(0, max || events.length).map((e, i) => (
        <div key={i} className="ol-event">
          <span className="ts">{e.ts}</span>
          <span className="ev-dot" style={{ background: EV_COLORS[e.kind] || EV_COLORS.api }}></span>
          <span className="msg">{e.msg}</span>
          <span className="src">{e.src}</span>
        </div>
      ))}
    </div>
  )
}

/** detail 组合件：k/v 网格（预设缺口候选 detail-grid 的 mock） */
function DetailGridMock({ cells }) {
  return (
    <div className="ol-detail-grid">
      {cells.map((c) => (
        <div key={c.k} className="ol-detail-cell">
          <div className="k">{c.k}</div>
          <div className="v">{c.render ? c.render() : c.v}</div>
        </div>
      ))}
    </div>
  )
}

/** 状态筛选 chips */
function FilterChips({ options, counts, value, onChange }) {
  return (
    <div className="ol-chips">
      {options.map((o) => (
        <button key={o} className={`ol-chip ${value === o ? 'on' : ''}`} onClick={() => onChange(o)}>
          {o}
          <span className="cnt">{counts[o] ?? 0}</span>
        </button>
      ))}
    </div>
  )
}

/** 看板 tile 外壳（dock tile chrome + body） */
function TileFrame({ title, rid, kind, badge, glow, dimmed, style, children, onHover }) {
  return (
    <div
      className={`tile ${glow ? 'rel-glow' : ''} ${dimmed ? 'dimmed' : ''}`}
      style={style}
      onMouseEnter={() => onHover && onHover(true)}
      onMouseLeave={() => onHover && onHover(false)}
    >
      <div className="tile-chrome">
        <span>{title}</span>
        {badge}
        <span className="rid">{rid}{kind ? ` · ${kind}` : ''}</span>
      </div>
      <div className="tile-body">{children}</div>
    </div>
  )
}

Object.assign(window, {
  PLATFORMS, IDEAS, DRAFTS, STAGES, CALENDAR, ASSETS, EVENTS, API_USAGE, REL_DECLS, STUDIO_RESOURCES, STUDIO_APIS,
  IDEA_FILTERS, IDEA_STATUS_TONE,
  PanelShell, ToneBadge, TagList, DataTableMock, HeatmapMock, FlowMock, TimelineMock, MetricGridMock, ProgressMock, EventLogMock, TileFrame,
  DetailGridMock, FilterChips,
})
