/** 场景 1 · 对话流：系统诞生——Agent 生成 + 数据绑定 + relations 联动 + 写路径 + 状态筛选/轻操作 */

function SceneChat() {
  const [ideas, setIdeas] = React.useState(IDEAS.map((i) => ({ ...i })))
  const [filter, setFilter] = React.useState('全部')
  const [selIdea, setSelIdea] = React.useState('i1')
  const [advanced, setAdvanced] = React.useState(false)
  const [pulse, setPulse] = React.useState(null)

  const idea = ideas.find((i) => i.id === selIdea)
  const linkedDrafts = DRAFTS.filter((d) => d.ideaId === selIdea)
  const d3Stage = advanced ? '制作中' : '排期中'

  const counts = Object.fromEntries(IDEA_FILTERS.map((f) => [f, f === '全部' ? ideas.length : ideas.filter((i) => i.status === f).length]))
  const visible = filter === '全部' ? ideas : ideas.filter((i) => i.status === filter)

  const quickAction = (row, next, ev) => {
    setIdeas((list) => list.map((i) => (i.id === row.id ? { ...i, status: next } : i)))
    setPulse(`${ev} · ${row.id}`)
    setTimeout(() => setPulse(null), 2400)
  }

  return (
    <div className="scene-col">
      <div className="chat-scroll" data-screen-label="scene-chat">
        <div className="msg user">
          <div className="who">阿洛 · 14:28</div>
          <div className="bubble">帮我搭一个内容创作工作室：想法库、创作管线、排期日历、素材库都要有，数据存本地后端，后面我自己拖看板组装。</div>
        </div>

        <div className="msg agent">
          <div className="who">DSH Agent</div>
          <div className="bubble">
            <div className="tool-line"><span className="tname">app_backend</span><span>create_collections → ideas / drafts / assets / calendar · 5 集合已建（幂等）</span></div>
            <div className="tool-line"><span className="tname">app_backend</span><span>register_api → studio:ideas … studio:events · 5 个 API 资源</span></div>
            <div className="tool-line"><span className="tname">panel</span><span>生成「想法库」data-table 预设 · 数据绑定 studio:ideas（服务端注入，面板零网络）</span></div>
            <div style={{ marginTop: 6 }}>骨架好了。想法库带状态机（候选/采中/搁置/归档），行内可以直接轻操作——点一行能看到它名下的稿件，不用等我：</div>
          </div>
        </div>

        <div className="stream-card">
          <div className="linked-banner">
            <span>panel · 对话流内渲染</span>
            {pulse ? <span className="event-pulse">{pulse}</span> : null}
            <span style={{ marginLeft: 'auto' }} className="mono">studio:idea-bank</span>
          </div>
          <PanelShell preset="data-table" title="想法库" desc="按热度排序 · 数据绑定 studio:ideas · 状态机驱动筛选">
            <FilterChips options={IDEA_FILTERS} counts={counts} value={filter} onChange={setFilter} />
            <DataTableMock
              columns={[
                { key: 'title', label: '想法', render: (r) => <span style={{ fontWeight: 500 }}>{r.title}</span> },
                { key: 'tags', label: '标签', render: (r) => <TagList tags={r.tags} /> },
                { key: 'heat', label: '热度', num: true, render: (r) => <b>{r.heat}</b> },
                { key: 'status', label: '状态', render: (r) => <ToneBadge tone={IDEA_STATUS_TONE[r.status]}>{r.status}</ToneBadge> },
                { key: 'act', label: '操作', render: (r) => (
                  <span style={{ display: 'inline-flex', gap: 5 }} onClick={(e) => e.stopPropagation()}>
                    {r.status === '候选' ? <button className="ol-act-btn" onClick={() => quickAction(r, '采中', 'studio:idea:pick')}>采中</button> : null}
                    {r.status === '采中' ? <button className="ol-act-btn muted" onClick={() => quickAction(r, '搁置', 'studio:idea:hold')}>搁置</button> : null}
                    {r.status === '搁置' ? <button className="ol-act-btn" onClick={() => quickAction(r, '候选', 'studio:idea:revive')}>复活</button> : null}
                    {r.status === '归档' ? <span className="ol-micro">只读</span> : null}
                  </span>
                ) },
              ]}
              rows={visible}
              rowKey="id"
              selKey={selIdea}
              onSelect={(r) => setSelIdea(r.id)}
            />
            {visible.length === 0 ? (
              <div className="ol-meta" style={{ padding: '14px 12px' }}>「{filter}」状态下暂无想法——空态也该是设计的一部分。</div>
            ) : null}
            <div className="linked-slot">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <span className="event-pulse">studio:idea:open</span>
                <span className="ol-micro">→ studio:draft-list · 参数 {'{{ideaId}}'} = {selIdea} · 即时取数，不经 Agent</span>
                <span className="ol-micro" style={{ marginLeft: 'auto' }}>详情页见场景 ⑤</span>
              </div>
              {linkedDrafts.length > 0 ? (
                <DataTableMock
                  compact
                  columns={[
                    { key: 'title', label: '关联稿件' },
                    { key: 'stage', label: '阶段', render: (r) => <ToneBadge tone={r.stage === '已发布' ? 'success' : r.stage === '制作中' ? 'info' : 'warning'}>{r.id === 'd3' ? d3Stage : r.stage}</ToneBadge> },
                    { key: 'platform', label: '平台' },
                    { key: 'due', label: '截稿', num: true },
                  ]}
                  rows={linkedDrafts}
                  rowKey="id"
                />
              ) : (
                <div className="ol-meta" style={{ padding: '6px 2px' }}>「{idea ? idea.title : ''}」名下还没有稿件——可在详情页「立项」。</div>
              )}
            </div>
          </PanelShell>
        </div>

        <div className="msg user">
          <div className="who">阿洛 · 14:32</div>
          <div className="bubble">「30 天挑战」预告片反响不错，把合集推进到制作中吧。</div>
        </div>

        <div className="msg agent">
          <div className="who">DSH Agent</div>
          <div className="bubble">
            <div className="tool-line"><span className="tname">app_backend</span><span>write studio/drafts · d3 stage：排期中 → 制作中（写路径服务端优先，30s 去重）</span></div>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              已推进。
              {!advanced ? (
                <button className="pc-btn" onClick={() => setAdvanced(true)}>查看状态变化</button>
              ) : (
                <React.Fragment>
                  <ToneBadge tone="warning">排期中</ToneBadge>
                  <span style={{ color: 'var(--dsw-alias-label-caption)' }}>→</span>
                  <ToneBadge tone="info">制作中</ToneBadge>
                  <span className="event-pulse">studio:draft:stage_changed · d3</span>
                </React.Fragment>
              )}
            </div>
            {advanced ? <div className="ol-micro" style={{ marginTop: 6 }}>该事件已写入 app_events，自观察层 event-log 可见；看板上的管线 tile 下次 refresh 自动跟上。</div> : null}
          </div>
        </div>

        <div className="widget-card">
          <div className="wc-label">show_widget · 流内小卡</div>
          <div className="wc-value">本周 6 更</div>
          <div className="wc-sub">排期密度高于近 4 周均值 · 建议留出 1 天缓冲</div>
          <div className="wc-bars">
            <i style={{ height: '35%' }}></i><i style={{ height: '50%' }}></i><i style={{ height: '42%' }}></i><i style={{ height: '64%' }}></i><i style={{ height: '58%' }}></i><i style={{ height: '88%' }}></i><i style={{ height: '100%' }}></i>
          </div>
        </div>
      </div>

      <div className="chat-input">
        <div className="box">
          <span style={{ flex: 1 }}>继续说，比如「给素材库加个按类型筛选」…</span>
          <span className="kind-badge builtin">Agent Native</span>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { SceneChat })
