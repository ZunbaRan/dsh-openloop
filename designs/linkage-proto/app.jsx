// 壳：场景导航 + 标注栏
const SCENES = [
  { id: 'chat',     t: '① 对话流 · 点选即览', d: '点击列表行 → 详情出现在卡片下方（决策 A · 未经 Agent）', render: () => <SceneChat /> },
  { id: 'board',    t: '② Board · 悬浮窗',    d: '点行 → 详情悬浮窗，多开并排对比（决策 B · 不自动 pin）', render: () => <SceneBoard /> },
  { id: 'registry', t: '③ 资源列表 · 页面关系', d: '真实预览 + 双语 relations 声明 + 可交互的关联预览', render: () => <SceneRegistry /> },
]

const ANNOS = {
  chat: [
    { k: 'A', t: '详情出现在列表卡片内部下方，不动对话记录' },
    { k: '⚡', t: '点行发出 my-crm:lead:selected，详情按 leadId 取数，纯前端行为' },
    { k: '∥', t: 'Agent 可同时继续对话，互不阻塞' },
  ],
  board: [
    { k: 'B', t: '悬浮窗多开：同一 lead 聚焦已有窗口，不同 lead 并排对比' },
    { k: '⚡', t: '悬浮窗不 pin 进 board；壳 = 拖拽 / 折叠 / 关闭' },
    { k: 'C', t: 'hover 列表 tile → 关联目标亮灯（紫），无关 tile 降透明' },
  ],
  registry: [
    { k: 'D', t: '事件命名空间 {app}:{entity}:{action}' },
    { k: '⇄', t: 'emits 可触发 / consumes 可响应，双语呈现；详情页再触发即多级级联' },
    { k: '§', t: '资源行 chip 与「相关页面」可互跳选中' },
  ],
}

function App() {
  const [scene, setScene] = React.useState('chat')
  const cur = SCENES.find(s => s.id === scene)
  return (
    <React.Fragment>
      <div className="topbar">
        <span className="title">CRM 页面关联原型</span>
        <span className="sub">panel/artifact relations · Agent Native CRM</span>
        <span className="spacer"></span>
        <button className="pc-btn" type="button" onClick={() => { const r = document.documentElement; r.dataset.theme = r.dataset.theme === 'dark' ? 'light' : 'dark' }}>暗 / 亮</button>
      </div>
      <div className="layout">
        <nav className="nav">
          <div className="nav-label">场景</div>
          {SCENES.map(s => (
            <div key={s.id} className={`nav-item${s.id === scene ? ' on' : ''}`} onClick={() => setScene(s.id)}>
              <span className="t">{s.t}</span>
              <span className="d">{s.d}</span>
            </div>
          ))}
        </nav>
        <div className="stage">
          <div className="scene">{cur.render()}</div>
          <div className="anno-bar">
            {ANNOS[scene].map((a, i) => (
              <div key={i} className="a"><span className="k">{a.k}</span><span>{a.t}</span></div>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
