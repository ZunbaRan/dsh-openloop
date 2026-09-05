/** 场景 2 · 看板：工作室驾驶舱总装——8 类 tile + hover 亮灯 + 浮窗多开 + 故障/降级演示 */

const NEXT_STAGE = { '制作中': '审核中', '审核中': '排期中', '排期中': '已发布' }
const STAGE_TONE = { '制作中': 'info', '审核中': 'warning', '排期中': 'primary', '已发布': 'success' }

function SceneBoard() {
  const [drafts, setDrafts] = React.useState(DRAFTS.map((d) => ({ ...d })))
  const [events, setEvents] = React.useState(EVENTS)
  const [hoverRel, setHoverRel] = React.useState(null) // 'ideas' | 'pipeline' | null
  const [floats, setFloats] = React.useState([]) // [{key, title, x, y, filterStage}]
  const [tileFault, setTileFault] = React.useState(false)
  const [backendDown, setBackendDown] = React.useState(false)
  const [assetQuery, setAssetQuery] = React.useState('')
  const [pulse, setPulse] = React.useState(null)

  const glowFor = (tile) => {
    if (!hoverRel) return { glow: false, dimmed: false }
    const relMap = {
      ideas: ['pipeline', 'calendar', 'events'],
      pipeline: ['calendar', 'events'],
    }
    const hot = relMap[hoverRel] || []
    return { glow: hot.includes(tile), dimmed: !hot.includes(tile) && tile !== hoverRel }
  }

  const openFloat = (stage) => {
    const key = `float-${stage}-${Date.now()}`
    const offset = floats.length * 36
    setFloats((fs) => [...fs, { key, title: `稿件 · ${stage}`, x: 180 + offset, y: 90 + offset, filterStage: stage }])
  }
  const closeFloat = (key) => setFloats((fs) => fs.filter((f) => f.key !== key))

  const advance = (draft) => {
    const next = NEXT_STAGE[draft.stage]
    if (!next) return
    setDrafts((ds) => ds.map((d) => (d.id === draft.id ? { ...d, stage: next } : d)))
    const ts = new Date().toTimeString().slice(0, 8)
    setEvents((es) => [{ ts, kind: 'write', msg: `studio/drafts · ${draft.id} stage → ${next}`, src: 'panel:pipeline' }, ...es])
    setPulse(`studio:draft:stage_changed · ${draft.id}`)
    setTimeout(() => setPulse(null), 2600)
  }

  const filteredAssets = ASSETS.filter((a) => !assetQuery || a.name.toLowerCase().includes(assetQuery.toLowerCase()) || a.kind.includes(assetQuery))

  const heatMatrix = [
    [3, 5, 2, 6, 4, 7],
    [2, 3, 4, 3, 5, 6],
    [4, 2, 5, 7, 3, 5],
    [1, 4, 3, 5, 6, 8],
  ]

  return (
    <div className="board-wrap" data-screen-label="scene-board">
      <div className="board-topbar">
        <div className="board-seg">
          <button>APP</button>
          <button className="on">看板</button>
        </div>
        <span className="board-name">工作室驾驶舱</span>
        <span className="rel-tag">hover 想法/管线 tile 看联动</span>
        <span style={{ flex: 1 }}></span>
        {pulse ? <span className="event-pulse">{pulse}</span> : null}
        <button className={`pc-btn ${tileFault ? 'on' : ''}`} onClick={() => setTileFault((v) => !v)}>模拟 tile 故障</button>
        <button className={`pc-btn ${backendDown ? 'on' : ''}`} onClick={() => setBackendDown((v) => !v)}>模拟后端降级</button>
      </div>

      <div className="board-canvas">
        <div className="board-grid-bg"></div>

        <TileFrame title="想法热度" rid="studio:idea-heat" kind="panel" style={{ left: 16, top: 16, width: 384, height: 252 }}
          onHover={(on) => setHoverRel(on ? 'ideas' : null)} {...glowFor('ideas')}>
          <PanelShell preset="heatmap" fill>
            <HeatmapMock rowLabels={['AI', '产品', '工具', '挑战']} colLabels={['W34', 'W35', 'W36', 'W37', 'W38', 'W39']} matrix={heatMatrix} />
            <div className="ol-micro" style={{ padding: '8px 14px 12px' }}>标签 × 周 · 新想法数量 · 悬停我 = 高亮管线/排期（想法→稿件→发布 链路）</div>
          </PanelShell>
        </TileFrame>

        <TileFrame title="创作管线" rid="studio:pipeline-flow" kind="panel" style={{ left: 416, top: 16, width: 296, height: 436 }}
          onHover={(on) => setHoverRel(on ? 'pipeline' : null)} {...glowFor('pipeline')}>
          <PanelShell preset="flow" fill>
            <FlowMock
              nodes={STAGES.map((s) => ({
                key: s.key,
                label: s.label,
                count: s.key === 'doing' ? drafts.filter((d) => d.stage === '制作中').length : s.key === 'review' ? drafts.filter((d) => d.stage === '审核中').length : s.key === 'scheduled' ? drafts.filter((d) => d.stage === '排期中').length : s.key === 'published' ? drafts.filter((d) => d.stage === '已发布').length : s.count,
                tone: s.tone,
                detail: (s.stuck ? `⚠ 滞留 ${s.aging} · ` : s.aging ? `平均滞留 ${s.aging} · ` : '') + (s.top[0] || ''),
                edgeLabel: s.key === 'doing' ? '立项' : s.key === 'review' ? '初稿完成' : s.key === 'scheduled' ? '过审' : s.key === 'published' ? '到点发布' : '',
              }))}
              onSelect={(n) => {
                const stageLabel = { doing: '制作中', review: '审核中', scheduled: '排期中', published: '已发布' }[n.key]
                if (stageLabel) openFloat(stageLabel)
              }}
            />
            <div className="ol-micro" style={{ padding: '0 14px 12px' }}>管线的作用 = <b>瓶颈监测</b>（哪阶段在堆积、滞留多久）+ <b>阶段导航</b>（点节点 → 该阶段稿件浮窗）。只显示计数的管线不如 metric-grid。</div>
          </PanelShell>
        </TileFrame>

        <TileFrame title="本周概览" rid="studio:week-stats" kind="panel" style={{ left: 728, top: 16, width: 336, height: 252 }} {...glowFor('stats')}>
          <PanelShell preset="metric-grid" fill>
            <MetricGridMock cells={[
              { k: '想法池', v: 8, d: '本周 +3', dir: 'up' },
              { k: '在制稿件', v: drafts.filter((d) => d.stage !== '已发布').length, d: '2 条临近截稿' },
              { k: '本周排期', v: 6, d: '4 平台覆盖' },
              { k: '已发布 · 30d', v: 12, d: '环比 +2', dir: 'up' },
            ]} />
            <div className="ol-body" style={{ paddingTop: 12 }}>
              <ProgressMock label="月更目标 24 条" pct={68} note="进度预设 · 按当前节奏可提前 2 天达成" />
            </div>
          </PanelShell>
        </TileFrame>

        <TileFrame title="排期日历" rid="studio:calendar" kind="panel" style={{ left: 16, top: 284, width: 384, height: 300 }} {...glowFor('calendar')}>
          <PanelShell preset="timeline" fill>
            <TimelineMock items={CALENDAR.slice(0, 5).map((c, i) => ({
              time: c.day,
              title: c.title,
              detail: `${c.platform} · ${c.dow}`,
              status: i < 1 ? 'current' : 'future',
            }))} />
          </PanelShell>
        </TileFrame>

        <TileFrame title="素材库" rid="studio:asset-table" kind="panel" style={{ left: 728, top: 284, width: 336, height: 300 }} {...glowFor('assets')}>
          {tileFault ? (
            <div className="tile-error">
              <div className="et">数据加载失败</div>
              <div className="ed">TileErrorBoundary 已兜住渲染异常，<br />坏 tile 不会拖垮整个看板。<br /><span className="mono">studio:assets · HTTP 500</span></div>
              <button className="retry-btn" onClick={() => setTileFault(false)}>重试</button>
            </div>
          ) : (
            <PanelShell preset="data-table" fill>
              <div style={{ padding: '10px 12px 0' }}>
                <input
                  value={assetQuery}
                  onChange={(e) => setAssetQuery(e.target.value)}
                  placeholder="搜索素材名 / 类型…"
                  style={{ width: '100%', height: 26, padding: '0 10px', borderRadius: 7, border: '1px solid var(--openloop-border)', background: 'var(--openloop-surface-subtle)', color: 'var(--openloop-foreground)', fontSize: 11, fontFamily: 'inherit', outline: 'none' }}
                />
              </div>
              <DataTableMock compact
                columns={[
                  { key: 'name', label: '素材', render: (r) => <span className="mono" style={{ fontSize: 10.5 }}>{r.name}</span> },
                  { key: 'kind', label: '类型', render: (r) => <span className="ol-tag">{r.kind}</span> },
                  { key: 'size', label: '大小', num: true },
                  { key: 'usedBy', label: '被引用' },
                ]}
                rows={filteredAssets}
                rowKey="id"
              />
            </PanelShell>
          )}
        </TileFrame>

        <TileFrame title="分镜画板" rid="excalidraw:canvas" kind="mcp-app"
          badge={<span className="kind-badge thirdparty">thirdparty</span>}
          style={{ left: 1080, top: 16, width: 320, height: 336 }} {...glowFor('canvas')}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ display: 'flex', gap: 5, padding: '7px 10px', borderBottom: '1px solid var(--dsw-alias-border-l1)' }}>
              {['▢', '◯', '⟶', '✎', 'T'].map((t, i) => (
                <span key={i} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--dsw-alias-border-l1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: i === 3 ? 'var(--accent)' : 'var(--dsw-alias-label-tertiary)', background: i === 3 ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'none' }}>{t}</span>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--dsw-alias-label-caption)' }}>ui://excalidraw/canvas</span>
            </div>
            <div style={{ flex: 1, position: 'relative', backgroundImage: 'radial-gradient(circle, var(--dsw-alias-border-l2) 1px, transparent 1px)', backgroundSize: '18px 18px' }}>
              <div style={{ position: 'absolute', left: 26, top: 30, width: 110, height: 64, border: '1.5px solid var(--dsw-alias-label-tertiary)', borderRadius: 8, padding: 6, fontSize: 10, color: 'var(--dsw-alias-label-secondary)', transform: 'rotate(-1.5deg)', background: 'var(--dsw-alias-bg-layer-1)' }}>开场钩子<br />3s 内抛问题</div>
              <div style={{ position: 'absolute', left: 170, top: 96, width: 120, height: 64, border: '1.5px dashed var(--dsw-alias-label-tertiary)', borderRadius: 8, padding: 6, fontSize: 10, color: 'var(--dsw-alias-label-secondary)', transform: 'rotate(1deg)', background: 'var(--dsw-alias-bg-layer-1)' }}>演示段<br />screen recording</div>
              <div style={{ position: 'absolute', left: 60, top: 160, width: 96, height: 56, border: '1.5px solid var(--dsw-alias-state-warn-primary)', borderRadius: 8, padding: 6, fontSize: 10, color: 'var(--dsw-alias-state-warn-primary)', transform: 'rotate(-2deg)', background: 'color-mix(in srgb, var(--dsw-alias-state-warn-primary) 7%, var(--dsw-alias-bg-layer-1))' }}>CTA<br />关注 + 合集</div>
            </div>
            <div style={{ padding: '6px 10px', borderTop: '1px solid var(--dsw-alias-border-l1)', fontSize: 9.5, color: 'var(--dsw-alias-label-caption)' }}>「30 天挑战 · Day 1-7」分镜 · 渲染时经 refresh 端点现取 · 沙箱 iframe</div>
          </div>
        </TileFrame>

        <TileFrame title="事件流 · 自观察" rid="openloop:event-log" kind="panel"
          badge={<span className="kind-badge builtin">builtin</span>}
          style={{ left: 1080, top: 368, width: 320, height: 216 }} {...glowFor('events')}>
          <PanelShell preset="event-log" fill>
            <EventLogMock events={events} max={7} />
          </PanelShell>
        </TileFrame>

        <TileFrame title="创作方法论" rid="studio:methodology" kind="panel" style={{ left: 416, top: 468, width: 296, height: 116 }} {...glowFor('method')}>
          <PanelShell preset="markdown" fill>
            <div className="ol-body ol-md" style={{ paddingTop: 10 }}>
              <p><strong>钩子三秒法则</strong>：开头必须抛出一个观众此刻的问题。</p>
              <p>一稿多投先改 <code>cover + 前 3 秒</code>，不要只改标题。</p>
            </div>
          </PanelShell>
        </TileFrame>

        {floats.map((f) => (
          <div key={f.key} className="float-win" style={{ left: f.x, top: f.y }}>
            <div className="fw-head">
              <span className="t">{f.title}（{drafts.filter((d) => d.stage === f.filterStage).length}）</span>
              <div className="ops">
                <button className="op" onClick={() => closeFloat(f.key)}>✕</button>
              </div>
            </div>
            <div className="fw-body">
              <DataTableMock compact
                columns={[
                  { key: 'title', label: '稿件' },
                  { key: 'platform', label: '平台' },
                  { key: 'due', label: '截稿', num: true },
                  { key: 'stage', label: '操作', render: (r) => NEXT_STAGE[r.stage] ? <button className="retry-btn" onClick={() => advance(r)}>推进 → {NEXT_STAGE[r.stage]}</button> : <span className="ol-micro">已到终态</span> },
                ]}
                rows={drafts.filter((d) => d.stage === f.filterStage)}
                rowKey="id"
              />
              {drafts.filter((d) => d.stage === f.filterStage).length === 0 ? (
                <div className="ol-meta" style={{ padding: 14 }}>该阶段暂无稿件。</div>
              ) : null}
            </div>
          </div>
        ))}

        {backendDown ? (
          <div className="d2-banner">
            <span className="d2-dot warn"></span>
            后端暂不可达 · 已进入本地镜像模式，改动将标记 pendingSync，恢复后自动对齐
          </div>
        ) : null}
      </div>
    </div>
  )
}

Object.assign(window, { SceneBoard })
