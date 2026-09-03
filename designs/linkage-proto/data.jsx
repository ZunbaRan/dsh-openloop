// CRM 模拟数据
const LEADS = [
  { id: 'L-1024', company: '星桥网络', contact: '林晚', amount: 86000,  stage: 3, stageName: '方案报价', owner: 'Kevin', source: '官网表单', lastTouch: '08-30', note: '对私有部署敏感，需报价含运维包' },
  { id: 'L-1025', company: '澄光传媒', contact: '赵启', amount: 42000,  stage: 2, stageName: '需求确认', owner: 'Kevin', source: '老客户转介', lastTouch: '08-29', note: '预算 5w 内，9 月定供应商' },
  { id: 'L-1026', company: '岱川制造', contact: '何珊', amount: 158000, stage: 4, stageName: '商务谈判', owner: 'Mia',   source: '展会线索', lastTouch: '09-01', note: '法务审合同中，账期待谈' },
  { id: 'L-1027', company: '南屿生物', contact: '顾泽', amount: 33000,  stage: 1, stageName: '初步接触', owner: 'Mia',   source: '广告线索', lastTouch: '08-27', note: '首访已约，待确认对接人级别' },
  { id: 'L-1028', company: '白榆软件', contact: '沈奕', amount: 97500,  stage: 3, stageName: '方案报价', owner: 'Kevin', source: '渠道伙伴', lastTouch: '08-31', note: '竞品比价中，强调交付周期优势' },
  { id: 'L-1029', company: '岭云物流', contact: '岑蔚', amount: 61000,  stage: 2, stageName: '需求确认', owner: 'Mia',   source: '官网表单', lastTouch: '09-01', note: '多仓场景，需补充 WMS 对接案例' },
]

const STAGE_NAMES = ['初步接触', '需求确认', '方案报价', '商务谈判']

function leadById(id) { return LEADS.find(l => l.id === id) }
function fmtAmount(n) { return '¥' + n.toLocaleString('zh-CN') }

// ---- 共享组件 ----

function LeadTable({ leads, selectedId, onSelect, compact }) {
  return (
    <table className={`lead-table${compact ? ' compact' : ''}`}>
      <thead><tr>
        <th>线索</th><th>联系人</th>{!compact && <th>金额</th>}<th>阶段</th>{!compact && <th>跟进</th>}<th style={{ width: 1 }}></th>
      </tr></thead>
      <tbody>
        {leads.map(l => (
          <tr key={l.id} className={l.id === selectedId ? 'sel' : ''} onClick={() => onSelect(l)}>
            <td><span className="co"><strong>{l.company}</strong> <span style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 9.5 }}>{l.id}</span></span></td>
            <td>{l.contact}</td>
            {!compact && <td className="amt">{fmtAmount(l.amount)}</td>}
            <td><span className={`stage-pill s${l.stage}`}>{l.stageName}</span></td>
            {!compact && <td style={{ color: 'var(--dsw-alias-label-caption)', fontSize: 10.5 }}>{l.lastTouch}</td>}
            <td><span className="row-link">查看详情 →</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LeadDetail({ lead }) {
  if (!lead) return null
  return (
    <div className="panel-card">
      <div className="panel-head">
        <span className="d2-dot ok"></span>
        <span className="t">线索详情 · {lead.company}</span>
        <span className="rid">my-crm:lead-detail?leadId={lead.id}</span>
      </div>
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
      <div className="detail-actions">
        <button className="mini-btn primary" type="button">推进阶段 ↗</button>
        <button className="mini-btn" type="button">写跟进</button>
        <button className="mini-btn" type="button">查看联系人 →</button>
      </div>
    </div>
  )
}

// 联系人卡片 mock
function ContactCard({ lead }) {
  const l = lead || LEADS[0]
  return (
    <div className="panel-card">
      <div className="panel-head">
        <span className="d2-dot ok"></span>
        <span className="t">联系人卡片 · {l.contact}</span>
        <span className="rid">my-crm:contact-card</span>
      </div>
      <div className="detail-grid">
        <div className="detail-cell"><div className="k">姓名</div><div className="v">{l.contact}</div></div>
        <div className="detail-cell"><div className="k">公司</div><div className="v">{l.company}</div></div>
        <div className="detail-cell"><div className="k">角色</div><div className="v">采购负责人</div></div>
        <div className="detail-cell"><div className="k">电话</div><div className="v">138****{1000 + LEADS.indexOf(l) * 37}</div></div>
        <div className="detail-cell"><div className="k">微信</div><div className="v">{l.contact}_wx</div></div>
        <div className="detail-cell"><div className="k">关联线索</div><div className="v">{l.id}</div></div>
      </div>
    </div>
  )
}

// KPI 看板 mock
function SalesKpi() {
  return (
    <div className="panel-card">
      <div className="panel-head">
        <span className="d2-dot ok"></span>
        <span className="t">销售业绩看板</span>
        <span className="rid">my-crm:sales-kpi</span>
      </div>
      <div className="kpi-grid">
        <div className="kpi-cell"><div className="k">本月新增线索</div><div className="v">23</div><div className="d up">↑ 15% 环比</div></div>
        <div className="kpi-cell"><div className="k">管线总金额</div><div className="v">¥477.5k</div><div className="d up">↑ 8% 环比</div></div>
        <div className="kpi-cell"><div className="k">本月成交</div><div className="v">¥121k</div><div className="d down">↓ 3% 环比</div></div>
      </div>
    </div>
  )
}

function EventPulse({ event, payload }) {
  return (
    <span className="event-pulse">
      <span>⚡</span><span>{event}</span><span style={{ opacity: .65 }}>{payload}</span>
    </span>
  )
}

Object.assign(window, { LEADS, STAGE_NAMES, leadById, fmtAmount, LeadTable, LeadDetail, ContactCard, SalesKpi, EventPulse })
