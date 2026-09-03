// 场景1：对话流——点击列表行 → 卡片内下方出现详情（决策 A）
function SceneChat() {
  const [selected, setSelected] = React.useState(null)
  const [lastEvent, setLastEvent] = React.useState(null)

  const pick = (lead) => {
    setSelected(lead)
    setLastEvent({ event: 'my-crm:lead:selected', payload: `{ leadId: "${lead.id}" }`, at: Date.now() })
  }

  return (
    <div className="chat-scroll">
      <div className="msg user">
        <div className="who">你</div>
        <div className="bubble">给我看一下当前销售线索列表</div>
      </div>
      <div className="msg agent">
        <div className="who">Agent</div>
        <div className="bubble">这是 my-crm 的线索列表，共 6 条进行中。点击任意一条即可查看详情，不需要我再介入：</div>
      </div>

      <div className="stream-card">
        <div className="panel-card">
          <div className="panel-head">
            <span className="d2-dot ok"></span>
            <span className="t">线索列表</span>
            <span className="rid">my-crm:lead-list</span>
            <span style={{ marginLeft: 'auto' }}>{lastEvent && <EventPulse event={lastEvent.event} payload={lastEvent.payload} />}</span>
          </div>
          <LeadTable leads={LEADS} selectedId={selected?.id} onSelect={pick} />
          {selected && (
            <div className="linked-slot">
              <div className="linked-banner">
                <span>已选中 <span className="hl">{selected.company}</span> · 详情即时呈现 <span style={{ color: 'var(--dsw-alias-label-caption)', fontFamily: 'ui-monospace, monospace', fontSize: 9.5 }}>lead-detail?leadId={selected.id} · 未经 Agent</span></span>
              </div>
              <LeadDetail lead={selected} />
            </div>
          )}
        </div>
      </div>

      {selected && (
        <div className="msg agent">
          <div className="who">Agent（可同时追问，点选互不打断）</div>
          <div className="bubble">需要我针对「{selected.company}」做点什么吗？比如起草跟进邮件。</div>
        </div>
      )}
    </div>
  )
}
Object.assign(window, { SceneChat })
