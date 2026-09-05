/** 场景 5 · 拓扑：studio 系统地图（artifact network 档全页）+ 自观察元数据带 */

const TOPO_NODES = [
  { id: 'user', cls: 'user', x: 50, y: 4, cx: true, t: '👤 阿洛', d: '拖拽组装自己的工作台', status: 'ok' },
  { id: 'dsh', cls: 'hub', x: 50, y: 16, cx: true, t: 'DSH 宿主', d: 'Agent Native 产品底座', status: 'ok' },
  { id: 'studio', cls: 'hub', x: 50, y: 34, cx: true, t: 'studio APP', d: '14 组件 · 5 API · local', status: 'ok' },
  { id: 'ideas', cls: '', x: 7, y: 58, t: '想法库', d: 'studio:idea-bank · data-table', status: 'ok' },
  { id: 'pipeline', cls: '', x: 25, y: 58, t: '创作管线', d: 'studio:pipeline-flow · flow · ⚠审核滞留', status: 'warn' },
  { id: 'calendar', cls: '', x: 43, y: 58, t: '排期日历', d: 'studio:calendar · timeline', status: 'ok' },
  { id: 'assets', cls: '', x: 61, y: 58, t: '素材库', d: 'studio:asset-table · data-table', status: 'ok' },
  { id: 'method', cls: '', x: 79, y: 58, t: '方法论', d: 'studio:methodology · markdown', status: 'ok' },
  { id: 'pb', cls: '', x: 14, y: 82, t: '本地后端 · PocketBase', d: 'ideas / drafts / assets / calendar / events × 5 集合', status: 'ok' },
  { id: 'excalidraw', cls: '', x: 86, y: 34, t: 'excalidraw', d: 'thirdparty · MCP Apps 2.0 沙箱', status: 'ok' },
  { id: 'tldraw', cls: 'meta-node', x: 86, y: 16, t: 'tldraw', d: '不可达 · 惰性重连中', status: 'off' },
  { id: 'meta', cls: 'meta-node', x: 79, y: 82, t: '自观察四件套', d: 'system-overview · event-log · api-usage · agent-activity', status: 'ok' },
]

const TOPO_EDGES = [
  ['user', 'dsh'], ['dsh', 'studio'], ['dsh', 'excalidraw'], ['dsh', 'tldraw'],
  ['studio', 'ideas'], ['studio', 'pipeline'], ['studio', 'calendar'], ['studio', 'assets'], ['studio', 'method'],
  ['ideas', 'pb'], ['pipeline', 'pb'], ['calendar', 'pb'], ['assets', 'pb'], ['method', 'pb'],
  ['meta', 'pb'], ['meta', 'studio'],
]

