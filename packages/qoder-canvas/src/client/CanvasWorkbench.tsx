/**
 * CanvasWorkbench：canvas dock 的工作台（S7 布局重做，2026-09-06 用户拍板）。
 *
 * 布局（推翻 S5 两列方案）：
 * - 画布区【铺满】整个工作台（不留右栏）
 * - toolbar（点击/框选/划字 三模式）常驻 header 之下——清晰可见
 * - 注释面板 = 【悬浮窗】浮在画布上（默认右上，可拖拽移动，可关闭）
 * - 保存注释 → composer 胶囊（annotation-capsule），不再把文本铺进输入框
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CanvasDockHost, CanvasToggle, CANVAS_DEFAULT_WIDTH, clampCanvasWidth } from './CanvasDockHost.tsx'
import { CanvasSurface } from './CanvasSurface.tsx'
import { CanvasPinLayer, type PinMode } from './CanvasPinLayer.tsx'
import { CommentPanel } from './CommentPanel.tsx'
import { AnnotationCapsuleBar, pushCapsuleDraft, registerCanvasSnapshot, setCurrentCanvasRef } from './annotation-capsule.tsx'
import { reportAnnotation } from './composer-bridge.ts'
import { addAnnotation, listAnnotations, removeAnnotation, updateAnnotationNote, type AnnotationTarget, type CanvasAnnotation } from './canvas-annotations.ts'
import type { CanvasSnapshot } from '../dsl.ts'

const WIDTH_KEY = 'openloop.canvas.width.v1'
const OPEN_KEY = 'openloop.canvas.open.v1'

function readWidth(): number {
  try { const v = Number(localStorage.getItem(WIDTH_KEY)); return Number.isFinite(v) && v > 0 ? clampCanvasWidth(v) : CANVAS_DEFAULT_WIDTH } catch { return CANVAS_DEFAULT_WIDTH }
}
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}

/** 工作区目录条目（GET /qoder-canvas/list） */
interface CanvasListItem { canvasId: string; title: string; revision: number; revisions: readonly number[]; updatedAt: string }

declare global {
  interface Window { __openloopCanvasOpen?: (canvasId: string, snapshot?: CanvasSnapshot) => void }
}

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

const MODES: readonly { key: PinMode; label: string; hint: string }[] = [
  { key: 'point', label: '点击', hint: 'hover 高亮元素，点击选中（元素级精度）' },
  { key: 'marquee', label: '框选', hint: '拖拽框选多个节点' },
  { key: 'text', label: '划字', hint: '划选文本作为引用' },
]

