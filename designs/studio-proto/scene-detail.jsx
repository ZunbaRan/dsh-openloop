/** 场景 ⑤ · 详情与独立编辑组件：详情只读 + 状态流转；「编辑」= relations 浮窗打开 studio:idea-edit（另一个组件） */

const TAG_POOL = ['AI', '产品', '工具', '挑战', '复盘', '科普', '视频', '自动化', '教程', '播客', '实验']
const SOURCE_OPTIONS = ['社群讨论', '自我复盘', '粉丝提议', '评论区提问', '竞品观察', '头脑风暴']

function SceneDetail() {
  const [idea, setIdea] = React.useState({ ...IDEAS[0], note: '重点做「隐藏功能」而非入门——差异化在深挖 5 个以上官方文档没强调的点。' })
  const [pulse, setPulse] = React.useState(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [draft, setDraft] = React.useState(null)

  const firePulse = (msg) => { setPulse(msg); setTimeout(() => setPulse(null), 2600) }

  const act = (next, ev) => {
    setIdea((s) => ({ ...s, status: next }))
    firePulse(`${ev} · ${idea.id}`)
  }

  // 「编辑」不是详情页的模式开关——是 emits studio:idea:edit，打开独立编辑组件（浮窗）
  const openEdit = () => {
    setDraft({ title: idea.title, tags: [...idea.tags], heat: idea.heat, source: idea.source, note: idea.note })
    setEditOpen(true)
  }
  const saveEdit = () => {
    const changed = ['title', 'heat', 'source', 'note'].filter((k) => String(draft[k]) !== String(idea[k])).length + (draft.tags.join() !== idea.tags.join() ? 1 : 0)
    setIdea((s) => ({ ...s, title: draft.title.trim() || s.title, tags: draft.tags, heat: Number(draft.heat) || 0, source: draft.source, note: draft.note }))
    setEditOpen(false)
    firePulse(`studio:idea:updated · ${changed} 处字段 → 详情/想法库刷新`)
  }
  const toggleTag = (t) => setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }))

  const linkedDrafts = DRAFTS.filter((d) => d.ideaId === idea.id)

  return (
    <div className="forms-scroll" data-screen-label="scene-detail">
      <div className="forms-head">
        <h2>详情页与独立编辑组件 —— 读组件只读，编辑是另一个 panel</h2>
        <div className="sub">studio:idea-detail（只读）emits studio:idea:edit → studio:idea-edit（form 组件，浮窗打开）→ emits studio:idea:updated → 详情与想法库刷新。编辑能力不靠任何组件内嵌「模式开关」。</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* 左：详情页（只读 + 状态流转）+ 编辑浮窗 */}
        <div style={{ position: 'relative' }}>
          <div className="form-col-head" style={{ marginBottom: 8 }}>
            <span className="fc-name">想法详情页</span>
            <span className="kind-badge local">panel · 只读组合</span>
            {pulse ? <span className="event-pulse">{pulse}</span> : null}
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dsw-alias-label-caption)' }}>studio:idea-detail</span>
          </div>
          <PanelShell preset="composite">
            <div className="detail-hero">
              <div className="dh-title">{idea.title}</div>
              <div className="dh-row">
                <ToneBadge tone={IDEA_STATUS_TONE[idea.status]}>{idea.status}</ToneBadge>
                <TagList tags={idea.tags} />
                <span className="ol-micro">创建于 {idea.created} · 来源 {idea.source}</span>
              </div>
            </div>

            <DetailGridMock cells={[
              { k: '热度', render: () => <b style={{ fontVariantNumeric: 'tabular-nums' }}>{idea.heat}</b> },
              { k: '标签', render: () => idea.tags.join(' / ') },
              { k: '状态', render: () => idea.status },
              { k: '关联稿件', render: () => `${linkedDrafts.length} 条` },
              { k: '创建时间', render: () => `2026-${idea.created}` },
              { k: '来源', render: () => idea.source },
            ]} />

            <div className="detail-actions">
              <span className="ol-micro" style={{ marginRight: 4 }}>操作：</span>
              {idea.status === '候选' ? <button className="ol-act-btn" onClick={() => act('采中', 'studio:idea:pick')}>采中</button> : null}
              {idea.status === '采中' ? (
                <React.Fragment>
                  <button className="ol-act-btn" onClick={() => firePulse('studio:idea:promote · i1 → 新建稿件（表单组件）')}>立项 → 建稿件</button>
                  <button className="ol-act-btn muted" onClick={() => act('搁置', 'studio:idea:hold')}>搁置</button>
                </React.Fragment>
              ) : null}
              {idea.status === '搁置' ? <button className="ol-act-btn" onClick={() => act('候选', 'studio:idea:revive')}>复活回候选</button> : null}
              {idea.status !== '归档' ? <button className="ol-act-btn muted" onClick={() => act('归档', 'studio:idea:archive')}>归档</button> : null}
              <span style={{ flex: 1 }}></span>
              <button className="ol-act-btn" onClick={openEdit}>✎ 编辑（emits idea:edit）</button>
            </div>

            <div className="detail-section">
              <div className="ds-label">关联稿件 · consumes studio:idea:open {'{{ideaId}}'}</div>
              {linkedDrafts.length > 0 ? (
                <DataTableMock compact
                  columns={[
                    { key: 'title', label: '稿件' },
                    { key: 'stage', label: '阶段', render: (r) => <ToneBadge tone={r.stage === '已发布' ? 'success' : 'info'}>{r.stage}</ToneBadge> },
                    { key: 'platform', label: '平台' },
                    { key: 'due', label: '截稿', num: true },
                  ]}
                  rows={linkedDrafts}
                  rowKey="id"
                />
              ) : (
                <div className="ol-meta">还没有关联稿件，点上方「立项」创建第一条。</div>
              )}
            </div>

            <div className="detail-section">
              <div className="ds-label">状态时间线 · timeline 预设复用</div>
              <TimelineMock items={[
                { time: '09-01', title: '创建（候选）', detail: '来源：社群讨论', status: 'past' },
                { time: '09-02', title: '采中', detail: '热度 78 → 进本周选题', status: 'past' },
                { time: '09-03', title: '立项 → d1 / d4', detail: '一稿多投：B站视频 + 公众号图文', status: 'past' },
                { time: '09-08', title: '待发', detail: 'B站定时 12:00', status: 'current' },
              ]} />
            </div>

            <div className="detail-section">
              <div className="ds-label">备注 · markdown 预设复用</div>
              <div className="ol-md"><p>{idea.note}</p></div>
            </div>
          </PanelShell>

          {/* 编辑 = 独立组件 studio:idea-edit，以 relations 浮窗打开（与看板浮窗同一机制） */}
          {editOpen && draft ? (
            <div className="float-win" style={{ left: 48, top: 56, width: 420, zIndex: 20 }}>
              <div className="fw-head">
                <span className="t">编辑想法</span>
                <span className="rel-tag">studio:idea-edit</span>
                <div className="ops">
                  <button className="op" onClick={() => setEditOpen(false)}>✕</button>
                </div>
              </div>
              <div className="fw-body" style={{ maxHeight: 420 }}>
                <div style={{ padding: 14 }}>
                  <div className="ol-field">
                    <span className="fl">标题 <span className="req">*</span></span>
                    <input className="ol-input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                  </div>
                  <div className="ol-field">
                    <span className="fl">标签 <span className="fh">1–4 项</span></span>
                    <div className="multi-tags">
                      {TAG_POOL.map((t) => <button key={t} className={`multi-tag ${draft.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>)}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="ol-field">
                      <span className="fl">热度 <span className="fh">0–100</span></span>
                      <input className="ol-input" type="number" min="0" max="100" value={draft.heat} onChange={(e) => setDraft((d) => ({ ...d, heat: e.target.value }))} />
                    </div>
                    <div className="ol-field">
                      <span className="fl">来源</span>
                      <select className="ol-select" value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}>
                        {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="ol-field" style={{ marginBottom: 4 }}>
                    <span className="fl">备注</span>
                    <textarea className="ol-textarea" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
                  </div>
                  <div className="ol-micro" style={{ marginBottom: 10 }}>consumes studio:idea:edit {'{{ideaId}}'} = {idea.id} · submitAction{'{collection:"ideas",method:"update",recordId:"i1"}'}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="save-btn" onClick={saveEdit}>保存（一次 PATCH）</button>
                    <button className="cancel-btn" onClick={() => setEditOpen(false)}>取消</button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* 右：状态机 + 读写组件模型 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="form-col-head" style={{ marginBottom: 8 }}>
              <span className="fc-name">想法状态机</span>
              <span className="kind-badge builtin">flow 预设</span>
            </div>
            <PanelShell preset="flow">
              <FlowMock nodes={[
                { key: 's1', label: '候选', count: 4, tone: 'neutral', detail: '池子默认态 · 可采中/归档' },
                { key: 's2', label: '采中', count: 3, tone: 'primary', detail: '进入本周选题 · 可立项/搁置', edgeLabel: '采中' },
                { key: 's3', label: '立项（转稿件）', count: 2, tone: 'info', detail: 'emit studio:idea:promote → 建 draft', edgeLabel: '立项' },
                { key: 's4', label: '搁置', count: 1, tone: 'warning', detail: '可复活回候选', edgeLabel: '暂缓' },
                { key: 's5', label: '归档', count: 1, tone: 'neutral', detail: '只读 · 列表默认折叠', edgeLabel: '归档' },
              ]} />
            </PanelShell>
          </div>

          <div>
            <div className="form-col-head" style={{ marginBottom: 8 }}>
              <span className="fc-name">读写组件模型</span>
              <span className="kind-badge thirdparty">组件即组件</span>
            </div>
            <table className="matrix">
              <thead>
                <tr><th style={{ width: 96 }}>能力</th><th>落在哪个组件</th></tr>
              </thead>
              <tbody>
                <tr><td className="rowhead">看详情</td><td>studio:idea-detail（只读组合：detail-grid + 关联列表 + 时间线）</td></tr>
                <tr><td className="rowhead">状态流转</td><td>详情页 action 按钮（单字段状态机跃迁，一键写）</td></tr>
                <tr><td className="rowhead">改字段</td><td><b>studio:idea-edit</b>（独立 form 组件）——详情 emits idea:edit，浮窗打开，保存后 emits idea:updated 通知详情/列表刷新</td></tr>
                <tr><td className="rowhead">建记录</td><td>studio:idea-create（独立 form 组件，强校验，场景⑥）</td></tr>
                <tr><td className="rowhead">批量</td><td>列表内建多选 → bulk bar（data-table 职责）</td></tr>
                <tr><td className="rowhead">语义批量</td><td>对话（「热度 >80 的都采中」→ agent 写）</td></tr>
              </tbody>
            </table>
            <div className="gap-note" style={{ marginTop: 8 }}>
              原则：<b>编辑和详情是两个组件</b>。panels/artifacts 没有预留「编辑模式」这种组件内开关——想要编辑就 emits 一个事件，让编辑组件以浮窗/跳转出现。这与 relations 的既有机制完全同构，不发明新交互范式。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { SceneDetail })
