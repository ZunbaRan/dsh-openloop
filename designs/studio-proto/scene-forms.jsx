/** 场景 4 · 三形态对比：同一「9 月编辑日历」用 panels-预设 / panels-自由 / artifact 各表达一遍 + 选型矩阵 */

// 9 月月历 35 格：idx 0 = 8/31（周一），idx 1 = 9/1，idx 30 = 9/30，idx 31+ = 10 月
const CAL_CELLS = Array.from({ length: 35 }, (_, i) => i)

function sepDateOfCell(idx) {
  if (idx === 0) return { m: 8, d: 31 }
  if (idx <= 30) return { m: 9, d: idx }
  return { m: 10, d: idx - 30 }
}

const CAL_ITEMS = [
  { day: 7, title: 'DSH 工作室', cls: 'p1' },
  { day: 8, title: 'Claude Top10', cls: 'p2' },
  { day: 9, title: 'Top10 图文', cls: 'p3' },
  { day: 10, title: '30天合集', cls: 'p1' },
  { day: 12, title: '中场快报', cls: 'p2' },
  { day: 13, title: '周报', cls: 'p3' },
  { day: 15, title: '30天·第二周', cls: 'p1' },
  { day: 17, title: 'MCP 三分钟', cls: 'p2' },
  { day: 21, title: '工具横评·上', cls: 'p1' },
  { day: 24, title: '管线复盘', cls: 'p3' },
  { day: 28, title: '工具横评·下', cls: 'p1' },
]

