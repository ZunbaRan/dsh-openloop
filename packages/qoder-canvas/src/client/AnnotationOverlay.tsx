/**
 * AnnotationOverlay v3（M2.5 二轮修复，用户 2026-09-05 七条反馈）：
 *
 * 架构核心变更：干掉「全蒙层」——初版用 inset:0 透明 div 盖在画布上，
 * 导致元素 hover/点选永远命中蒙层、几何法只能选到最大容器、文本选择全灭。
 * v3 改为三模式按钮各自的光标/交互模型：
 *
 * - 点选模式：画布容器 cursor:crosshair + 容器级 pointermove（几何法找
 *   节点 hover）+ 容器级 click 命中——**无蒙层**，节点直接可被 hover/点选
 * - 框选模式：容器级 pointerdown/move/up 拖拽出虚线框（无蒙层但用户
 *   按住拖动=框选，平时不挡交互）；框选过程中相交节点实时高亮；
 *   松手 → 弹评注框（targets 保留高亮）+ 弹层可拖动（snapshot 窗同款
 *   pointer capture 拖拽手感）
 * - 文本模式：容器 cursor:text + userSelect:text（浏览器原生选择
 *   正常工作，无蒙层遮挡）→ mouseup 时 selection 完成 → 弹评注框
 *
 * 取消语义（用户拍板 3）：取消只关评注框，targets 与高亮保留（可再点评论）。
 * 快捷短语删除（用户拍板 2）。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CanvasNode, CanvasSnapshot } from '../dsl.ts'
import { injectComposerDraft, reportAnnotation } from './composer-bridge.ts'
import { addAnnotation, formatAnnotationDraft, listAnnotations, removeAnnotation, updateAnnotationNote, type AnnotationTarget, type CanvasAnnotation } from './canvas-annotations.ts'

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

type Mode = 'pick' | 'box' | 'text'
interface Rect { x: number; y: number; w: number; h: number }

function nodeLabelOf(node: CanvasNode): string {
  const p = node.props as Record<string, unknown>
  return typeof p.title === 'string' && p.title.length > 0 ? p.title
    : typeof p.label === 'string' && p.label.length > 0 ? p.label
    : typeof p.text === 'string' && p.text.length > 0 ? (p.text.length > 24 ? `${p.text.slice(0, 24)}…` : p.text)
    : node.type
}

function normalizeRect(r: Rect): Rect {
  return { x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h), w: Math.abs(r.w), h: Math.abs(r.h) }
}

function hitNode(surface: HTMLElement, clientX: number, clientY: number): { id: string; rect: DOMRect } | null {
  let best: { id: string; area: number; rect: DOMRect } | null = null
  for (const el of surface.querySelectorAll<HTMLElement>('[data-canvas-node]')) {
    const r = el.getBoundingClientRect()
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) continue
    const area = r.width * r.height
    const id = el.getAttribute('data-canvas-node')
    if (id !== null && id.length > 0 && (best === null || area < best.area)) best = { id, area, rect: r }
  }
  return best === null ? null : { id: best.id, rect: best.rect }
}

export function AnnotationOverlay({ snapshot, containerRef }: { snapshot: CanvasSnapshot; containerRef: { current: HTMLDivElement | null } }): ReactNode {
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState<Mode>('pick')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [targets, setTargets] = useState<AnnotationTarget[]>([])
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const [note, setNote] = useState('')
  const [noteBox, setNoteBox] = useState<Rect | null>(null)
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>(() => listAnnotations(snapshot.canvasId))
  const [editAnn, setEditAnn] = useState<CanvasAnnotation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const surfaceRef = containerRef

  const nodeById = new Map(snapshot.canvas.nodes.map(n => [n.id, n]))
  const showToast = (msg: string): void => { setToast(msg); setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2200) }

  /** 容器光标：按模式切换（挂到 CanvasCard 的 relative div 上） */
  useEffect(() => {
    const surface = surfaceRef.current
    if (surface === null || !active) return
    const prev = { cursor: surface.style.cursor, userSelect: surface.style.userSelect }
    surface.style.cursor = mode === 'text' ? 'text' : 'crosshair'
    surface.style.userSelect = mode === 'text' ? 'text' : 'none'
    return () => { surface.style.cursor = prev.cursor; surface.style.userSelect = prev.userSelect }
  }, [active, mode, surfaceRef])

  /** 文本模式：selection 完成 → targets + 弹评注框 */
  useEffect(() => {
    if (!active || mode !== 'text') return
    const onUp = (): void => {
      const sel = window.getSelection()
      if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element
      if (el === null || surfaceRef.current?.contains(el) !== true) return
      const text = sel.toString().trim()
      if (text.length < 4) return
      const rects = range.getClientRects()
      const last = rects[rects.length - 1]
      if (last === undefined) return
      const box = surfaceRef.current.getBoundingClientRect()
      setTargets(prev => [...prev, { kind: 'text', excerpt: text.length > 60 ? `${text.slice(0, 60)}…` : text }])
      setNoteBox({ x: last.right - box.left, y: last.bottom - box.top + 6, w: 320, h: 0 })
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [active, mode, surfaceRef])

  /** 容器级指针事件（无蒙层；active 时挂 DOM 监听器到容器 div 上——
   *  用户反馈 5 的根因修复：事件在容器直接捕获，节点可被 hover/点选，
   *  不再被任何覆盖层拦截） */
  useEffect(() => {
    if (!active) return
    const surface = surfaceRef.current
    if (surface === null) return

    const onPointerMove = (e: PointerEvent): void => {
      if (dragStart.current !== null) {
        const box = surface.getBoundingClientRect()
        setDraftRect({ x: dragStart.current.x, y: dragStart.current.y, w: e.clientX - box.left - dragStart.current.x, h: e.clientY - box.top - dragStart.current.y })
        setHoveredId(null)
        return
      }
      if (mode === 'pick') {
        const hit = hitNode(surface, e.clientX, e.clientY)
        setHoveredId(hit?.id ?? null)
      }
    }
    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return
      // 点选：立即命中（不等 up，手感跟检查器一致）
      if (mode === 'pick') {
        const hit = hitNode(surface, e.clientX, e.clientY)
        if (hit !== null) {
          const node = nodeById.get(hit.id)
          if (node !== undefined) {
            setTargets(prev => [...prev, { kind: 'node', id: hit.id, label: nodeLabelOf(node) }])
            const box = surface.getBoundingClientRect()
            setNoteBox({ x: hit.rect.right - box.left, y: hit.rect.top - box.top, w: 320, h: 0 })
          }
        }
        return
      }
      // 框选：开始拖拽
      if (mode === 'box') {
        const box = surface.getBoundingClientRect()
        dragStart.current = { x: e.clientX - box.left, y: e.clientY - box.top }
        setDraftRect({ x: e.clientX - box.left, y: e.clientY - box.top, w: 0, h: 0 })
      }
    }
    const onPointerUp = (e: PointerEvent): void => {
      const rect = draftRect
      dragStart.current = null
      setDraftRect(null)
      if (rect === null || mode !== 'box') return
      const n = normalizeRect(rect)
      const box = surface.getBoundingClientRect()
      if (n.w < 10 && n.h < 10) {
        // 小位移 = 点选
        const hit = hitNode(surface, e.clientX, e.clientY)
        if (hit !== null) {
          const node = nodeById.get(hit.id)
          if (node !== undefined) {
            setTargets(prev => [...prev, { kind: 'node', id: hit.id, label: nodeLabelOf(node) }])
            setNoteBox({ x: hit.rect.right - box.left, y: hit.rect.top - box.top, w: 320, h: 0 })
          }
        }
        return
      }
      // 框选：收集相交节点 → 直接弹评注框
      const hits: AnnotationTarget[] = []
      for (const el of surface.querySelectorAll<HTMLElement>('[data-canvas-node]')) {
        const r = el.getBoundingClientRect()
        const nx = r.left - box.left, ny = r.top - box.top
        if (nx < n.x + n.w && nx + r.width > n.x && ny < n.y + n.h && ny + r.height > n.y) {
          const id = el.getAttribute('data-canvas-node')
          const node = id !== null ? nodeById.get(id) : undefined
          if (node !== undefined && id !== null) hits.push({ kind: 'node', id, label: nodeLabelOf(node) })
        }
      }
      if (hits.length > 0) {
        setTargets(prev => [...prev, ...hits])
        setNoteBox({ x: n.x + n.w, y: n.y, w: 320, h: 0 })
      }
    }

    surface.addEventListener('pointermove', onPointerMove)
    surface.addEventListener('pointerdown', onPointerDown)
    surface.addEventListener('pointerup', onPointerUp)
    return () => {
      surface.removeEventListener('pointermove', onPointerMove)
      surface.removeEventListener('pointerdown', onPointerDown)
      surface.removeEventListener('pointerup', onPointerUp)
    }
  }, [active, mode, surfaceRef, nodeById, draftRect])

  const saveAnnotation = (): void => {
    const trimmed = note.trim()
    if (trimmed.length === 0 || targets.length === 0) return
    const text = formatAnnotationDraft(snapshot, targets, trimmed)
    const ok = injectComposerDraft(text)
    addAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets, note: trimmed })
    setAnnotations(listAnnotations(snapshot.canvasId))
    reportAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets: targets.map(t => t.kind === 'node' ? t.id : 'text'), note: trimmed })
    showToast(ok ? '注释已保存并注入输入框草稿' : '注释已保存；注入失败已复制到剪贴板')
    if (!ok) { try { void navigator.clipboard?.writeText(text) } catch { /* 不可用 */ } }
    // 保存后 targets 清空（注释已挂角标），评注框关闭，退出标注模式
    setTargets([]); setNote(''); setNoteBox(null); setActive(false)
  }

  const annForNode = (nodeId: string): CanvasAnnotation[] => annotations.filter(a => a.targets.some(t => t.kind === 'node' && t.id === nodeId))

  // ── 非激活态：头部「标注」按钮 ──
  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} title="标注画布：点选/框选元素或选中文本，写评注注入输入框"
        style={{ position: 'absolute', top: 6, right: 8, zIndex: 40, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, padding: '2px 9px', borderRadius: 6, cursor: 'pointer', color: 'var(--dsw-alias-label-secondary, inherit)', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        标注
      </button>
    )
  }

  const MODE_LABEL: Record<Mode, string> = { pick: '点选', box: '框选', text: '选文本' }

  return (
    <>
      {/* 控制条：三模式按钮（用户拍板 4） */}
      <div style={{ position: 'absolute', top: 6, right: 8, zIndex: 40, display: 'flex', alignItems: 'center', gap: 5, padding: '4px 5px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: `1px solid ${ACCENT}`, boxShadow: '0 4px 16px rgba(0,0,0,.14)' }}>
        {(['pick', 'box', 'text'] as Mode[]).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', border: mode === m ? `1px solid ${ACCENT}` : '1px solid transparent', background: mode === m ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 14%, transparent)' : 'none', color: mode === m ? ACCENT : 'var(--dsw-alias-label-secondary, inherit)', fontWeight: mode === m ? 600 : 400 }}>
            {MODE_LABEL[m]}
          </button>
        ))}
        <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)', padding: '0 2px' }}>
          {targets.length > 0 ? `${targets.length} 项已选` : ''}
        </span>
        <button type="button" onClick={() => { setActive(false); setTargets([]); setNoteBox(null) }}
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: 0, cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', fontFamily: 'inherit' }}>退出</button>
      </div>

      {/* 交互层：无蒙层（容器级事件；用户拍板 5 的根因修复——初版蒙层盖住一切） */}
      <div
        style={{ position: 'absolute', inset: 0, zIndex: 30, pointerEvents: 'none' }}
        // 容器级事件挂在 CanvasCard 的 relative div 上——由下方的 document 监听接管
      />

      {/* hover 高亮（点选模式） */}
      {mode === 'pick' && hoveredId !== null && !targets.some(t => t.kind === 'node' && t.id === hoveredId) ? (
        <HighlightRect surface={surfaceRef.current} nodeId={hoveredId} borderStyle="outline" />
      ) : null}
      {/* targets 固定高亮 */}
      {targets.filter(t => t.kind === 'node').map(t => (
        <HighlightRect key={(t as { id: string }).id} surface={surfaceRef.current} nodeId={(t as { id: string }).id} borderStyle="solid" />
      ))}
      {/* 框选中：拖拽虚线框 */}
      {draftRect !== null ? <div style={{ ...normalizeRect(draftRect), position: 'absolute', border: `1.5px dashed ${ACCENT}`, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)', borderRadius: 4, pointerEvents: 'none', zIndex: 30 }} /> : null}
      {/* 注释角标（节点 ①） */}
      {snapshot.canvas.nodes.map(n => {
        const anns = annForNode(n.id)
        if (anns.length === 0) return null
        return <AnnotationBadge key={n.id} surface={surfaceRef.current} nodeId={n.id} anns={anns} onEdit={(a) => setEditAnn(a)} onDelete={(a) => { removeAnnotation(snapshot.canvasId, a.id); setAnnotations(listAnnotations(snapshot.canvasId)) }} />
      })}

      {/* 评注输入框（可拖动；targets 已收集时弹出） */}
      {noteBox !== null && targets.length > 0 ? (
        <NoteBoxPopover anchor={noteBox} surface={surfaceRef.current} targets={targets} note={note} setNote={setNote}
          onRemoveTarget={(i) => setTargets(prev => prev.filter((_, j) => j !== i))}
          onCancel={() => { setNoteBox(null); setNote('') /* 取消只关框，targets/高亮保留（拍板 3） */ }}
          onSave={saveAnnotation} />
      ) : null}

      {/* 注释编辑弹层 */}
      {editAnn !== null ? (
        <AnnotationEditPopover ann={editAnn} onSave={(n) => { updateAnnotationNote(snapshot.canvasId, editAnn.id, n); setAnnotations(listAnnotations(snapshot.canvasId)); setEditAnn(null) }} onClose={() => setEditAnn(null)} />
      ) : null}

      {/* toast */}
      {toast !== null ? (
        <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', zIndex: 60, fontSize: 10.5, padding: '5px 12px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 4px 14px rgba(0,0,0,.14)', whiteSpace: 'nowrap' }}>{toast}</div>
      ) : null}
    </>
  )
}

