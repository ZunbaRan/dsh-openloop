// 场景 2：看板资源列表 —— 行 hover 出现操作按钮：未 pin = [投影][pin]；已 pin = [投影]
// 右侧为资源预览；演示同一资源可多次投影（不同参数 = 不同快照实例）

const REG_RESOURCES = [
  { rid: 'my-crm:lead-list',    name: '线索列表',   kind: 'panels',   snap: { kind: 'lead-list', params: {} }, pinned: true },
  { rid: 'my-crm:lead-detail',  name: '线索详情',   kind: 'panels',   snap: { kind: 'lead-detail', params: { leadId: 'L-1024' } }, pinned: true },
  { rid: 'my-crm:contact-card', name: '联系人卡片', kind: 'panels',   snap: { kind: 'contact-card', params: { leadId: 'L-1024' } }, pinned: false },
  { rid: 'my-crm:sales-kpi',    name: '销售业绩看板', kind: 'artifact', snap: { kind: 'sales-kpi', params: {}, size: { w: 460, h: 220 } }, pinned: false },
]

function RegistryScene() {
  const { project } = useSnapshots()
  const [pinned, setPinned] = React.useState(() =>
    Object.fromEntries(REG_RESOURCES.map(r => [r.rid, r.pinned]))
  )
  const [previewRid, setPreviewRid] = React.useState('my-crm:lead-list')
  const preview = REG_RESOURCES.find(r => r.rid === previewRid)

  return (
    <div className="reg-cols">
      <div className="reg-col1">
        <div className="reg-head"><span>组件资源 · COMPONENTS</span><span>{REG_RESOURCES.length}</span></div>
        <div className="reg-rows">
          {REG_RESOURCES.map(r => (
            <div key={r.rid} className="reg-row" onClick={() => setPreviewRid(r.rid)}
                 style={previewRid === r.rid ? { background: 'color-mix(in srgb, var(--accent) 8%, transparent)', boxShadow: 'inset 3px 0 0 var(--accent)' } : undefined}>
              <span className="r-name">{r.name}</span>
              <span className="r-kind">{r.kind}</span>
              {pinned[r.rid] ? (
                <span className="r-ops">
                  <button type="button" className="icon-btn snap-btn" title="投影为快照"
                          onClick={(e) => { e.stopPropagation(); project(r.snap) }}>
                    <SnapIcon />
                  </button>
                  <span className="pin-state" title="已固定到看板（pin 入口在 tile 上）">
                    <PinIcon filled /> 已 pin
                  </span>
                </span>
              ) : (
                <span className="r-ops">
                  <button type="button" className="icon-btn snap-btn" title="投影为快照"
                          onClick={(e) => { e.stopPropagation(); project(r.snap) }}>
                    <SnapIcon />
                  </button>
                  <button type="button" className="icon-btn" title="固定到看板 pin"
                          onClick={(e) => { e.stopPropagation(); setPinned(p => ({ ...p, [r.rid]: true })) }}>
                    <PinIcon />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="reg-detail">
        <div className="sec-label">预览 · PREVIEW <span style={{ fontWeight: 400 }}>{preview.rid}</span></div>
        <div className="panel-card">
          <div className="panel-head">
            <span className="d2-dot ok"></span>
            <span className="t">{preview.name}</span>
            <span className="rid">{preview.rid}</span>
            <span className="card-ops">
              <button type="button" className="icon-btn snap-btn" title="投影为快照"
                      onClick={() => project(preview.snap)}>
                <SnapIcon />
              </button>
            </span>
          </div>
          {preview.snap.kind === 'lead-list' && <LeadTable leads={LEADS} readonly />}
          {preview.snap.kind === 'lead-detail' && <LeadDetail lead={leadById('L-1024')} />}
          {preview.snap.kind === 'contact-card' && <ContactCard lead={leadById('L-1024')} />}
          {preview.snap.kind === 'sales-kpi' && <KpiBody />}
        </div>

        <div className="sec-label">说明 · NOTES</div>
        <div style={{ fontSize: 11, lineHeight: 1.8, color: 'var(--dsw-alias-label-secondary)' }}>
          <p>· <b style={{ color: 'var(--dsw-alias-label-primary)' }}>pin</b> = 固定进右侧看板，持久布局，随会话保留</p>
          <p>· <b style={{ color: 'var(--snap)' }}>投影为快照</b> = 复制当前参数生成悬浮窗，临时回看，关闭即销毁</p>
          <p>· 已 pin 的资源 pin 入口移到看板 tile 上，列表行只保留投影按钮</p>
          <p>· 同一资源可多次投影：例如详情页先选 L-1024 投影、再选 L-1026 投影，两个快照并存对比</p>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { RegistryScene })
