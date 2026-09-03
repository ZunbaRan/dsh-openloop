// 场景2：Board 悬浮窗（决策 B 多开对比）+ hover 亮灯（决策 C）
function useDrag(setPos) {
  const onDown = (e) => {
    const start = { x: e.clientX, y: e.clientY }
    let moved = false
    const move = (ev) => {
      moved = true
      setPos(prev => ({ x: prev.x + ev.clientX - start.x, y: prev.y + ev.clientY - start.y }))
      start.x = ev.clientX; start.y = ev.clientY
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  return onDown
}

function FloatWindow({ win, onClose, onToggle, onFocus, zIndex }) {
  const [pos, setPos] = React.useState({ x: win.x, y: win.y })
  const onDown = useDrag(setPos)
  const lead = leadById(win.leadId)
  return (
    <div
      className={`float-win${win.collapsed ? ' collapsed' : ''}`}
      style={{ left: pos.x, top: pos.y, zIndex }}
      onPointerDown={onFocus}
    >
      <div className="fw-head" onPointerDown={onDown}>
        <span className="rel-tag">详情</span>
        <span className="t">{lead.company} · {lead.contact}</span>
        <span className="ops">
          <button className="op" type="button" title={win.collapsed ? '展开' : '折叠'} onClick={(e) => { e.stopPropagation(); onToggle() }}>{win.collapsed ? '▢' : '—'}</button>
          <button className="op" type="button" title="关闭" onClick={(e) => { e.stopPropagation(); onClose() }}>×</button>
        </span>
      </div>
      <div className="fw-body"><LeadDetail lead={lead} /></div>
    </div>
  )
}

function SceneBoard() {
  const [wins, setWins] = React.useState([])
  const [focusId, setFocusId] = React.useState(null)
  const [hoverList, setHoverList] = React.useState(false)
  const seq = React.useRef(0)

  const openWin = (lead) => {
    const existing = wins.find(w => w.leadId === lead.id)
    if (existing) { setFocusId(existing.wid); return }
    seq.current += 1
    const wid = 'fw' + seq.current
    setWins([...wins, { wid, leadId: lead.id, x: 400 + (seq.current % 4) * 36, y: 56 + (seq.current % 4) * 40, collapsed: false }])
    setFocusId(wid)
  }
  const closeWin = (wid) => setWins(wins.filter(w => w.wid !== wid))
  const toggleWin = (wid) => setWins(wins.map(w => w.wid === wid ? { ...w, collapsed: !w.collapsed } : w))

  return (
    <div className="board-canvas">
      <div className="board-grid-bg"></div>

      {/* 已 pin 的线索列表 tile */}
      <div
        className={`tile${hoverList ? ' rel-glow' : ''}`}
        style={{ left: 28, top: 28, width: 336, height: 330 }}
        onMouseEnter={() => setHoverList(true)}
        onMouseLeave={() => setHoverList(false)}
      >
        <div className="tile-chrome">
          <span>线索列表</span>
          <span className="rel-tag" title="点行可触发 emits">可触发 · emits</span>
          <span className="rid">my-crm:lead-list</span>
        </div>
        <div className="tile-body">
          <LeadTable leads={LEADS} selectedId={null} onSelect={openWin} compact />
        </div>
      </div>

      {/* 无关 tile */}
      <div className={`tile${hoverList ? ' dimmed' : ''}`} style={{ left: 28, top: 380, width: 336, height: 170 }}>
        <div className="tile-chrome"><span>销售业绩看板</span><span className="rid">my-crm:sales-kpi</span></div>
        <div className="tile-body" style={{ padding: 14, fontSize: 11, color: 'var(--dsw-alias-label-caption)', lineHeight: 1.8 }}>
          与线索列表没有关联关系——hover 时不亮灯，仅降透明度提示。
        </div>
      </div>

      {/* 悬浮窗（多开对比） */}
      {wins.map((w, i) => (
        <FloatWindow
          key={w.wid}
          win={w}
          zIndex={focusId === w.wid ? 30 : 10 + i}
          onClose={() => closeWin(w.wid)}
          onToggle={() => toggleWin(w.wid)}
          onFocus={() => setFocusId(w.wid)}
        />
      ))}

      {wins.length === 0 && (
        <div style={{ position: 'absolute', left: 420, top: 130, fontSize: 12, color: 'var(--dsw-alias-label-caption)', lineHeight: 2.1 }}>
          ← 点击列表行：详情以悬浮窗打开<br/>不同线索可并排开窗对比；悬浮窗不会 pin 进 board
        </div>
      )}
      {wins.length > 0 && (
        <div style={{ position: 'absolute', right: 18, bottom: 14, fontSize: 10.5, color: 'var(--dsw-alias-label-caption)' }}>
          已开 {wins.length} 个详情窗 · 拖拽标题栏移动位置并排对比
        </div>
      )}
    </div>
  )
}
Object.assign(window, { SceneBoard })