/** 节点高亮框 */
function HighlightRect({ surface, nodeId, borderStyle }: { surface: HTMLElement | null; nodeId: string; borderStyle: 'outline' | 'solid' }): ReactNode {
  if (surface === null) return null
  const el = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(nodeId)}"]`)
  if (el === null) return null
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return (
    <div style={{ position: 'absolute', left: r.left - box.left - 3, top: r.top - box.top - 3, width: r.width + 6, height: r.height + 6, border: borderStyle === 'outline' ? `2px dashed ${ACCENT}` : `2px solid ${ACCENT}`, borderRadius: 8, pointerEvents: 'none', zIndex: 30, boxShadow: borderStyle === 'solid' ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : 'none' }} />
  )
}

/** 注释角标（①；hover 详情卡） */
function AnnotationBadge({ surface, nodeId, anns, onEdit, onDelete }: { surface: HTMLElement | null; nodeId: string; anns: CanvasAnnotation[]; onEdit: (a: CanvasAnnotation) => void; onDelete: (a: CanvasAnnotation) => void }): ReactNode {
  const [hover, setHover] = useState(false)
  if (surface === null) return null
  const el = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(nodeId)}"]`)
  if (el === null) return null
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return (
    <div style={{ position: 'absolute', left: r.right - box.left - 10, top: r.top - box.top - 8, zIndex: 35 }}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 17, height: 17, padding: '0 4px', borderRadius: 999, fontSize: 10, fontWeight: 700, color: '#fff', background: ACCENT, boxShadow: '0 2px 8px rgba(0,0,0,.2)', cursor: 'pointer' }}>{anns.length}</span>
      {hover ? (
        <div style={{ position: 'absolute', left: 0, top: 20, zIndex: 55, width: 260, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 9, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 26px rgba(0,0,0,.2)', userSelect: 'text' }}>
          {anns.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11, lineHeight: 1.5 }}>
              <span style={{ flex: 1, minWidth: 0 }}>{a.note}</span>
              <button type="button" onClick={() => onEdit(a)} title="编辑" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 0 }}>✎</button>
              <button type="button" onClick={() => onDelete(a)} title="删除" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 0 }}>🗑</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/** 评注输入框（可拖动：snapshot 窗同款 pointer capture 手感；无快捷短语） */
