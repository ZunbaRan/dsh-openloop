/** 场景 ⑥ · 表单与批量：新建表单（校验失败演示）+ form 预设族规格 + 写路径时序 + 批量操作 */

const FORM_TAG_POOL = ['AI', '产品', '工具', '挑战', '复盘', '科普', '视频', '教程']
const FORM_SOURCE_OPTIONS = ['社群讨论', '自我复盘', '粉丝提议', '评论区提问', '竞品观察', '头脑风暴']

function SceneEdit() {
  // ---- 新建表单 ----
  const emptyForm = { title: '', tags: [], heat: 50, source: '社群讨论', note: '' }
  const [form, setForm] = React.useState(emptyForm)
  const [errors, setErrors] = React.useState({})
  const [created, setCreated] = React.useState([])
  const [pulse, setPulse] = React.useState(null)
  const firePulse = (msg) => { setPulse(msg); setTimeout(() => setPulse(null), 2600) }

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = '标题必填（期望：1–80 字符；实际：0）'
    else if (form.title.trim().length > 80) e.title = `标题超长（期望：≤80 字符；实际：${form.title.trim().length}）`
    if (form.tags.length === 0) e.tags = '至少选择 1 个标签（期望：1–4 项；实际：0）'
    if (form.tags.length > 4) e.tags = `标签过多（期望：≤4 项；实际：${form.tags.length}）`
    const heat = Number(form.heat)
    if (!Number.isFinite(heat) || heat < 0 || heat > 100) e.heat = `热度必须在 0–100（实际：${form.heat}）`
    if (form.note.length > 200) e.note = `备注超长（期望：≤200 字符；实际：${form.note.length}）`
    return e
  }

  const submit = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length > 0) return
    const record = { id: `i-new-${created.length + 1}`, ...form, title: form.title.trim(), status: '候选' }
    setCreated((c) => [record, ...c])
    setForm(emptyForm)
    firePulse(`studio:idea:created · ${record.id} · submitAction{collection:'ideas',method:'create'}`)
  }

  const toggleFormTag = (t) => setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }))

  // ---- 批量操作 ----
  const [bulkRows, setBulkRows] = React.useState(IDEAS.slice(3, 8).map((i) => ({ ...i })))
  const [selected, setSelected] = React.useState([])
  const toggleSel = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const bulkApply = (status, ev) => {
    setBulkRows((rows) => rows.map((r) => (selected.includes(r.id) ? { ...r, status } : r)))
    firePulse(`${ev} · ${selected.length} 条 · 一次批量 POST`)
    setSelected([])
  }

  return (
    <div className="forms-scroll" data-screen-label="scene-edit">
      <div className="forms-head">
        <h2>表单与批量 —— 创建、校验、批量，都是一等能力</h2>
        <div className="sub">form 预设族从「真空候选」升级为必备能力。panels 无网络 → 提交是声明式的（submitAction 写进契约，宿主写桥执行 POST）；校验 fail-closed，错误文案双语（用户可读 + Agent 可自修正）。</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 14, alignItems: 'start' }}>
        {/* 左：新建表单 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="form-col-head" style={{ marginBottom: 8 }}>
              <span className="fc-name">新建想法</span>
              <span className="kind-badge local">form 预设族</span>
              {pulse ? <span className="event-pulse">{pulse}</span> : null}
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--dsw-alias-label-caption)' }}>studio:idea-create</span>
            </div>
            <PanelShell preset="form">
              <div className="detail-section" style={{ borderTop: 0 }}>
                {Object.keys(errors).length > 0 ? (
                  <div className="ol-callout warn" style={{ marginBottom: 12 }}>
                    <span>⚠</span>
                    <span>校验未通过（fail-closed）：{Object.keys(errors).length} 个字段需要修正。错误文案同时面向用户与 Agent——agent 读到同样的文案可自修正重试。</span>
                  </div>
                ) : null}
                <div className="ol-field">
                  <span className="fl">标题 <span className="req">*</span> <span className="fh">1–80 字符</span></span>
                  <input className={`ol-input ${errors.title ? 'err' : ''}`} placeholder="例如：Claude Code 隐藏功能 Top12" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  {errors.title ? <span className="ol-ferr">{errors.title}</span> : null}
                </div>
                <div className="ol-field">
                  <span className="fl">标签 <span className="req">*</span> <span className="fh">1–4 项</span></span>
                  <div className="multi-tags">
                    {FORM_TAG_POOL.map((t) => <button key={t} className={`multi-tag ${form.tags.includes(t) ? 'on' : ''}`} onClick={() => toggleFormTag(t)}>{t}</button>)}
                  </div>
                  {errors.tags ? <span className="ol-ferr">{errors.tags}</span> : null}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="ol-field">
                    <span className="fl">初始热度 <span className="fh">0–100</span></span>
                    <input className={`ol-input ${errors.heat ? 'err' : ''}`} type="number" min="0" max="100" value={form.heat} onChange={(e) => setForm((f) => ({ ...f, heat: e.target.value }))} />
                    {errors.heat ? <span className="ol-ferr">{errors.heat}</span> : null}
                  </div>
                  <div className="ol-field">
                    <span className="fl">来源</span>
                    <select className="ol-select" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
                      {FORM_SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ol-field">
                  <span className="fl">备注 <span className="fh">≤200 字符，可选</span></span>
                  <textarea className={`ol-textarea ${errors.note ? 'err' : ''}`} placeholder="为什么这个想法值得做…" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
                  {errors.note ? <span className="ol-ferr">{errors.note}</span> : null}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button className="save-btn" onClick={submit}>创建想法</button>
                  <button className="cancel-btn" onClick={() => { setForm(emptyForm); setErrors({}) }}>清空</button>
                  <span className="ol-micro" style={{ marginLeft: 'auto' }}>试试空标题直接「创建想法」→ 看校验失败态</span>
                </div>
              </div>
            </PanelShell>
          </div>

          {created.length > 0 ? (
            <PanelShell preset="data-table" title="本次会话已创建" desc="创建成功后写路径回环：列表/详情/看板经 relations + rev 轻探自动刷新">
              <DataTableMock compact
                columns={[
                  { key: 'title', label: '标题' },
                  { key: 'tags', label: '标签', render: (r) => <TagList tags={r.tags} /> },
                  { key: 'heat', label: '热度', num: true },
                  { key: 'status', label: '状态', render: () => <ToneBadge tone="neutral">候选</ToneBadge> },
                ]}
                rows={created}
                rowKey="id"
              />
            </PanelShell>
          ) : null}

          {/* 批量操作 */}
          <div>
            <div className="form-col-head" style={{ marginBottom: 8 }}>
              <span className="fc-name">批量操作</span>
              <span className="kind-badge builtin">data-table 内建</span>
            </div>
            <PanelShell preset="data-table">
              {selected.length > 0 ? (
                <div style={{ padding: '10px 12px 0' }}>
                  <div className="bulk-bar">
                    <b>已选 {selected.length} 条</b>
                    <button className="ol-act-btn" onClick={() => bulkApply('采中', 'studio:ideas:bulk_pick')}>批量采中</button>
                    <button className="ol-act-btn muted" onClick={() => bulkApply('归档', 'studio:ideas:bulk_archive')}>批量归档</button>
                    <span style={{ flex: 1 }}></span>
                    <button className="cancel-btn" style={{ padding: '2px 9px', fontSize: 10 }} onClick={() => setSelected([])}>清除选择</button>
                  </div>
                </div>
              ) : null}
              <DataTableMock
                columns={[
                  { key: 'sel', label: '', render: (r) => <input type="checkbox" className="ol-checkbox" checked={selected.includes(r.id)} onChange={() => toggleSel(r.id)} onClick={(e) => e.stopPropagation()} /> },
                  { key: 'title', label: '想法' },
                  { key: 'heat', label: '热度', num: true },
                  { key: 'status', label: '状态', render: (r) => <ToneBadge tone={IDEA_STATUS_TONE[r.status]}>{r.status}</ToneBadge> },
                ]}
                rows={bulkRows}
                rowKey="id"
              />
            </PanelShell>
          </div>
        </div>

        {/* 右：form 预设族规格 + 写路径时序 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="form-col-head" style={{ marginBottom: 8 }}>
              <span className="fc-name">form 预设族规格</span>
              <span className="kind-badge local">契约草案</span>
            </div>
            <table className="matrix">
              <thead>
                <tr><th style={{ width: 118 }}>kind</th><th>关键 props / 说明</th></tr>
              </thead>
              <tbody>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>form</td><td>title · fields[] · submitLabel · <b>submitAction{'{collection, method, recordId?}'}</b> · layout(single/two-col)</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-text</td><td>label · required · maxLength · placeholder</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-textarea</td><td>label · maxLength · rows</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-number</td><td>label · min/max · step</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-select</td><td>label · options[](enum) · defaultValue</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-multi-select</td><td>label · options[] · min/maxItems（tags 场景）</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-date</td><td>label · min/max（排期/截稿场景）</td></tr>
                <tr><td className="rowhead mono" style={{ fontSize: 10 }}>input-toggle</td><td>label · onLabel/offLabel（布尔字段）</td></tr>
              </tbody>
            </table>
            <div className="gap-note" style={{ marginTop: 8 }}>
              <b>声明式提交是硬约束</b>：panels CSP 禁网络，表单本体不能 fetch——submitAction 由宿主写桥翻译成 POST（30s 去重 / pendingSync 降级复用既有机制）。校验 fail-closed，错误消息带「期望值 vs 实际值」，用户和 Agent 读同一份文案。
            </div>
          </div>

          <div>
            <div className="form-col-head" style={{ marginBottom: 8 }}>
              <span className="fc-name">写路径时序（五模式共用）</span>
            </div>
            <PanelShell preset={null}>
              <div className="detail-section" style={{ borderTop: 0 }}>
                <div className="steps">
                  <div className="step"><span className="sn">1</span><div className="sb"><div className="st">本地校验</div><div className="sd">契约 fail-closed；失败则字段级标错，不发请求</div></div></div>
                  <div className="step"><span className="sn">2</span><div className="sb"><div className="st">host 写桥 POST</div><div className="sd">服务端优先；浏览器侧 30s 去重；降级时 pendingSync 标记 + 镜像保留</div></div></div>
                  <div className="step"><span className="sn">3</span><div className="sb"><div className="st">PB 写入 + app_events 落库</div><div className="sd">一条事件带 changed fields 与来源（agent / panel:user / bulk）</div></div></div>
                  <div className="step"><span className="sn">4</span><div className="sb"><div className="st">三处刷新</div><div className="sd">本面板 → relations 消费方（{'{{param}}'} 重取）→ 看板 tile rev 轻探</div></div></div>
                  <div className="step"><span className="sn">5</span><div className="sb"><div className="st">自观察可见</div><div className="sd">event-log 实时出现该事件；恢复后 reconcile 对齐镜像</div></div></div>
                </div>
              </div>
            </PanelShell>
          </div>

          <div className="gap-note">
            <b>候选增强（不预建）</b>：记录级 version 冲突提示（用户与 Agent 同改一条时）、event-sourced 撤销（点事件回滚）。真机痛点出现再立项。
          </div>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { SceneEdit })
