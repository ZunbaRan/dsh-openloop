/** 场景 3 · APP 三列：资源注册表 + 关联声明 + 详情预览（注册表只管寻址/预览/pin——编辑是独立组件） */

const REG_APPS = [
  { id: 'openloop', name: 'openloop', kind: 'builtin', sub: '43 预设 · 自管理四件套', dot: 'ok' },
  { id: 'studio', name: 'studio', kind: 'local', sub: '12 组件 · 10 API · 本地后端', dot: 'ok' },
  { id: 'excalidraw', name: 'excalidraw', kind: 'thirdparty', sub: 'MCP Apps 2.0 · 4 工具', dot: 'ok' },
  { id: 'tldraw', name: 'tldraw', kind: 'thirdparty', sub: '不可达 · 惰性重连中', dot: 'off' },
]

function stageNodeDetail(s) {
  const bits = []
  if (s.stuck) bits.push(`⚠ 滞留 ${s.aging}`)
  else if (s.aging) bits.push(`平均滞留 ${s.aging}`)
  if (s.top && s.top[0]) bits.push(s.top[0])
  return bits.join(' · ')
}

function RegistryPreview({ rid }) {
  if (rid === 'studio:system-map') {
    return (
      <div className="mini-topo">
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <line x1="50%" y1="26" x2="50%" y2="64" stroke="color-mix(in srgb, var(--art-accent) 42%, transparent)" strokeWidth="1.5" />
          <line x1="50%" y1="64" x2="16%" y2="128" stroke="color-mix(in srgb, var(--art-accent) 42%, transparent)" strokeWidth="1.5" />
          <line x1="50%" y1="64" x2="42%" y2="128" stroke="color-mix(in srgb, var(--art-accent) 42%, transparent)" strokeWidth="1.5" />
          <line x1="50%" y1="64" x2="62%" y2="128" stroke="color-mix(in srgb, var(--art-accent) 42%, transparent)" strokeWidth="1.5" />
          <line x1="50%" y1="64" x2="86%" y2="128" stroke="color-mix(in srgb, var(--art-accent) 42%, transparent)" strokeWidth="1.5" />
          <line x1="50%" y1="26" x2="84%" y2="64" stroke="color-mix(in srgb, var(--dsw-alias-label-caption) 45%, transparent)" strokeWidth="1.5" strokeDasharray="4 4" />
        </svg>
        <span className="mini-node hub" style={{ left: '50%', top: 12, transform: 'translateX(-50%)' }}>studio APP</span>
        <span className="mini-node" style={{ left: '6%', top: 116 }}>想法库</span>
        <span className="mini-node" style={{ left: '32%', top: 116 }}>管线</span>
        <span className="mini-node" style={{ left: '54%', top: 116 }}>排期</span>
        <span className="mini-node" style={{ left: '76%', top: 116 }}>PB × 5 集合</span>
        <span className="mini-node warn" style={{ left: '80%', top: 52 }}>tldraw · 不可达</span>
      </div>
    )
  }
  if (rid === 'studio:pipeline-flow') {
    return <FlowMock nodes={STAGES.map((s) => ({ key: s.key, label: s.label, count: s.count, tone: s.tone, detail: stageNodeDetail(s) }))} />
  }
  if (rid === 'studio:calendar') {
    return <TimelineMock items={CALENDAR.slice(0, 3).map((c, i) => ({ time: c.day, title: c.title, detail: c.platform, status: i === 0 ? 'current' : 'future' }))} />
  }
  if (rid === 'studio:methodology') {
    return (
      <div className="ol-body ol-md">
        <p><strong>钩子三秒法则</strong>：开头必须抛出观众此刻的问题。</p>
        <p>一稿多投先改 <code>cover + 前 3 秒</code>。</p>
      </div>
    )
  }
  if (rid === 'studio:idea-detail' || rid === 'studio:draft-detail') {
    return (
      <div style={{ padding: 12 }}>
        <DetailGridMock cells={rid === 'studio:idea-detail' ? [
          { k: '热度', v: '92' }, { k: '标签', v: 'AI / 工具' }, { k: '状态', v: '采中' },
          { k: '关联稿件', v: '2 条' }, { k: '创建时间', v: '2026-09-01' }, { k: '来源', v: '社群讨论' },
        ] : [
          { k: '阶段', v: '制作中' }, { k: '平台', v: 'B站' }, { k: '截稿', v: '09-08' },
          { k: '负责人', v: '阿洛' }, { k: '引用素材', v: '2 项' }, { k: '来源想法', v: 'i1' },
        ]} />
        <div className="ol-micro" style={{ marginTop: 8 }}>只读详情 · 编辑走独立组件 studio:idea-edit（relations 浮窗，场景⑤）</div>
      </div>
    )
  }
  if (rid === 'studio:idea-create' || rid === 'studio:idea-edit' || rid === 'studio:draft-edit') {
    return (
      <div style={{ padding: 14 }}>
        <div className="ol-field">
          <span className="fl">标题 <span className="req">*</span></span>
          <input className="ol-input" defaultValue={rid === 'studio:idea-create' ? '' : 'Claude Code 隐藏功能 Top10'} placeholder={rid === 'studio:idea-create' ? '例如：Claude Code 隐藏功能 Top12' : ''} readOnly />
        </div>
        <div className="ol-field">
          <span className="fl">标签 <span className="fh">1–4 项</span></span>
          <div className="multi-tags">
            {['AI', '工具', '教程'].map((t, i) => <button key={t} className={`multi-tag ${i < 2 ? 'on' : ''}`}>{t}</button>)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="save-btn">保存</button>
          <span className="ol-micro" style={{ alignSelf: 'center' }}>submitAction 由宿主写桥执行（panel 无网络）</span>
        </div>
      </div>
    )
  }
  // data-table 类默认
  return (
    <DataTableMock compact
      columns={[
        { key: 'title', label: rid === 'studio:asset-table' ? '素材' : rid === 'studio:draft-list' ? '稿件' : '想法' },
        ...(rid === 'studio:asset-table'
          ? [{ key: 'kind', label: '类型', render: (r) => <span className="ol-tag">{r.kind}</span> }, { key: 'size', label: '大小', num: true }]
          : rid === 'studio:draft-list'
            ? [{ key: 'stage', label: '阶段', render: (r) => <ToneBadge tone="info">{r.stage}</ToneBadge> }, { key: 'platform', label: '平台' }]
            : [{ key: 'tags', label: '标签', render: (r) => <TagList tags={r.tags} /> }, { key: 'heat', label: '热度', num: true }]),
      ]}
      rows={rid === 'studio:asset-table' ? ASSETS.slice(0, 4) : rid === 'studio:draft-list' ? DRAFTS.slice(0, 4) : IDEAS.slice(0, 4)}
      rowKey="id"
    />
  )
}

function SceneRegistry() {
  const [appId, setAppId] = React.useState('studio')
  const [rid, setRid] = React.useState('studio:idea-bank')

  const app = REG_APPS.find((a) => a.id === appId)
  const isStudio = appId === 'studio'
  const selected = STUDIO_RESOURCES.find((r) => r.rid === rid) || STUDIO_RESOURCES[0]
  const relRows = REL_DECLS.filter((d) => d.from === rid || d.to.includes(rid.split(':')[1]))

  return (
    <div className="reg-cols" data-screen-label="scene-registry">
      <div className="reg-col1">
        <div className="reg-head"><span>APP</span><span>{REG_APPS.length}</span></div>
        <div className="reg-rows">
          {REG_APPS.map((a) => (
            <button key={a.id} className={`app-row ${appId === a.id ? 'on' : ''}`} onClick={() => { setAppId(a.id); if (a.id === 'studio') setRid('studio:idea-bank') }}>
              <span className={`app-icon ${a.kind}`}>{a.name[0].toUpperCase()}</span>
              <span className="meta">
                <span className="name">{a.name}</span>
                <span className="subtxt">{a.sub}</span>
              </span>
              <span className={`d2-dot ${a.dot}`} style={{ marginLeft: 'auto' }}></span>
            </button>
          ))}
        </div>
        <div style={{ padding: '0 10px 12px' }}>
          <div className="gap-note">读组件与写组件分列：detail 只读，edit/create 是独立 form 组件，靠 relations 串联——没有任何组件内嵌「编辑模式开关」。</div>
        </div>
      </div>

      <div className="reg-col2">
        <div className="reg-head">
          <span>{app ? app.name : ''} · 资源</span>
          <span className={`kind-badge ${app ? app.kind : 'kind'}`}>{app ? app.kind : ''}</span>
        </div>
        <div className="reg-rows">
          {isStudio ? (
            <React.Fragment>
              <div className="reg-head" style={{ padding: '4px 4px 2px' }}><span>组件 COMPONENTS</span></div>
              {STUDIO_RESOURCES.map((r) => (
                <button key={r.rid} className={`res-row ${rid === r.rid ? 'on' : ''}`} onClick={() => setRid(r.rid)}>
                  <span className="r-top">
                    <span className="r-name">{r.name}</span>
                    <span className="r-kind">{r.kind}</span>
                  </span>
                  <span className="r-rid">{r.rid}</span>
                  {r.emits ? (
                    <span className="rel-chips">
                      <span className="rel-chip">↗ {r.emits}</span>
                    </span>
                  ) : null}
                </button>
              ))}
              <div className="reg-head" style={{ padding: '10px 4px 2px' }}><span>API APIS（{STUDIO_APIS.length}）</span></div>
              {STUDIO_APIS.map((a) => (
                <div key={a.rid} className="res-row" style={{ cursor: 'default' }}>
                  <span className="r-top">
                    <span className="r-name mono" style={{ fontSize: 11 }}>{a.rid}</span>
                    <span className="r-kind">{a.method}</span>
                  </span>
                  <span className="r-rid">{a.path}</span>
                  <span className="r-rid" style={{ fontFamily: 'inherit' }}>{a.desc}</span>
                </div>
              ))}
              <div className="reg-head" style={{ padding: '10px 4px 2px' }}><span>SKILL 唤起规则</span></div>
              <div className="res-row" style={{ cursor: 'default' }}>
                <span className="r-top">
                  <span className="r-name">studio:skill</span>
                  <span className="r-kind">skill.md</span>
                </span>
                <span className="r-rid" style={{ fontFamily: 'inherit', lineHeight: 1.5 }}>选题/管线/排期/素材请求 → 唤起对应读组件；改数据 → 唤起写组件（edit/create）；「工作室怎么样」→ system-overview + event-log</span>
              </div>
            </React.Fragment>
          ) : (
            <div className="ol-meta" style={{ padding: 14 }}>
              {appId === 'openloop' ? '43 个预设组件 + 自管理四件套 + 4 个 artifact 范例（few-shot 库）。' : null}
              {appId === 'excalidraw' ? '4 个工具（create_canvas / update / export / read），其中 create_canvas 带 ui:// 资源绑定 → mcp-app 引用组件。' : null}
              {appId === 'tldraw' ? '连接失败停在 server 粒度：web 不受影响，该 server 条目保留，恢复后自动重连。' : null}
            </div>
          )}
        </div>
      </div>

      <div className="reg-detail">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 650 }}>{selected.name}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--dsw-alias-label-caption)', marginTop: 2 }}>{selected.rid} · {selected.desc}</div>
          </div>
          <button className="pin-primary">⌖ Pin 到看板</button>
        </div>

        <div>
          <div className="sec-label" style={{ marginBottom: 8 }}>预览 PREVIEW <span className="en">{selected.kind === 'artifact' ? '· 沙箱 iframe 渲染上下文' : '· panel 渲染上下文'}</span></div>
          <div className="d2-frame">
            <div className="d2-frame-bar">
              <span className="d2-fdots"><i></i><i></i><i></i></span>
              <span>{selected.kind === 'artifact' ? `artifact · ${selected.desc.split('·')[0].trim()} 档` : `panel · ${selected.name} · 数据绑定`}</span>
              <span style={{ marginLeft: 'auto' }}>{selected.kind === 'artifact' ? 'opaque origin' : 'preset 契约'}</span>
            </div>
            <div className="d2-frame-body">
              <RegistryPreview rid={rid} />
            </div>
          </div>
        </div>

        <div>
          <div className="sec-label" style={{ marginBottom: 8 }}>关联声明 RELATIONS <span className="en">· 双语 · {'{app}:{entity}:{action}'}</span></div>
          <table className="decl-table">
            <thead>
              <tr><th>来源</th><th>方向</th><th>事件</th><th>消费方</th><th>参数模板</th></tr>
            </thead>
            <tbody>
              {(relRows.length > 0 ? relRows : REL_DECLS.slice(0, 2)).map((d, i) => (
                <tr key={i}>
                  <td className="mono" style={{ fontSize: 10 }}>{d.from}</td>
                  <td><span className={`decl-dir ${d.dir}`}>{d.dir === 'out' ? '↗ emits' : '↙ consumes'}</span></td>
                  <td className="ev">{d.ev}</td>
                  <td className="mono" style={{ fontSize: 10 }}>{d.to}</td>
                  <td className="mono" style={{ fontSize: 10 }}>{d.tpl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

Object.assign(window, { SceneRegistry })