function NoteBoxPopover({ anchor, surface, targets, note, setNote, onRemoveTarget, onCancel, onSave }: {
  anchor: Rect
  surface: HTMLElement | null
  targets: readonly AnnotationTarget[]
  note: string
  setNote: (v: string) => void
  onRemoveTarget: (i: number) => void
  onCancel: () => void
  onSave: () => void
}): ReactNode {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    const surfaceW = surface?.getBoundingClientRect().width ?? 400
    return { x: Math.max(8, Math.min(anchor.x - 320, surfaceW - 340)), y: anchor.y }
  })
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)

  const beginDrag = (e: React.PointerEvent<HTMLElement>): void => {
    if (e.button !== 0) return
    e.preventDefault()
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    const el = e.currentTarget
    try { el.setPointerCapture(e.pointerId) } catch { /* 可选 */ }
    const move = (ev: PointerEvent): void => {
      const d = dragRef.current
      if (d === null) return
      setPos({ x: Math.max(8, d.ox + ev.clientX - d.sx), y: Math.max(8, d.oy + ev.clientY - d.sy) })
    }
    const up = (): void => {
      dragRef.current = null
      el.ownerDocument.defaultView?.removeEventListener('pointermove', move)
      el.ownerDocument.defaultView?.removeEventListener('pointerup', up)
    }
    const view = el.ownerDocument.defaultView
    if (view !== null) {
      view.addEventListener('pointermove', move)
      view.addEventListener('pointerup', up)
    }
  }

  return (
    <div style={{ position: 'absolute', left: pos.x, top: pos.y, zIndex: 50, width: 320, display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.2)' }}>
      {/* 拖动把手（snapshot 手感） */}
      <div onPointerDown={beginDrag} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'grab', userSelect: 'none', margin: '-4px -6px 0', padding: '4px 6px', borderRadius: '8px 8px 0 0' }}
        onPointerEnter={undefined}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--dsw-alias-label-caption, #888)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" />
        </svg>
        <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>添加评论（{targets.length} 项）</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {targets.map((t, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '1.5px 7px', borderRadius: 5, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)', color: ACCENT, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {t.kind === 'node' ? `${t.id} ${t.label}` : `文本 "${t.excerpt}"`}
            <button type="button" onClick={() => onRemoveTarget(i)} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: 11, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="添加评论…（保存后注入输入框草稿）" rows={3} autoFocus
        style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onCancel} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
        <button type="button" onClick={onSave} disabled={note.trim().length === 0}
          style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: note.trim().length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', color: '#fff', background: note.trim().length > 0 ? ACCENT : 'var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2))' }}>保存</button>
      </div>
    </div>
  )
}

/** 注释编辑弹层 */
function AnnotationEditPopover({ ann, onSave, onClose }: { ann: CanvasAnnotation; onSave: (note: string) => void; onClose: () => void }): ReactNode {
  const [note, setNote] = useState(ann.note)
  return (
    <div style={{ position: 'absolute', top: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 70, width: 300, display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.22)' }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: ACCENT }}>编辑注释</div>
      <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} autoFocus style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onClose} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
        <button type="button" onClick={() => onSave(note.trim())} disabled={note.trim().length === 0} style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: ACCENT }}>保存</button>
      </div>
    </div>
  )
}
