// 应用壳：顶栏 + 场景导航 + 标注条 + 快照层挂载

const SCENES = [
  {
    id: 'chat',
    t: '对话流 · 投影入口',
    d: 'panel/artifact 右上角：投影按钮在 pin 左侧',
    annos: [
      ['入口', '卡片右上角 pin 左侧新增「投影为快照」按钮；已 pin 的卡片 pin 变为已固定态'],
      ['冻结参数', '先投影详情（L-1024），再点列表里别的行——对话流详情变了，快照保持 L-1024'],
      ['堆叠', '新快照落在右上角最前，旧窗向左下级联露边；点任意窗提前，标题栏拖拽，边缘 8 向拉伸'],
      ['只读', '快照内点击列表行不触发联动，只提示只读回看'],
    ],
  },
  {
    id: 'registry',
    t: '资源列表 · 投影入口',
    d: 'board 资源行：未 pin = 投影+pin，已 pin = 仅投影',
    annos: [
      ['按钮态', '行 hover 出现操作：未 pin 显示 [投影][pin]；已 pin 只显示 [投影] + 已 pin 标记'],
      ['概念分工', 'pin = 持久布局进看板；投影 = 临时悬浮快照，关闭即销毁'],
      ['多实例', '同一资源不同参数可投影多个快照并存（如 L-1024 / L-1026 两详情对比）'],
    ],
  },
]

function App() {
  const [scene, setScene] = React.useState('chat')
  const { snapshots, close } = useSnapshots()
  const current = SCENES.find(s => s.id === scene)

  return (
    <React.Fragment>
      <div className="topbar">
        <span className="title">快照悬浮窗原型 · Snapshot Windows</span>
        <span className="sub">冻结参数 · 内容活 · 只读回看 · 右上角堆叠</span>
        <span className="spacer"></span>
        {snapshots.length > 0 && (
          <span className="sub" style={{ color: 'var(--snap)' }}>
            {snapshots.length} 个快照悬浮中
            <button type="button" className="pc-btn" style={{ marginLeft: 8 }}
                    onClick={() => snapshots.forEach(s => close(s.id))}>全部关闭</button>
          </span>
        )}
      </div>
      <div className="layout">
        <div className="nav">
          <div className="nav-label">场景 SCENES</div>
          {SCENES.map(s => (
            <div key={s.id} className={`nav-item${scene === s.id ? ' on' : ''}`} onClick={() => setScene(s.id)}>
              <span className="t">{s.t}</span>
              <span className="d">{s.d}</span>
            </div>
          ))}
        </div>
        <div className="stage">
          <div className="scene">
            {scene === 'chat' ? <ChatScene /> : <RegistryScene />}
          </div>
          <div className="anno-bar">
            {current.annos.map(([k, text]) => (
              <span key={k} className="a"><span className="k">{k}</span><span>{text}</span></span>
            ))}
          </div>
        </div>
      </div>
    </React.Fragment>
  )
}

function Root() {
  return (
    <SnapshotProvider>
      <App />
    </SnapshotProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />)