function SceneForms() {
  return (
    <div className="forms-scroll" data-screen-label="scene-forms">
      <div className="forms-head">
        <h2>同一内容，三种形态 —— 「9 月编辑日历」</h2>
        <div className="sub">同一份 studio:calendar 数据，分别走 panels-预设（契约拼装）/ panels-自由（custom code）/ artifact（network 档整页）。这是给 openloop 自己摸底的设计实验：三条表面各自什么时候最好看。</div>
      </div>

      <div className="forms-grid">
        <div className="form-col">
          <div className="form-col-head">
            <span className="fc-name">panels · 预设</span>
            <span className="kind-badge builtin">codegen JSON</span>
          </div>
          <div className="fc-note">Agent 填 props 契约即可 · 最快 · 视觉与全家桶自动一致</div>
          <div className="form-frame">
            <div className="ff-bar"><span className="preset-chip">timeline</span><span>studio:calendar</span><span style={{ marginLeft: 'auto' }}>persist ✓</span></div>
            <div className="ff-body" style={{ padding: 0 }}>
              <PanelShell preset={null} fill>
                <TimelineMock items={CALENDAR.map((c, i) => ({
                  time: c.day,
                  title: c.title,
                  detail: `${c.platform} · ${c.dow}`,
                  status: i === 0 ? 'current' : 'future',
                }))} />
              </PanelShell>
            </div>
          </div>
          <div className="gap-note">时间序表达力好，但「月历全貌」不是它的题——契约没有这个概念，这正是该用另两条表面的信号。</div>
        </div>

        <div className="form-col">
          <div className="form-col-head">
            <span className="fc-name">panels · 自由</span>
            <span className="kind-badge local">custom code</span>
          </div>
          <div className="fc-note">同一渲染上下文，代码自由 · 可拖块/自定义交互 · 仍无网络</div>
          <div className="form-frame">
            <div className="ff-bar"><span className="preset-chip">custom</span><span>studio:calendar</span><span style={{ marginLeft: 'auto' }}>connect-src 'none'</span></div>
            <div className="ff-body" style={{ padding: 10 }}>
              <div className="cal">
                {['一', '二', '三', '四', '五', '六', '日'].map((d) => <div key={d} className="cal-dow">{d}</div>)}
                {CAL_CELLS.map((idx) => {
                  const { m, d } = sepDateOfCell(idx)
                  const item = CAL_ITEMS.find((it) => it.day === d && m === 9)
                  const today = m === 9 && d === 5
                  return (
                    <div key={idx} className={`cal-day ${m !== 9 ? 'out' : ''} ${today ? 'today' : ''}`}>
                      <span className="dnum">{d}</span>
                      {item ? <span className={`cal-item ${item.cls}`} title="可拖拽改期">{item.title}</span> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="gap-note">月历网格 + 拖拽改期是预设给不了的交互；但视觉仍吃 openloop token，混进看板不违和。</div>
        </div>

        <div className="form-col">
          <div className="form-col-head">
            <span className="fc-name">artifact</span>
            <span className="kind-badge thirdparty">network 档 HTML</span>
          </div>
          <div className="fc-note">整页 · 品牌化 · 页面代码经 openloop.fetch 自取数</div>
          <div className="form-frame">
            <div className="ff-bar"><span className="preset-chip">artifact</span><span>sandbox iframe</span><span style={{ marginLeft: 'auto' }}>opaque origin</span></div>
            <div className="ff-body" style={{ padding: 0, background: 'var(--art-background)' }}>
              <div className="art-page">
                <div className="art-hero">
                  <div className="ah-k">Alot Studio · Editorial</div>
                  <div className="ah-t">9 月编辑日历</div>
                  <div className="ah-s">4 平台 · 11 条排期 · 数据经 openloop.fetch 实时取</div>
                </div>
                <div className="art-strip">
                  <div className="art-kpi"><div className="k">本周</div><div className="v">6</div></div>
                  <div className="art-kpi"><div className="k">下周</div><div className="v">3</div></div>
                  <div className="art-kpi"><div className="k">待补位</div><div className="v">2</div></div>
                </div>
                <div className="art-week">
                  {CALENDAR.map((c) => (
                    <div key={c.day} className={`art-slot ${c.hot ? 'hot' : ''}`}>
                      <span className="d">{c.day} {c.dow}</span>
                      <span className="t">{c.title}</span>
                      <span className="pf">{c.platform}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="gap-note">品牌感最强、信息架构最自由；代价是放弃预设契约与复用，且要写自有样式。<b>教训</b>：判断标准必须是「预设原理上表达不了」——多平台发布预览、提词器曾被论证进本系统，后被判定为凑需求砍掉；本系统 artifact 仅 system-map。</div>
        </div>
      </div>

      <div>
        <div className="sec-label" style={{ marginBottom: 8 }}>选型矩阵 DECISION MATRIX</div>
        <table className="matrix">
          <thead>
            <tr><th style={{ width: 120 }}></th><th>panels · 预设</th><th>panels · 自由</th><th>artifact</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="rowhead">生成方式</td>
              <td>codegen 填 JSON props（Python builder）</td>
              <td>codegen 生成 custom code（同契约渲染上下文）</td>
              <td>few-shot 参照生成整份 HTML</td>
            </tr>
            <tr>
              <td className="rowhead">数据来源</td>
              <td>服务端数据绑定注入（面板零网络）</td>
              <td className="dim">同左</td>
              <td>页面代码 openloop.fetch 自取（network 档唯一通道）</td>
            </tr>
            <tr>
              <td className="rowhead">视觉一致性</td>
              <td><span className="best">全自动</span>（token 强约束，永不出格）</td>
              <td>高（建议继续吃 --openloop-* token）</td>
              <td className="dim">自由（注入语义 token，可品牌化）</td>
            </tr>
            <tr>
              <td className="rowhead">交互上限</td>
              <td className="dim">预设内置（点选/hover/排序）</td>
              <td>高（拖拽、局部状态、自定义控件）</td>
              <td>最高（整页应用、路由级信息架构）</td>
            </tr>
            <tr>
              <td className="rowhead">最佳场景</td>
              <td><span className="best">表格/指标/流程/时间线等结构化数据，要快、要 persist、要看板复用</span></td>
              <td>预设没有的概念（月历网格、拖块、特殊布局），但仍想留在 panel 体系内</td>
              <td>整页报告/拓扑图/品牌化页面/需要页面自取数的工具</td>
            </tr>
            <tr>
              <td className="rowhead">本系统的例子</td>
              <td>想法库 · 管线 · 排期 · 素材 · 概览</td>
              <td>月历拖拽改期（候选增强）</td>
              <td>系统地图 · 编辑日历品牌页</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

Object.assign(window, { SceneForms })
