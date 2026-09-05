/** Studio 原型外壳：场景导航 + 标注栏 + 主题切换 */

const SCENES = [
  {
    id: 'chat', t: '① 对话流 · 系统诞生', d: 'Agent 生成 + 数据绑定 + 流内联动 + 写路径',
    anno: [
      ['k', 'panel', 'data-table 预设流内渲染，数据服务端注入（面板零网络契约）'],
      ['kr', 'relations', '点想法行 → 下方联动其稿件：studio:idea:open → {{ideaId}} 取数，不经 Agent'],
      ['k', 'write', '写路径：状态推进 → app_events 落库 → 事件脉冲可见'],
    ],
  },
  {
    id: 'board', t: '② 看板 · 驾驶舱总装', d: '8 类 tile + hover 亮灯 + 浮窗多开 + 故障/降级',
    anno: [
      ['k', 'panel', 'heatmap/flow/metric-grid/timeline/data-table/markdown 预设 + excalidraw mcp-app tile 同板'],
      ['kr', 'relations', 'hover 想法/管线 tile → 关联 tile 亮灯其余压暗；点管线阶段浮窗多开对比'],
      ['kw', 'bug-rig', '顶栏两个开关：TileErrorBoundary 兜底演示 + PB 降级 pendingSync 横幅'],
    ],
  },
  {
    id: 'registry', t: '③ APP · 资源与关联', d: '三列注册表 + 双语声明 + 详情预览 + pin',
    anno: [
      ['k', 'app', '命名即寻址 rid 全链露出；builtin/local/thirdparty 三色来源徽标'],
      ['kr', 'relations', 'emits/consumes 双语声明表 + {app}:{entity}:{action} 命名空间'],
      ['k', 'pin', '详情预览即 pin 入口；artifact 与 panel 预览上下文分列'],
    ],
  },
  {
    id: 'forms', t: '④ 三形态 · 设计实验', d: '同一编辑日历：预设 / 自由 / artifact + 选型矩阵',
    anno: [
      ['k', '预设', '契约拼装最快，视觉与全家桶自动一致，persist 免费'],
      ['k', '自由', 'custom code：预设给不了的概念（月历拖块），仍吃 token 不违和'],
      ['kw', 'artifact', '整页品牌化 + 自取数；代价是放弃契约与复用'],
    ],
  },
  {
    id: 'detail', t: '⑤ 详情与行内编辑', d: '详情页组合模式 + 行内编辑 + 编辑模式（dirty/PATCH）',
    anno: [
      ['k', 'detail', '详情页 = 组合模式（detail-grid + 关联列表 + 状态时间线），非单预设——预设缺口候选'],
      ['k', 'inline', '行内编辑：单字段点开即改（Enter 存 / Esc 消）——一句话都嫌多的场景用它'],
      ['k', 'edit-mode', '编辑模式：多字段 dirty 标记，一次 PATCH 而非逐字段 N 次 POST'],
    ],
  },
  {
    id: 'edit', t: '⑥ 表单与批量', d: '新建表单（校验演示）+ form 预设族 + 写路径时序 + 批量',
    anno: [
      ['k', 'form', 'form 预设族 = 必备能力：input-text/number/select/multi-select/date/toggle'],
      ['kw', 'declarative', '声明式提交：panels 无网络，submitAction 由宿主写桥执行 POST'],
      ['k', 'bulk', '批量操作：多选 → bulk bar → 一次批量 POST，事件留痕'],
    ],
  },
  {
    id: 'topo', t: '⑦ 拓扑 · 系统自观察', d: 'system-map 全页 + 事件/用量元数据带',
    anno: [
      ['kw', 'artifact', 'network 档整页拓扑，节点可拖拽，openloop.fetch 取数'],
      ['k', 'meta', '自观察四件套回环：它读的正是 studio 自己的集合'],
      ['kw', 'bug-rig', '真实流量持续打在写路径/refresh/relations 上 = 活的测试桩'],
    ],
  },
]

function App() {
  const [scene, setScene] = React.useState('chat')
  const [theme, setTheme] = React.useState('light')

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  const current = SCENES.find((s) => s.id === scene)

  return (
    <React.Fragment>
      <div className="topbar">
        <span className="title">Studio · 内容创作工作室</span>
        <span className="sub">OpenLoop 系统原型 · 验证「对话建系统」全链路 + 三形态设计实验</span>
        <span className="spacer"></span>
        <span className="kind-badge local">local app</span>
        <button className="pc-btn" onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
          {theme === 'light' ? '◐ 切暗色' : '◑ 切亮色'}
        </button>
      </div>

      <div className="layout">
        <div className="nav">
          <div className="nav-label">场景 SCENES</div>
          {SCENES.map((s) => (
            <div key={s.id} className={`nav-item ${scene === s.id ? 'on' : ''}`} onClick={() => setScene(s.id)}>
              <div className="t">{s.t}</div>
              <div className="d">{s.d}</div>
            </div>
          ))}
          <div className="nav-gap"></div>
          <div className="gap-note">
            <b>查漏补缺</b>（设计时补进原列举的）：写操作入口 · 错误态/降级态 · 空态开场 · 素材搜索 · 来源徽标 · rid 露出 · 页面四面（⑤）· <b>编辑五模式 + form 预设族（⑤⑥）</b>
          </div>
          <div className="gap-note">
            未覆盖（用户拍板排除）：收入记账 · 发布分析。已砍：多平台发布预览 · 提词器（论证为凑 artifact 需求，不真实）——本系统 artifact 仅 system-map
          </div>
        </div>

        <div className="stage">
          <div className="scene">
            {scene === 'chat' ? <SceneChat /> : null}
            {scene === 'board' ? <SceneBoard /> : null}
            {scene === 'registry' ? <SceneRegistry /> : null}
            {scene === 'forms' ? <SceneForms /> : null}
            {scene === 'detail' ? <SceneDetail /> : null}
            {scene === 'edit' ? <SceneEdit /> : null}
            {scene === 'topo' ? <SceneTopology /> : null}
          </div>
          <div className="anno-bar">
            {current.anno.map(([cls, k, text]) => (
              <span key={k} className="a"><span className={cls}>{k}</span>{text}</span>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
