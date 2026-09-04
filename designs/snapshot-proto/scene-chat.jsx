// 场景 1：对话流 —— panel/artifact 右上角新增「投影为快照」按钮（pin 左侧）
// 演示：联动仍在（点行下方出详情）；投影后快照冻结参数，对话流再选别的行不影响快照

function ChatScene() {
  const { project } = useSnapshots()
  const [selectedId, setSelectedId] = React.useState(null)
  const [pinned, setPinned] = React.useState({})   // rid -> true
  const selected = selectedId ? leadById(selectedId) : null

  const togglePin = (rid) => setPinned(p => ({ ...p, [rid]: !p[rid] }))

  const cardOps = (rid, snapSpec) => (
    <span className="card-ops">
      <button type="button" className="icon-btn snap-btn" title="投影为快照（冻结当前参数，悬浮只读回看）"
              onClick={() => project(snapSpec)}>
        <SnapIcon />
      </button>
      {pinned[rid]
        ? <button type="button" className="icon-btn pinned" title="已固定到看板 · 点击取消"
                  onClick={() => togglePin(rid)}><PinIcon filled /></button>
        : <button type="button" className="icon-btn" title="固定到看板 pin"
                  onClick={() => togglePin(rid)}><PinIcon /></button>}
    </span>
  )

  return (
    <React.Fragment>
      <div className="chat-scroll">
        <div className="msg user">
          <div className="who">你</div>
          <div className="bubble">把这个月的线索列表拉出来，我挑几个重点跟进</div>
        </div>
        <div className="msg agent">
          <div className="who">Agent</div>
          <div className="bubble">本月共 6 条活跃线索，列表如下。点行可直接在下方看详情；右上角可以把当前视图投影成快照悬浮窗，方便对照。</div>
        </div>

        {/* agent 输出的列表面板：右上角 [投影][pin] */}
        <div className="stream-card">
          <div className="panel-card">
            <div className="panel-head">
              <span className="d2-dot ok"></span>
              <span className="t">线索列表</span>
              <span className="rid">my-crm:lead-list</span>
              {cardOps('my-crm:lead-list', { kind: 'lead-list', params: { selectedId: selectedId || '' } })}
            </div>
            <LeadTable leads={LEADS} selectedId={selectedId} onSelect={(l) => setSelectedId(l.id)} />

            {selected && (
              <div className="linked-slot">
                <div className="linked-banner" style={{ borderRadius: '8px 8px 0 0' }}>
                  <span>⚡</span><span>已选中 <span className="hl">{selected.company} · {selected.id}</span>，详情即时呈现</span>
                </div>
                <div className="panel-card" style={{ borderRadius: '0 0 12px 12px' }}>
                  <div className="panel-head">
                    <span className="d2-dot ok"></span>
                    <span className="t">线索详情 · {selected.company}</span>
                    <span className="rid">my-crm:lead-detail?leadId={selected.id}</span>
                    {cardOps(`my-crm:lead-detail?leadId=${selected.id}`, { kind: 'lead-detail', params: { leadId: selected.id } })}
                  </div>
                  <LeadDetailBody lead={selected} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="msg agent">
          <div className="who">Agent</div>
          <div className="bubble">本月业绩概览也一并给出：</div>
        </div>
        <div className="stream-card">
          <div className="panel-card">
            <div className="panel-head">
              <span className="d2-dot ok"></span>
              <span className="t">销售业绩看板</span>
              <span className="rid">my-crm:sales-kpi</span>
              {cardOps('my-crm:sales-kpi', { kind: 'sales-kpi', params: {}, size: { w: 460, h: 220 } })}
            </div>
            <KpiBody />
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

// 详情/KPI 的 body 复用（去掉 panel-card 外壳，避免嵌套边框）
function LeadDetailBody({ lead }) {
  return (
    <React.Fragment>
      <div className="detail-grid">
        <div className="detail-cell"><div className="k">预计金额</div><div className="v money">{fmtAmount(lead.amount)}</div></div>
        <div className="detail-cell"><div className="k">联系人</div><div className="v">{lead.contact}</div></div>
        <div className="detail-cell"><div className="k">负责人</div><div className="v">{lead.owner}</div></div>
        <div className="detail-cell"><div className="k">来源</div><div className="v">{lead.source}</div></div>
        <div className="detail-cell"><div className="k">最近跟进</div><div className="v">{lead.lastTouch}</div></div>
        <div className="detail-cell"><div className="k">备注</div><div className="v" style={{ fontSize: 11, fontWeight: 400, whiteSpace: 'normal' }}>{lead.note}</div></div>
      </div>
      <div className="pipeline">
        {STAGE_NAMES.map((n, i) => (
          <div key={n} className={`pipe-step ${i + 1 < lead.stage ? 'done' : i + 1 === lead.stage ? 'now' : ''}`}>
            <div className="bar"></div><div className="lb">{n}</div>
          </div>
        ))}
      </div>
    </React.Fragment>
  )
}

function KpiBody() {
  return (
    <div className="kpi-grid">
      <div className="kpi-cell"><div className="k">本月新增线索</div><div className="v">23</div><div className="d up">↑ 15% 环比</div></div>
      <div className="kpi-cell"><div className="k">管线总金额</div><div className="v">¥477.5k</div><div className="d up">↑ 8% 环比</div></div>
      <div className="kpi-cell"><div className="k">本月成交</div><div className="v">¥121k</div><div className="d down">↓ 3% 环比</div></div>
    </div>
  )
}

Object.assign(window, { ChatScene })
