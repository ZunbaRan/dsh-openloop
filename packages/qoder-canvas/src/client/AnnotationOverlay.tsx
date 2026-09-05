/**
 * AnnotationOverlay v2（M2.5，用户 2026-09-05 拍板的交互重做）：
 * 「浏览器检查器选择器 + CodeBuddy 注释」模型：
 *
 * 1. 标注模式：节点 hover → outline 高亮 + 角标 badge（检查器感）；
 *    点选 → 高亮固定 + 选中元素右上悬浮「💬 评论」按钮
 * 2. 文本：画布内文本选中（浏览器原生 selection）→ 选区末端悬浮「评论」按钮
 * 3. 框选：拖框圈节点 → 松手【直接弹出评注输入框】（用户拍板，少一步点击）
 * 4. 评注输入框（悬浮可取消）→ 保存 → 草稿注入 composer（引用头+评注）
 *    + 注释持久化到画布（元素角标 ①，hover 弹出详情卡可编辑/删除）
 *
 * 事件模型（v0.2.1 教训保留）：蒙层 pointer-events:auto + cursor:crosshair；
 * 点选/框选/悬停命中全部走【纯几何法】（遍历节点 rect），不依赖 elementsFromPoint。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CanvasNode, CanvasSnapshot } from '../dsl.ts'
import { injectComposerDraft, reportAnnotation } from './composer-bridge.ts'
import { addAnnotation, formatAnnotationDraft, listAnnotations, removeAnnotation, updateAnnotationNote, type AnnotationTarget, type CanvasAnnotation } from './canvas-annotations.ts'

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'
const QUICK_PHRASES = ['太小了', '信息过时', '这里错了', '删掉这块'] as const

/** node id → 人类可读描述（类型 + 标题/首行） */
function nodeLabelOf(node: CanvasNode): string {
  const p = node.props as Record<string, unknown>
  const title = typeof p.title === 'string' && p.title.length > 0 ? p.title
    : typeof p.label === 'string' && p.label.length > 0 ? p.label
    : typeof p.text === 'string' && p.text.length > 0 ? (p.text.length > 24 ? `${p.text.slice(0, 24)}…` : p.text)
    : node.type
  return title
}

interface Rect { x: number; y: number; w: number; h: number }
function normalizeRect(r: Rect): Rect {
  return { x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h), w: Math.abs(r.w), h: Math.abs(r.h) }
}

