// 快照悬浮窗层：堆栈管理 + 窗口组件（拖拽 / 8向拉伸 / 层级提升 / 只读回看）
// 交互模型（用户已拍板）：
//  - 快照 = 冻结 kind+params（请求参数），内容按参数实时渲染
//  - 新窗默认右上角堆叠，后面的窗向左下级联露出边缘（macOS Stack 风）
//  - 点击任意窗提前：未拖过的窗位置随堆栈重排，拖过的窗位置不变仅 z-index 提升
//  - 快照纯回看：内容不响应联动，点击列表行给只读 toast

const STACK_TOP = 56          // 视口顶部锚点（避开 46px topbar）
const STACK_RIGHT = 16        // 视口右侧锚点
const CASCADE_X = -18         // 每往一层向左偏移
const CASCADE_Y = 16          // 每往一层向下偏移
const DEFAULT_W = 480
const DEFAULT_H = 340
const MIN_W = 300
const MIN_H = 200

const SnapshotCtx = React.createContext(null)
function useSnapshots() { return React.useContext(SnapshotCtx) }

function SnapshotProvider({ children }) {
  const [snapshots, setSnapshots] = React.useState([])
  const [toast, setToast] = React.useState(null)
  const [freshId, setFreshId] = React.useState(null)    // 新建窗口（入场动画只给它）
  const [bumpedId, setBumpedId] = React.useState(null)  // 被点击提前的窗口（重新浮动反馈）
  const seq = React.useRef(0)
  const toastTimer = React.useRef(null)
  const bumpTimer = React.useRef(null)

  const project = (spec) => {
    seq.current += 1
    const id = 'snap-' + seq.current
    const now = new Date()
    const takenAt = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':')
    setSnapshots(prev => [...prev, {
      id,
      kind: spec.kind,
      params: spec.params || {},
      takenAt,
      pos: null,                       // null = 跟随堆栈位；拖拽后为自由坐标
      size: spec.size || { w: DEFAULT_W, h: DEFAULT_H },
    }])
    setFreshId(id)
    setTimeout(() => setFreshId(cur => cur === id ? null : cur), 400)
  }

  const close = (id) => setSnapshots(prev => prev.filter(s => s.id !== id))

  const bringToFront = (id, animate) => setSnapshots(prev => {
    const idx = prev.findIndex(s => s.id === id)
    if (idx < 0 || idx === prev.length - 1) return prev
    if (animate) {
      setBumpedId(id)
      clearTimeout(bumpTimer.current)
      bumpTimer.current = setTimeout(() => setBumpedId(cur => cur === id ? null : cur), 350)
    }
    const next = prev.slice()
    next.push(next.splice(idx, 1)[0])  // 移到数组末尾 = 最前
    return next
  })

  const setRect = (id, rect) => setSnapshots(prev =>
    prev.map(s => s.id === id ? { ...s, pos: { x: rect.x, y: rect.y }, size: { w: rect.w, h: rect.h } } : s)
  )

  const notifyReadonly = () => {
    setToast('快照为只读回看 · 联动请点击对话流或看板中的实时页面')
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  const value = { snapshots, project, close, bringToFront, setRect, notifyReadonly, freshId, bumpedId }
  return (
    <SnapshotCtx.Provider value={value}>
      {children}
      {ReactDOM.createPortal(<SnapshotLayer toast={toast} />, document.body)}
    </SnapshotCtx.Provider>
  )
}

function SnapshotLayer({ toast }) {
  const { snapshots } = useSnapshots()
  return (
    <div className="snap-root">
      {snapshots.map((snap, i) => (
        <SnapshotWindow key={snap.id} snap={snap} fromFront={snapshots.length - 1 - i} />
      ))}
      {toast && <div className="snap-toast"><span className="dot"></span>{toast}</div>}
    </div>
  )
}

function stackRect(fromFront, size) {
  const vw = window.innerWidth
  const steps = Math.min(fromFront, Math.max(0, Math.floor((vw - size.w - STACK_RIGHT - 8) / -CASCADE_X)))
  return {
    x: vw - STACK_RIGHT - size.w + steps * CASCADE_X,
    y: STACK_TOP + fromFront * CASCADE_Y,
    w: size.w, h: size.h,
  }
}

