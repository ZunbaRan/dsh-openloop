/** 场景 ⑤ · 详情与写操作：详情页组合模式 + 行内编辑 + 编辑模式（dirty tracking）+ 写操作全景 */

const TAG_POOL = ['AI', '产品', '工具', '挑战', '复盘', '科普', '视频', '自动化', '教程', '播客', '实验']
const SOURCE_OPTIONS = ['社群讨论', '自我复盘', '粉丝提议', '评论区提问', '竞品观察', '头脑风暴']

function SceneDetail() {
  const [idea, setIdea] = React.useState({ ...IDEAS[0], note: '重点做「隐藏功能」而非入门——差异化在深挖 5 个以上官方文档没强调的点。' })
  const [pulse, setPulse] = React.useState(null)
  const [editMode, setEditMode] = React.useState(false)
  const [draft, setDraft] = React.useState(null)
  const [inlineTitle, setInlineTitle] = React.useState(false)
  const [titleBuf, setTitleBuf] = React.useState('')

  const firePulse = (msg) => { setPulse(msg); setTimeout(() => setPulse(null), 2600) }

  const act = (next, ev) => {
    setIdea((s) => ({ ...s, status: next }))
    firePulse(`${ev} · ${idea.id}`)
  }

  // 行内编辑：标题（单字段，最快路径）
  const startInline = () => { setTitleBuf(idea.title); setInlineTitle(true) }
  const commitInline = () => {
    const v = titleBuf.trim()
    setInlineTitle(false)
    if (v && v !== idea.title) {
      setIdea((s) => ({ ...s, title: v }))
      firePulse('studio:idea:updated · title')
    }
  }

  // 编辑模式：多字段，一次 PATCH
  const enterEdit = () => { setDraft({ title: idea.title, tags: [...idea.tags], heat: idea.heat, source: idea.source, note: idea.note }); setEditMode(true) }
  const dirtyKeys = editMode && draft ? ['title', 'heat', 'source', 'note'].filter((k) => String(draft[k]) !== String(idea[k])).concat(draft.tags.join() !== idea.tags.join() ? ['tags'] : []) : []
  const saveEdit = () => {
    setIdea((s) => ({ ...s, title: draft.title.trim() || s.title, tags: draft.tags, heat: Number(draft.heat) || 0, source: draft.source, note: draft.note }))
    setEditMode(false)
    firePulse(`studio:idea:updated · ${dirtyKeys.length} 处字段（一次 PATCH）`)
  }
  const cancelEdit = () => { setDraft(null); setEditMode(false) }
  const toggleTag = (t) => setDraft((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }))

  const linkedDrafts = DRAFTS.filter((d) => d.ideaId === idea.id)

  return (
    <div className="forms-scroll" data-screen-label="scene-detail">
      <div className="forms-head">
        <h2>详情页与写操作 —— 编辑是一等能力：用户拥有选择权</h2>
        <div className="sub">单字段用行内编辑（点开就改）；多字段用编辑模式（一次 PATCH）；语义/批量用对话。三种都在，用户按场景选最快的。</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* 左：详情页本体（含编辑能力） */}
        <div>
          <div className="form-col-head" style={{ marginBottom: 8 }}>
            <span className="fc-name">想法详情页</span>
            <span className="kind-badge local">panel · 组合模式</span>
            {pulse ? <span className="event-pulse">{pulse}</span> : null}
            <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dsw-alias-label-caption)' }}>studio:idea-detail</span>
          </div>
          <PanelShell preset="composite">
            <div className="detail-hero">
              {inlineTitle ? (
                <input
                  className="inline-edit-input"
                  value={titleBuf}
                  autoFocus
                  onChange={(e) => setTitleBuf(e.target.value)}
                  onBlur={commitInline}
                  onKeyDown={(e) => { if (e.key === 'Enter') commitInline(); if (e.key === 'Escape') setInlineTitle(false) }}
                />
              ) : (
                <div className="dh-title">
                  {idea.title}
                  {!editMode ? <button className="pencil" title="行内编辑（Enter 保存 / Esc 取消）" onClick={startInline}>✎ 改</button> : null}
                </div>
              )}
              <div className="dh-row">
                <ToneBadge tone={IDEA_STATUS_TONE[idea.status]}>{idea.status}</ToneBadge>
                <TagList tags={idea.tags} />
                <span className="ol-micro">创建于 {idea.created} · 来源 {idea.source}</span>
                <span style={{ flex: 1 }}></span>
                {!editMode ? (
                  <button className="ol-act-btn" onClick={enterEdit}>进入编辑模式</button>
                ) : null}
              </div>
            </div>

            {!editMode ? (
              <DetailGridMock cells={[
                { k: '热度', render: () => <b style={{ fontVariantNumeric: 'tabular-nums' }}>{idea.heat}</b> },
                { k: '标签', render: () => idea.tags.join(' / ') },
                { k: '状态', render: () => idea.status },
                { k: '关联稿件', render: () => `${linkedDrafts.length} 条` },
                { k: '创建时间', render: () => `2026-${idea.created}` },
                { k: '来源', render: () => idea.source },
              ]} />
            ) : (
              <div className="detail-section" style={{ borderTop: '1px solid var(--openloop-border-muted)' }}>
                <div className="ol-field">
                  <span className="fl">标题 <span className="req">*</span>{dirtyKeys.includes('title') ? <span className="dirty-dot"></span> : null}</span>
                  <input className="ol-input" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
                </div>
                <div className="ol-field">
                  <span className="fl">标签{dirtyKeys.includes('tags') ? <span className="dirty-dot"></span> : null}</span>
                  <div className="multi-tags">
                    {TAG_POOL.map((t) => <button key={t} className={`multi-tag ${draft.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>)}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ol-field">
                    <span className="fl">热度 <span className="fh">0–100</span>{dirtyKeys.includes('heat') ? <span className="dirty-dot"></span> : null}</span>
                    <input className="ol-input" type="number" min="0" max="100" value={draft.heat} onChange={(e) => setDraft((d) => ({ ...d, heat: e.target.value }))} />
                  </div>
                  <div className="ol-field">
                    <span className="fl">来源{dirtyKeys.includes('source') ? <span className="dirty-dot"></span> : null}</span>
                    <select className="ol-select" value={draft.source} onChange={(e) => setDraft((d) => ({ ...d, source: e.target.value }))}>
                      {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ol-field" style={{ marginBottom: 0 }}>
                  <span className="fl">备注{dirtyKeys.includes('note') ? <span className="dirty-dot"></span> : null}</span>
                  <textarea className="ol-textarea" value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))} />
                </div>
              </div>
            )}

            {!editMode ? (
              <div className="detail-actions">
                <span className="ol-micro" style={{ marginRight: 4 }}>状态流转：</span>
                {idea.status === '候选' ? <button className="ol-act-btn" onClick={() => act('采中', 'studio:idea:pick')}>采中</button> : null}
                {idea.status === '采中' ? (
                  <React.Fragment>
                    <button className="ol-act-btn" onClick={() => firePulse('studio:idea:promote · i1 → 新建稿件（场景⑥ 表单）')}>立项 → 建稿件</button>
                    <button className="ol-act-btn muted" onClick={() => act('搁置', 'studio:idea:hold')}>搁置</button>
                  </React.Fragment>
                ) : null}
                {idea.status === '搁置' ? <button className="ol-act-btn" onClick={() => act('候选', 'studio:idea:revive')}>复活回候选</button> : null}
                {idea.status !== '归档' ? <button className="ol-act-btn muted" onClick={() => act('归档', 'studio:idea:archive')}>归档</button> : null}
                <span className="ol-micro" style={{ marginLeft: 'auto' }}>每次点击 = 一次 POST → app_events 留痕</span>
              </div>
            ) : (
              <div className="edit-bar">
                <span className="ol-micro">{dirtyKeys.length > 0 ? `${dirtyKeys.length} 处修改` : '尚未修改'}</span>
                <span style={{ flex: 1 }}></span>
                <button className="cancel-btn" onClick={cancelEdit}>取消</button>
                <button className="save-btn" disabled={dirtyKeys.length === 0} onClick={saveEdit}>保存（一次 PATCH）</button>
              </div>
            )}

            {!editMode ? (
              <React.Fragment>
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
              </React.Fragment>
            ) : null}
          </PanelShell>
        </div>

        {/* 右：状态机 + 写操作全景 */}
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
              <span className="fc-name">写操作全景</span>
              <span className="kind-badge thirdparty">五模式 · 用户选择</span>
            </div>
            <table className="matrix">
              <thead>
                <tr><th style={{ width: 86 }}>模式</th><th>粒度 / 触发</th><th>何时最快</th></tr>
              </thead>
              <tbody>
                <tr><td className="rowhead">① 行内编辑</td><td>单字段 · 点 ✎ / 双击值</td><td>改标题、改热度——一句话都嫌多的场景</td></tr>
                <tr><td className="rowhead">② 编辑模式</td><td>单记录多字段 · 详情页 toggle</td><td>一次改一条的多个字段（本页左侧演示中）</td></tr>
                <tr><td className="rowhead">③ 新建表单</td><td>整条记录 · form 预设族</td><td>创建 + 强校验（场景⑥）</td></tr>
                <tr><td className="rowhead">④ 批量操作</td><td>多记录单动作 · 列表多选</td><td>批量归档 / 批量采中（场景⑥）</td></tr>
                <tr><td className="rowhead">⑤ 对话编辑</td><td>语义 / 跨记录 · 自然语言</td><td>「把热度 &gt;80 的都采中」这类条件批量</td></tr>
              </tbody>
            </table>
            <div className="gap-note" style={{ marginTop: 8 }}>
              原则：<b>用户拥有选择权</b>——对话是选项之一而非替代。所有模式共用同一条写路径（校验 → host 写桥 → PB → 事件 → 三处刷新），event-log 对五种模式一视同仁地留痕（src 区分 agent / panel:user）。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { SceneDetail })