/** 几何命中：surface 内找包含坐标点的最小面积 node */
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
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [lockedId, setLockedId] = useState<string | null>(null)       // 点选固定高亮（单节点）
  const [targets, setTargets] = useState<AnnotationTarget[]>([])      // 框选收集的 targets
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const [note, setNote] = useState('')
  const [noteBox, setNoteBox] = useState<Rect | null>(null)           // 评注输入框位置（跟随选中元素/框）
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>(() => listAnnotations(snapshot.canvasId))
  const [editAnn, setEditAnn] = useState<CanvasAnnotation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const surfaceRef = containerRef

  const nodeById = new Map(snapshot.canvas.nodes.map(n => [n.id, n]))

  const showToast = (msg: string): void => {
    setToast(msg)
    setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2200)
  }

  /** 文本选择监听（仅画布内）：selection 完成 → targets = 文本节选 + 浮评论按钮 */
  useEffect(() => {
    if (!active) return
    const onSel = (): void => {
      const sel = window.getSelection()
      if (sel === null || sel.isCollapsed || sel.rangeCount === 0) return
      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer
      const el = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element
      if (el === null || surfaceRef.current?.contains(el) !== true) return
      const text = sel.toString().trim()
      if (text.length < 4) return
      // 选区末端定位评论按钮（直接弹评注框——与框选同流程）
      const rects = range.getClientRects()
      const last = rects[rects.length - 1]
      if (last === undefined) return
      const box = surfaceRef.current.getBoundingClientRect()
      setTargets([{ kind: 'text', excerpt: text.length > 60 ? `${text.slice(0, 60)}…` : text }])
      setNoteBox({ x: last.right - box.left, y: last.bottom - box.top + 6, w: 320, h: 0 })
    }
    document.addEventListener('mouseup', onSel)
    return () => document.removeEventListener('mouseup', onSel)
  }, [active, surfaceRef])

  /** 收集 targets（单节点锁定/框选/文本已各自写入 setTargets）后弹评注框 */
  const openNoteBox = (anchor: Rect): void => {
    setNoteBox(anchor)
  }

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
    setTargets([])
    setLockedId(null)
    setNote('')
    setNoteBox(null)
    setActive(false)
  }

  /** 评注详情卡：hover 元素角标弹出 */
  const annForNode = (nodeId: string): CanvasAnnotation[] =>
    annotations.filter(a => a.targets.some(t => t.kind === 'node' && t.id === nodeId))

  // ── 非激活态：头部「标注」按钮 ──
  if (!active) {
    return (
      <button type="button" onClick={() => setActive(true)} title="标注画布：点选/框选元素或选中文本，写评注注入输入框"
        style={{
          position: 'absolute', top: 6, right: 8, zIndex: 40,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, padding: '2px 9px', borderRadius: 6, cursor: 'pointer',
          color: 'var(--dsw-alias-label-secondary, inherit)',
          background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))',
          border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
          fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        标注
      </button>
    )
  }

  const overlayStyle: CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 30,
    background: 'rgba(0,0,0,.04)',
    cursor: 'crosshair',
    pointerEvents: 'auto',
    userSelect: 'none',
  }

  return (
    <>
      {/* 控制条（头部） */}
      <div style={{ position: 'absolute', top: 6, right: 8, zIndex: 40, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: `1px solid ${ACCENT}`, boxShadow: '0 4px 16px rgba(0,0,0,.14)' }}>
        <span style={{ fontSize: 10, color: ACCENT, fontWeight: 600 }}>标注模式</span>
        <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>点选 / 框选 / 选文本</span>
        <button type="button" onClick={() => { setActive(false); setTargets([]); setLockedId(null); setNoteBox(null) }}
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: 0, cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', fontFamily: 'inherit' }}>取消</button>
      </div>

      {/* 蒙层（几何法事件） */}
      <div style={overlayStyle}
        onPointerMove={(e) => {
          const start = dragStart.current
          const box = surfaceRef.current?.getBoundingClientRect()
          if (start !== null && box !== undefined) {
            // 拖拽中：更新框
            setDraftRect({ x: start.x, y: start.y, w: e.clientX - box.left - start.x, h: e.clientY - box.top - start.y })
            setHoveredId(null)
            return
          }
          // 未拖拽：hover 高亮（检查器感）
          const surface = surfaceRef.current
          if (surface === null) return
          const hit = hitNode(surface, e.clientX, e.clientY)
          setHoveredId(hit?.id ?? null)
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const box = surfaceRef.current?.getBoundingClientRect()
          if (box === undefined) return
          dragStart.current = { x: e.clientX - box.left, y: e.clientY - box.top }
          setDraftRect({ x: e.clientX - box.left, y: e.clientY - box.top, w: 0, h: 0 })
        }}
        onPointerUp={() => {
          const rect = draftRect
          dragStart.current = null
          setDraftRect(null)
          if (rect === null) return
          const n = normalizeRect(rect)
          if (n.w < 10 && n.h < 10) {
            // 视为点选：命中节点 → 锁定高亮 + 评论按钮
            const surface = surfaceRef.current
            if (surface === null) return
            // 需要视口坐标：从 box 还原
            const box = surface.getBoundingClientRect()
            const hit = hitNode(surface, box.left + n.x, box.top + n.y)
            if (hit !== null) {
              const node = nodeById.get(hit.id)
              if (node !== undefined) {
                setLockedId(hit.id)
                setTargets([{ kind: 'node', id: hit.id, label: nodeLabelOf(node) }])
                // 评论按钮锚点：元素右上角（surface 内坐标）
                const box = surface.getBoundingClientRect()
                openNoteBox({ x: hit.rect.right - box.left, y: hit.rect.top - box.top, w: 320, h: 0 })
              }
            }
            return
          }
          // 框选：收集相交节点 → 直接弹评注框（用户拍板少一步）
          const surface = surfaceRef.current
          if (surface === null) return
          const box = surface.getBoundingClientRect()
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
            setTargets(hits)
            setLockedId(null)
            openNoteBox({ x: n.x + n.w, y: n.y, w: 320, h: 0 })
          }
        }}
      >
        {/* 拖拽框 */}
        {draftRect !== null ? <div style={{ ...normalizeRect(draftRect), position: 'absolute', border: `1.5px dashed ${ACCENT}`, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)', borderRadius: 4, pointerEvents: 'none' }} /> : null}
        {/* hover 高亮（检查器感；锁定/已在 targets 的不画） */}
        {hoveredId !== null && hoveredId !== lockedId && !targets.some(t => t.kind === 'node' && t.id === hoveredId) ? (
          <HighlightRect surface={surfaceRef.current} nodeId={hoveredId} borderStyle="outline" />
        ) : null}
        {/* 锁定/框选固定高亮 */}
        {targets.filter(t => t.kind === 'node').map(t => (
          <HighlightRect key={(t as { id: string }).id} surface={surfaceRef.current} nodeId={(t as { id: string }).id} borderStyle="solid" />
        ))}
        {/* 已保存注释的角标（节点 ①；hover 详情卡） */}
        {snapshot.canvas.nodes.map(n => {
          const anns = annForNode(n.id)
          if (anns.length === 0) return null
          return <AnnotationBadge key={n.id} surface={surfaceRef.current} nodeId={n.id} anns={anns} onEdit={(a) => setEditAnn(a)} onDelete={(a) => { removeAnnotation(snapshot.canvasId, a.id); setAnnotations(listAnnotations(snapshot.canvasId)) }} />
        })}
      </div>

      {/* 评注输入框（悬浮，targets 已收集时弹出） */}
      {noteBox !== null && targets.length > 0 ? (
        <div style={{ position: 'absolute', left: Math.max(8, Math.min(noteBox.x - 320, (surfaceRef.current?.getBoundingClientRect().width ?? 400) - 340)), top: noteBox.y, zIndex: 50, width: 320, display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.2)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {targets.map((t, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '1.5px 7px', borderRadius: 5, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)', color: ACCENT, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.kind === 'node' ? `${t.id} ${t.label}` : `文本 "${t.excerpt}"`}
                <button type="button" onClick={() => setTargets(prev => prev.filter((_, j) => j !== i))} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: 11, lineHeight: 1 }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {QUICK_PHRASES.map(p => (
              <button key={p} type="button" onClick={() => setNote(cur => cur.length > 0 ? `${cur}；${p}` : p)} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', background: 'none', cursor: 'pointer', color: 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>{p}</button>
            ))}
          </div>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="添加评论…（保存后注入输入框草稿）" rows={3} autoFocus
            style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setNoteBox(null); setTargets([]); setLockedId(null); setNote('') }} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
            <button type="button" onClick={saveAnnotation} disabled={note.trim().length === 0}
              style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: note.trim().length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', color: '#fff', background: note.trim().length > 0 ? ACCENT : 'var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2))' }}>保存</button>
          </div>
        </div>
      ) : null}

      {/* 注释详情编辑弹层 */}
      {editAnn !== null ? (
        <AnnotationEditPopover ann={editAnn} onSave={(note) => { updateAnnotationNote(snapshot.canvasId, editAnn.id, note); setAnnotations(listAnnotations(snapshot.canvasId)); setEditAnn(null) }} onClose={() => setEditAnn(null)} />
      ) : null}

      {/* toast */}
      {toast !== null ? (
        <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', zIndex: 60, fontSize: 10.5, padding: '5px 12px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 4px 14px rgba(0,0,0,.14)', whiteSpace: 'nowrap' }}>{toast}</div>
      ) : null}
    </>
  )
}

/** 节点高亮框（hover outline / 锁定 solid） */
function HighlightRect({ surface, nodeId, borderStyle }: { surface: HTMLElement | null; nodeId: string; borderStyle: 'outline' | 'solid' }): ReactNode {
  if (surface === null) return null
  const el = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(nodeId)}"]`)
  if (el === null) return null
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return (
    <div style={{ position: 'absolute', left: r.left - box.left - 3, top: r.top - box.top - 3, width: r.width + 6, height: r.height + 6, border: borderStyle === 'outline' ? `2px dashed ${ACCENT}` : `2px solid ${ACCENT}`, borderRadius: 8, pointerEvents: 'none', boxShadow: borderStyle === 'solid' ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : 'none' }} />
  )
}

/** 已保存注释角标（①；hover 详情卡） */
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