function SceneTopology() {
  const canvasRef = React.useRef(null)
  const [selNode, setSelNode] = React.useState(null)

  React.useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const svg = cv.querySelector('svg')
    const center = (el) => {
      const r = el.getBoundingClientRect()
      const c = cv.getBoundingClientRect()
      return { x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 }
    }
    const draw = () => {
      const byId = {}
      cv.querySelectorAll('.topo-node').forEach((n) => { byId[n.dataset.id] = n })
      svg.innerHTML = TOPO_EDGES.map(([a, b]) => {
        if (!byId[a] || !byId[b]) return ''
        const pa = center(byId[a])
        const pb = center(byId[b])
        const metaEdge = a === 'meta' || b === 'meta'
        const stroke = metaEdge
          ? 'color-mix(in srgb, var(--rel) 50%, transparent)'
          : 'color-mix(in srgb, var(--art-accent) 42%, transparent)'
        return `<line x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${stroke}" stroke-width="1.5" ${metaEdge ? 'stroke-dasharray="5 4"' : ''}/>`
      }).join('')
    }
    const cleanups = []
    cv.querySelectorAll('.topo-node').forEach((n) => {
      const onDown = (e) => {
        e.preventDefault()
        const sx = e.clientX
        const sy = e.clientY
        const ox = n.offsetLeft
        const oy = n.offsetTop
        const mv = (ev) => {
          n.style.transform = 'none'
          n.style.left = `${Math.max(2, Math.min(cv.clientWidth - n.offsetWidth - 2, ox + ev.clientX - sx))}px`
          n.style.top = `${Math.max(2, Math.min(cv.clientHeight - n.offsetHeight - 2, oy + ev.clientY - sy))}px`
          draw()
        }
        const up = () => {
          window.removeEventListener('pointermove', mv)
          window.removeEventListener('pointerup', up)
        }
        window.addEventListener('pointermove', mv)
        window.addEventListener('pointerup', up)
      }
      n.addEventListener('pointerdown', onDown)
      cleanups.push(() => n.removeEventListener('pointerdown', onDown))
    })
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(cv)
    return () => { ro.disconnect(); cleanups.forEach((fn) => fn()) }
  }, [])

  return (
    <div className="topo-wrap" data-screen-label="scene-topology">
      <div className="topo-inner">
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--art-foreground)' }}>Studio 系统地图</div>
            <div style={{ fontSize: 11, color: 'var(--art-muted)', marginTop: 2 }}>artifact · network 档 · 节点可拖拽可点 · 虚线 = 自观察层回环</div>
          </div>
          <span style={{ marginLeft: 'auto' }} className="kind-badge local">artifact</span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="rel-chip" style={{ cursor: 'default' }}>① 导航中枢：点节点 → 跳到对应组件</span>
          <span className="rel-chip" style={{ cursor: 'default' }}>② 健康一眼看：节点状态点（⚠ 管线滞留 / 灰 tldraw 不可达）</span>
          <span className="rel-chip" style={{ cursor: 'default' }}>③ 给 Agent 的系统说明书：rid 即地址</span>
        </div>

        <div className="topo-canvas" ref={canvasRef}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}></svg>
          {TOPO_NODES.map((n) => (
            <div
              key={n.id}
              data-id={n.id}
              className={`topo-node ${n.cls}`}
              style={{
                ...(n.cx ? { left: `${n.x}%`, top: `${n.y}%`, transform: 'translateX(-50%)' } : { left: `${n.x}%`, top: `${n.y}%` }),
                ...(selNode === n.id ? { borderColor: 'var(--art-accent)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--art-accent) 25%, transparent)' } : null),
              }}
              onClick={() => setSelNode(n.id)}
            >
              <div className="t"><span className={`d2-dot ${n.status}`}></span>{n.t}</div>
              <div className="d">{n.d}</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: 'var(--art-muted)', minHeight: 17 }}>
          {selNode ? (
            <span>已选 <b style={{ color: 'var(--art-foreground)' }}>{TOPO_NODES.find((n) => n.id === selNode)?.t}</b> → 点击即跳转到该组件（导航中枢作用）；管线节点的 ⚠ 来自 api_usage/events 的实时聚合</span>
          ) : (
            <span>点任意节点看导航作用；拖拽可重排布局（布局即数据，可持久化）</span>
          )}
        </div>

        <div className="topo-legend">
          <span><i style={{ background: 'color-mix(in srgb, var(--art-accent) 40%, transparent)' }}></i>中枢</span>
          <span><i style={{ background: 'var(--art-surface)', border: '1px solid var(--art-border)' }}></i>组件 / 后端</span>
          <span><i style={{ border: '1px dashed var(--rel)', background: 'transparent' }}></i>自观察层（builtin 预设回环读数）</span>
        </div>

        <div className="meta-band">
          <div className="meta-band-head">
            <span>自观察元数据带</span>
            <span className="preset-chip">openloop:event-log · openloop:api-usage-monitor</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 400, color: 'var(--dsw-alias-label-caption)' }}>系统自己的写入与流量，实时落在这里</span>
          </div>
          <div className="meta-band-body">
            <div className="mb-events">
              <EventLogMock events={EVENTS.slice(0, 5)} />
            </div>
            <div className="mb-usage">
              {API_USAGE.map((u) => (
                <div key={u.route} className="usage-row">
                  <span className="mono" style={{ fontSize: 9.5, width: 108, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.route}</span>
                  <span className="ubar"><i style={{ width: `${u.pct}%` }}></i></span>
                  <span className="unum">{u.count}</span>
                </div>
              ))}
              <div style={{ fontSize: 9.5, color: 'var(--dsw-alias-label-caption)', marginTop: 4 }}>近 1 小时调用分布 · studio 自身流量已占 62%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { SceneTopology })