function SnapshotWindow({ snap, fromFront }) {
  const { close, bringToFront, setRect, notifyReadonly, freshId, bumpedId } = useSnapshots()
  const [interacting, setInteracting] = React.useState(false)
  const cancelRef = React.useRef(() => {})

  React.useEffect(() => () => cancelRef.current(), [])

  const rect = snap.pos
    ? { x: snap.pos.x, y: snap.pos.y, w: snap.size.w, h: snap.size.h }
    : stackRect(fromFront, snap.size)

  const beginSession = (event, mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    bringToFront(snap.id)   // 拖拽/拉伸起手无动画——拖拽本身就是反馈
    cancelRef.current()
    const view = event.currentTarget.ownerDocument.defaultView
    if (!view) return
    const pointerId = event.pointerId
    const origin = { x: event.clientX, y: event.clientY }
    const start = rect
    const el = event.currentTarget
    setInteracting(true)
    try { el.setPointerCapture(pointerId) } catch (_) {}

    const move = (next) => {
      if (next.pointerId !== pointerId) return
      const dx = next.clientX - origin.x
      const dy = next.clientY - origin.y
      setRect(snap.id, mode === 'move' ? moveRect(start, dx, dy) : resizeRect(start, mode, dx, dy))
    }
    const cleanup = () => {
      view.removeEventListener('pointermove', move)
      view.removeEventListener('pointerup', finish)
      view.removeEventListener('pointercancel', finish)
      cancelRef.current = () => {}
      try { el.releasePointerCapture(pointerId) } catch (_) {}
    }
    const finish = (next) => {
      if (next.pointerId !== pointerId) return
      cleanup()
      setInteracting(false)
    }
    cancelRef.current = cleanup
    view.addEventListener('pointermove', move)
    view.addEventListener('pointerup', finish)
    view.addEventListener('pointercancel', finish)
  }

  const onHeadPointerDown = (e) => {
    if (e.target.closest('[data-snap-control]')) return
    beginSession(e, 'move')
  }

  const cls = 'snap-win'
    + (interacting ? ' interacting' : '')
    + (snap.id === freshId ? ' snap-fresh' : '')
    + (snap.id === bumpedId ? ' snap-pop' : '')

  return (
    <section
      className={cls}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      onPointerDown={() => bringToFront(snap.id, true)}
      aria-label={snapshotTitle(snap)}
    >
      <header className="snap-head" onPointerDown={onHeadPointerDown}>
        <span className="snap-badge">
          <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="4.5" y="4.5" width="9" height="9" rx="2"/><path d="M11.5 4.5v-1a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h1"/></svg>
          快照 {snap.takenAt}
        </span>
        <span className="t">{snapshotTitle(snap)}</span>
        <span className="snap-param">{snapshotParamText(snap)}</span>
        <span style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <button type="button" className="icon-btn snap-close" data-snap-control=""
                  title="关闭快照" onClick={() => close(snap.id)}>
            <CloseIcon />
          </button>
        </span>
      </header>
      <div className="snap-body">
        {renderSnapshotContent(snap, () => notifyReadonly())}
      </div>
      <footer className="snap-foot">
        <span className="ro">只读回看</span>
        <span>·</span><span>参数已冻结，内容随数据实时渲染</span>
      </footer>
      {['nw','n','ne','w','e','sw','s','se'].map(d => (
        <span key={d} className={`snap-rh rh-${d}`} onPointerDown={(e) => beginSession(e, d)} />
      ))}
    </section>
  )
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }

function moveRect(start, dx, dy) {
  const vw = window.innerWidth, vh = window.innerHeight
  return {
    x: clamp(start.x + dx, -start.w + 90, vw - 90),
    y: clamp(start.y + dy, 0, vh - 42),
    w: start.w, h: start.h,
  }
}

function resizeRect(start, dir, dx, dy) {
  const vw = window.innerWidth, vh = window.innerHeight
  let left = start.x, right = start.x + start.w, top = start.y, bottom = start.y + start.h
  if (dir.includes('w')) left = clamp(start.x + dx, -start.w + 90, right - MIN_W)
  if (dir.includes('e')) right = clamp(right + dx, left + MIN_W, vw - 8)
  if (dir.includes('n')) top = clamp(start.y + dy, 0, bottom - MIN_H)
  if (dir.includes('s')) bottom = clamp(bottom + dy, top + MIN_H, vh - 8)
  return { x: left, y: top, w: right - left, h: bottom - top }
}

Object.assign(window, { SnapshotProvider, useSnapshots })