export function CanvasWorkbench(): ReactNode {
  const [open, setOpen] = useState(readOpen)
  const [width, setWidth] = useState(readWidth)
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null)
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [targets, setTargets] = useState<AnnotationTarget[]>([])
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<PinMode>('point')
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [editAnn, setEditAnn] = useState<CanvasAnnotation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(null)
  /** 工作区目录（M4） */
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogItems, setCatalogItems] = useState<CanvasListItem[]>([])
  const [revMenuOpen, setRevMenuOpen] = useState(false)
  const canvasAreaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)

  const persistOpen = (v: boolean): void => { setOpen(v); try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ } }
  const persistWidth = (w: number): void => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }
  const showToast = (msg: string): void => { setToast(msg); setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2200) }

  const hasEverOpened = useRef(false)

  useEffect(() => {
    const applySnapshot = (canvasId: string, snap: CanvasSnapshot | undefined): void => {
      // != null 宽松判断（真机教训：测试脚本/边界场景可能传 null，!== undefined 挡不住）
      if (snap != null) {
        setSnapshot(snap)
        registerCanvasSnapshot(snap)
      }
      setAnnotations(listAnnotations(canvasId))
      setTargets([])
    }
    window.__openloopCanvasOpen = (canvasId: string, snap?: CanvasSnapshot) => {
      applySnapshot(canvasId, snap)
      hasEverOpened.current = true
      persistOpen(true)
      void refreshFromStorage(canvasId)
    }
    window.__openloopCanvasUpdate = (canvasId: string, snap: CanvasSnapshot) => {
      applySnapshot(canvasId, snap)
      if (!hasEverOpened.current) {
        hasEverOpened.current = true
        persistOpen(true)
      }
      void refreshFromStorage(canvasId)
    }
    return () => {
      delete window.__openloopCanvasOpen
      delete window.__openloopCanvasUpdate
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshFromStorage = async (canvasId: string): Promise<void> => {
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}`)
      if (!res.ok) return
      const snap = await res.json() as CanvasSnapshot
      if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId) {
        setSnapshot(prev => {
          if (prev !== null && snap.revision <= prev.revision) return prev
          registerCanvasSnapshot(snap)
          return snap
        })
      }
    } catch { /* 端点不存在（headless）——保底快照即可 */ }
  }

  /** M4 工作区目录：拉清单（列表端点；失败静默） */
  const refreshCatalog = async (): Promise<void> => {
    try {
      const res = await fetch('/qoder-canvas/list')
      if (!res.ok) return
      const body = await res.json() as { items?: CanvasListItem[] }
      if (Array.isArray(body.items)) setCatalogItems(body.items)
    } catch { /* headless / 端点未注入 */ }
  }

  /** M4 切换画布（目录点击）：拉指定 canvas 最新快照 + 注释跟随 */
  const openCanvas = async (canvasId: string): Promise<void> => {
    setSnapshot(null)
    setAnnotations([])
    setTargets([])
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}`)
      if (res.ok) {
        const snap = await res.json() as CanvasSnapshot
        if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId) {
          setSnapshot(snap)
          registerCanvasSnapshot(snap)
        }
      }
    } catch { /* 端点不可用——目录本身来自端点，一般不会走到 */ }
    setAnnotations(listAnnotations(canvasId))
    setCatalogOpen(false)
  }

  /** M4 版本切换：读指定 rev 快照（标注按 canvasId 共享，天然跨版本） */
  const openRevision = async (canvasId: string, rev: number): Promise<void> => {
    if (snapshot !== null && snapshot.canvasId === canvasId && snapshot.revision === rev) { setRevMenuOpen(false); return }
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}?rev=${rev}`)
      if (!res.ok) { setRevMenuOpen(false); return }
      const snap = await res.json() as CanvasSnapshot
      if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId && snap.revision === rev) {
        setSnapshot(snap)
        registerCanvasSnapshot(snap)
        setTargets([])
      }
    } catch { /* 网络异常——保持当前版本 */ }
    setRevMenuOpen(false)
  }

  // M4 引用注入桥：dock 开着时暴露「当前画布 + 版本」给 capsule（发送时轻量引用）
  useEffect(() => {
    setCurrentCanvasRef(snapshot !== null && open ? { canvasId: snapshot.canvasId, revision: snapshot.revision, title: snapshot.canvas.title } : null)
  }, [snapshot, open])

  const saveAnnotation = (): void => {
    if (snapshot === null || note.trim().length === 0 || targets.length === 0) return
    const trimmed = note.trim()
    const ann = addAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets, note: trimmed })
    pushCapsuleDraft(ann)
    setAnnotations(listAnnotations(snapshot.canvasId))
    reportAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets: targets.map(t => t.kind === 'node' || t.kind === 'element' ? t.id : 'text'), note: trimmed })
    showToast('评论已保存——已挂到输入框上方胶囊，发送时随消息发出')
    setTargets([]); setNote('')
  }

  // 有 targets 时自动弹出注释面板
  useEffect(() => {
    if (targets.length > 0) setPanelOpen(true)
  }, [targets.length])

  // 悬浮面板拖拽（标题栏 pointer capture）
  const onPanelDragStart = (e: React.PointerEvent<HTMLDivElement>): void => {
    const area = canvasAreaRef.current
    if (area === null) return
    const panel = (e.target as HTMLElement).closest('[data-annotation-float]') as HTMLElement | null
    if (panel === null) return
    const areaBox = area.getBoundingClientRect()
    const panelBox = panel.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - panelBox.left, dy: e.clientY - panelBox.top }
    const onMove = (ev: PointerEvent): void => {
      const d = dragRef.current
      if (d === null) return
      const x = Math.max(0, Math.min(ev.clientX - d.dx - areaBox.left, areaBox.width - 120))
      const y = Math.max(0, Math.min(ev.clientY - d.dy - areaBox.top, areaBox.height - 60))
      setPanelPos({ x, y })
    }
    const onUp = (): void => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const modeHint = MODES.find(m => m.key === mode)?.hint ?? ''

  return (
    <>
      <CanvasToggle open={open} onToggle={() => persistOpen(!open)} />
      <CanvasDockHost open={open} width={width} onWidthChange={persistWidth}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }} data-openloop-canvas-workbench>
          <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }}>
            <span style={{ fontSize: 13, fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {snapshot !== null ? snapshot.canvas.title : '画布工作台'}
            </span>
            {/* 目录按钮（M4：工作区画布清单，点击切换） */}
            <button type="button" onClick={() => { setCatalogOpen(v => !v); if (!catalogOpen) void refreshCatalog() }} title="工作区画布目录"
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: catalogOpen ? `1px solid ${ACCENT}` : '1px solid transparent', cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', color: catalogOpen ? ACCENT : 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>目录</button>
            {/* 版本切换（M4：显式「版本 r2」标识 + history 图标——之前 cv_xxx@r2 太工程化，
                 * 用户看不出这是版本切换；完整 cvId 放 hover tooltip） */}
            {snapshot !== null ? (
              <span style={{ position: 'relative' }}>
                <button type="button" onClick={() => setRevMenuOpen(v => !v)}
                  title={`版本历史 · ${snapshot.canvasId}@r${snapshot.revision}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)', background: 'none', border: revMenuOpen ? `1px solid ${ACCENT}` : '1px solid transparent', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {/* history 图标（clock-counter-clockwise SVG） */}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 3 0 9-9 9.75 9.75 0 0 1-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
                  </svg>
                  版本 r{snapshot.revision} ▾
                </button>
                {revMenuOpen ? (() => {
                  const item = catalogItems.find(c => c.canvasId === snapshot.canvasId)
                  const revs = item !== undefined && item.revisions.length > 0 ? item.revisions : [snapshot.revision]
                  return (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 60, minWidth: 120, borderRadius: 8, padding: '4px', background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
                      {[...revs].reverse().map(r => (
                        <button key={r} type="button" onClick={() => { void openRevision(snapshot.canvasId, r) }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 10.5, padding: '4px 8px', borderRadius: 5, border: 0, cursor: 'pointer', fontFamily: 'ui-monospace, Menlo, monospace', background: r === snapshot.revision ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)' : 'none', color: r === snapshot.revision ? ACCENT : 'inherit' }}>
                          r{r}{r === snapshot.revision ? ' · 当前' : ''}
                        </button>
                      ))}
                    </div>
                  )
                })() : null}
              </span>
            ) : null}
            {snapshot !== null ? (
              <button type="button" onClick={() => setPanelOpen(v => !v)} title="评论面板（悬浮窗）"
                style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: panelOpen ? `1px solid ${ACCENT}` : '1px solid transparent', cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', color: panelOpen ? ACCENT : 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>
                评论{annotations.length > 0 ? ` ${annotations.length}` : ''}
              </button>
            ) : null}
            <button type="button" onClick={() => persistOpen(false)} title="收起（画布保留）"
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: 0, cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', color: 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>收起</button>
          </header>

          {snapshot === null ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '48px 20px', color: 'var(--dsw-alias-label-caption, #888)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h18M9 9v12" />
              </svg>
              <div style={{ fontSize: 12, lineHeight: 1.7, textAlign: 'center' }}>
                还没有打开的画布<br />
                <span style={{ fontSize: 11 }}>让 Agent 用 canvas 工具画一个，或在对话流的画布卡片上点「⇱ 工作台」</span>
              </div>
            </div>
          ) : (
            <>
              {/* toolbar：三模式（常驻可见） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))', flexShrink: 0 }}>
                {MODES.map(m => (
                  <button key={m.key} type="button" title={m.hint}
                    onClick={() => setMode(m.key)}
                    style={{
                      fontSize: 11, padding: '3px 10px', borderRadius: 6, fontFamily: 'inherit', cursor: 'pointer',
                      border: mode === m.key ? `1px solid ${ACCENT}` : '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
                      background: mode === m.key ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)' : 'none',
                      color: mode === m.key ? ACCENT : 'var(--dsw-alias-label-secondary, inherit)',
                    }}>{m.label}</button>
                ))}
                <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--dsw-alias-label-caption, #999)' }}>{modeHint}</span>
                {targets.length > 0 ? (
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT, fontWeight: 600 }}>已选 {targets.length} 个目标 → 在评论面板写评注</span>
                ) : null}
              </div>

              {/* 画布区：铺满 + 注释面板悬浮窗 */}
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14, position: 'relative' }} ref={canvasAreaRef}>
                {/* 工作区目录（M4：悬浮列表，点击切换画布。
                 * top:0 贴 toolbar 下沿——之前 top:12 在画布区内下沉 + toolbar 与画布区间距让目录显得「悬空」靠下。
                 * zIndex 65 保证在画布卡片之上、toolbar 之下也能被看见） */}
                {catalogOpen ? (
                  <div style={{ position: 'absolute', right: 12, top: 0, zIndex: 65, width: 270, maxHeight: 'min(420px, calc(100% - 24px))', overflow: 'auto', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))', boxShadow: '0 12px 36px rgba(0,0,0,.26)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>工作区画布（{catalogItems.length}）</span>
                      <button type="button" onClick={() => setCatalogOpen(false)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1, color: 'var(--dsw-alias-label-caption, #888)', fontFamily: 'inherit' }}>×</button>
                    </div>
                    {catalogItems.length === 0 ? (
                      <div style={{ padding: '20px 14px', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', textAlign: 'center' }}>
                        还没有画布产物<br /><span style={{ fontSize: 10 }}>让 Agent 用 canvas 工具生成第一个（历史画布首次续编后入册）</span>
                      </div>
                    ) : catalogItems.map(item => (
                      <button key={item.canvasId} type="button" onClick={() => { void openCanvas(item.canvasId) }}
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 0, borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.06))', cursor: 'pointer', background: snapshot?.canvasId === item.canvasId ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)' : 'none', fontFamily: 'inherit' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'inherit' }}>{item.title}</span>
                          {item.revisions.length > 1 ? <span style={{ fontSize: 9.5, color: ACCENT, fontWeight: 600 }}>r{item.revision} · {item.revisions.length}版</span> : <span style={{ fontSize: 9.5, color: 'var(--dsw-alias-label-caption, #999)' }}>r{item.revision}</span>}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--dsw-alias-label-caption, #999)', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                          {item.canvasId}{item.updatedAt.length > 0 ? ` · ${new Date(item.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : null}
                <CanvasSurface snapshot={snapshot} />
                <CanvasPinLayer
                  snapshot={snapshot}
                  containerRef={canvasAreaRef}
                  mode={mode}
                  targets={targets}
                  callbacks={{
                    onTargetsChange: (t) => { setTargets([...t]); setNote('') },
                    onSave: () => saveAnnotation(),
                    annotations,
                    onEditAnnotation: (a) => setEditAnn(a),
                    onDeleteAnnotation: (a) => { removeAnnotation(snapshot.canvasId, a.id); setAnnotations(listAnnotations(snapshot.canvasId)) },
                    onFocusNode: (id) => setFocusNodeId(id),
                  }}
                />

                {/* 注释面板悬浮窗（可拖拽，默认右上角） */}
                {panelOpen ? (
                  <div
                    data-annotation-float
                    style={{
                      position: 'absolute', zIndex: 45, width: 280, maxHeight: 'min(520px, calc(100% - 24px))',
                      display: 'flex', flexDirection: 'column',
                      borderRadius: 12, overflow: 'hidden',
                      background: 'var(--dsw-alias-bg-layer-1, #fff)',
                      border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))',
                      boxShadow: '0 12px 36px rgba(0,0,0,.26)',
                      ...(panelPos !== null ? { left: panelPos.x, top: panelPos.y } : { right: 12, top: 12 }),
                    }}
                  >
                    <div
                      onPointerDown={onPanelDragStart}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', cursor: 'grab', userSelect: 'none', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" opacity="0.4" aria-hidden="true"><circle cx="8" cy="5" r="1.6" /><circle cx="16" cy="5" r="1.6" /><circle cx="8" cy="12" r="1.6" /><circle cx="16" cy="12" r="1.6" /><circle cx="8" cy="19" r="1.6" /><circle cx="16" cy="19" r="1.6" /></svg>
                      <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>评论</span>
                      <button type="button" onClick={() => setPanelOpen(false)} title="关闭面板"
                        style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1, color: 'var(--dsw-alias-label-caption, #888)', fontFamily: 'inherit' }}>×</button>
                    </div>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                      <CommentPanel
                        targets={targets}
                        note={note}
                        setNote={setNote}
                        onRemoveTarget={(i) => setTargets(prev => prev.filter((_, j) => j !== i))}
                        onSave={saveAnnotation}
                        onCancel={() => { setTargets([]); setNote('') }}
                        annotations={annotations}
                        onEdit={(a) => setEditAnn(a)}
                        onDelete={(a) => { removeAnnotation(snapshot.canvasId, a.id); setAnnotations(listAnnotations(snapshot.canvasId)) }}
                        focusNodeId={focusNodeId}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </CanvasDockHost>

      {/* composer 注释胶囊（全局） */}
      <AnnotationCapsuleBar />

      {/* 注释编辑弹层 */}
      {editAnn !== null ? (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, width: 300, display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.22)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: ACCENT }}>编辑评论</div>
          <textarea value={editAnn.note} onChange={e => setEditAnn({ ...editAnn, note: e.target.value })} rows={3} autoFocus
            style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditAnn(null)} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>取消</button>
            <button type="button" onClick={() => { if (snapshot !== null) { updateAnnotationNote(snapshot.canvasId, editAnn.id, editAnn.note.trim()); setAnnotations(listAnnotations(snapshot.canvasId)) } setEditAnn(null) }} disabled={editAnn.note.trim().length === 0}
              style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: ACCENT }}>保存</button>
          </div>
        </div>
      ) : null}

      {/* toast */}
      {toast !== null ? (
        <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, fontSize: 11, padding: '7px 14px', borderRadius: 9, color: 'var(--dsw-alias-label-primary, inherit)', background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.25)' }}>{toast}</div>
      ) : null}
    </>
  )
}
