// 场景3：资源列表——真实预览 + 双语说明 + 关联预览（无代码块）
const REG_COMPONENTS = [
  {
    rid: 'my-crm:lead-list', name: '线索列表', kind: 'panel',
    rels: [{ dir: 'out', target: 'my-crm:lead-detail', targetName: '线索详情', how: '点行打开', howEn: 'row click opens' }],
    decl: [
      { dir: 'out', event: 'my-crm:lead:selected', param: 'leadId = 被点行的 id', note: '点行时触发 fires on row click' },
    ],
    preview: 'list',
  },
  {
    rid: 'my-crm:lead-detail', name: '线索详情', kind: 'panel',
    rels: [
      { dir: 'in', target: 'my-crm:lead-list', targetName: '线索列表', how: '被点行打开', howEn: 'opened by list' },
      { dir: 'out', target: 'my-crm:contact-card', targetName: '联系人卡片', how: '点「查看联系人」', howEn: 'via contact button' },
    ],
    decl: [
      { dir: 'in', event: 'my-crm:lead:selected', param: 'leadId → 本页数据参数', note: '收到后按 leadId 取数 renders by leadId' },
      { dir: 'out', event: 'my-crm:contact:selected', param: 'contactId = 当前线索联系人', note: '可继续往后级联 chains further' },
    ],
    preview: 'detail',
  },
  {
    rid: 'my-crm:contact-card', name: '联系人卡片', kind: 'panel',
    rels: [{ dir: 'in', target: 'my-crm:lead-detail', targetName: '线索详情', how: '被「查看联系人」打开', howEn: 'opened by detail' }],
    decl: [{ dir: 'in', event: 'my-crm:contact:selected', param: 'contactId → 本页数据参数', note: '收到后按 contactId 取数 renders by contactId' }],
    preview: 'contact',
  },
  {
    rid: 'my-crm:sales-kpi', name: '销售业绩看板', kind: 'panel',
    rels: [],
    decl: [],
    preview: 'kpi',
  },
]

function RegPreview({ kind }) {
  if (kind === 'list') return <LeadTable leads={LEADS} selectedId={null} onSelect={() => {}} compact />
  if (kind === 'detail') return <LeadDetail lead={LEADS[0]} />
  if (kind === 'contact') return <ContactCard lead={LEADS[0]} />
  if (kind === 'kpi') return <SalesKpi />
  return null
}

// 关联预览：左列表点行 → 右详情即时切换（可交互的最小闭环）
function RelDemo() {
  const [sel, setSel] = React.useState(null)
  return (
    <div className="rel-demo">
      <div className="rd-pane">
        <div className="panel-card">
          <div className="panel-head"><span className="t">线索列表</span><span className="rid">点行试试</span></div>
          <LeadTable leads={LEADS.slice(0, 4)} selectedId={sel?.id} onSelect={setSel} compact />
        </div>
      </div>
      <div className={`rd-arrow${sel ? ' live' : ''}`}>
        <div className="cap">{sel ? sel.id : '等待点选'}</div>
        <div className="line"></div>
        <div className="cap">{sel ? '即时打开' : 'click a row'}</div>
      </div>
      <div className="rd-pane">
        {sel ? <LeadDetail lead={sel} /> : (
          <div className="panel-card" style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
            <span style={{ fontSize: 11, color: 'var(--dsw-alias-label-caption)' }}>详情将在这里出现</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SceneRegistry() {
  const [sel, setSel] = React.useState('my-crm:lead-list')
  const comp = REG_COMPONENTS.find(c => c.rid === sel)
  return (
    <div className="reg-cols">
      <div className="reg-col1">
        <div className="reg-head"><span>组件资源 Components</span><span>{REG_COMPONENTS.length}</span></div>
        <div className="reg-rows">
          {REG_COMPONENTS.map(c => (
            <button key={c.rid} type="button" className={`reg-row${c.rid === sel ? ' on' : ''}`} onClick={() => setSel(c.rid)}>
              <span className="r-top">
                <span className="r-name">{c.name}</span>
                <span className="r-kind">{c.kind}</span>
              </span>
              <span className="r-rid">{c.rid}</span>
              {c.rels.length > 0 && (
                <span className="rel-chips">
                  {c.rels.map((r, i) => (
                    <span key={i} className="rel-chip" title={`${r.how} ${r.howEn}`}>{r.dir === 'out' ? '→' : '←'} {r.targetName}</span>
                  ))}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="reg-detail">
        <div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>{comp.name}</div>
          <div style={{ fontSize: 10, fontFamily: 'ui-monospace, monospace', color: 'var(--dsw-alias-label-caption)', marginTop: 3 }}>{comp.rid} · {comp.kind}</div>
        </div>

        <div className="sec-label">预览 <span className="en">Preview</span></div>
        <RegPreview kind={comp.preview} />

        {comp.decl.length > 0 && (<>
          <div className="sec-label">页面关系 <span className="en">Relations（ emits 可触发 / consumes 可响应 ）</span></div>
          <table className="decl-table">
            <thead><tr><th>方向</th><th>事件 Event</th><th>参数 Param</th><th>说明</th></tr></thead>
            <tbody>
              {comp.decl.map((d, i) => (
                <tr key={i}>
                  <td><span className={`decl-dir ${d.dir}`}>{d.dir === 'out' ? '→ 可触发 emits' : '← 可响应 consumes'}</span></td>
                  <td className="ev">{d.event}</td>
                  <td style={{ fontSize: 10.5 }}>{d.param}</td>
                  <td style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-caption)' }}>{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>)}

        {comp.preview === 'list' && (<>
          <div className="sec-label">关联预览 <span className="en">Try it · 点行看效果</span></div>
          <RelDemo />
        </>)}

        <div className="sec-label">相关页面 <span className="en">Related pages</span></div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {comp.rels.map((r, i) => (
            <button key={i} type="button" className="rel-chip" onClick={() => setSel(r.target)}>
              {r.dir === 'out' ? '→' : '←'} {r.targetName} · {r.how}
            </button>
          ))}
          {comp.rels.length === 0 && <span style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-caption)' }}>无关联页面，独立使用</span>}
        </div>
      </div>
    </div>
  )
}
Object.assign(window, { SceneRegistry })
