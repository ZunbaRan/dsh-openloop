/**
 * CanvasPinLayer：工作台画布的元素 pin 标注层（design-comments 范式，QODER_CANVAS_SIDEBAR §3）。
 *
 * 与对话流版 AnnotationOverlay（已废弃的蒙层架构）的根本区别：
 * - 【零蒙层】：事件直接挂画布容器（DOM 监听），节点直接被 hover/点选
 * - 评论标记 = 钉在元素上的 pin（①角标），评论 UI 在右侧【评论面板】（常驻），
 *   不再挤画布浮动小框
 * - 点选：元素实线高亮 + pin 亮起 + 评论面板定位该元素 + 元素旁浮「💬」
 * - 框选：拖框 → 弹评注框（targets 多 pin）
 * - 文本：选中文本 → 弹评注框（节选进 targets）
 *
 * 事件用容器级 DOM 监听（v0.3.1 无蒙层几何法验证版），在本组件内聚。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CanvasNode, CanvasSnapshot } from '../dsl.ts'
import { injectComposerDraft, reportAnnotation } from './composer-bridge.ts'
import { addAnnotation, formatAnnotationDraft, listAnnotations, type AnnotationTarget, type CanvasAnnotation } from './canvas-annotations.ts'

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'
interface Rect { x: number; y: number; w: number; h: number }

export function nodeLabelOf(node: CanvasNode): string {
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

export interface PinLayerCallbacks {
  /** targets 变化（评论面板据此显示新建输入框） */
  onTargetsChange: (targets: AnnotationTarget[]) => void
  /** 保存注释（写 store + 注入 composer + toast） */
  onSave: (targets: AnnotationTarget[], note: string) => void
  /** 已保存注释（元素 pin 角标） */
  annotations: CanvasAnnotation[]
  onEditAnnotation: (a: CanvasAnnotation) => void
  onDeleteAnnotation: (a: CanvasAnnotation) => void
  /** 定位到某元素的注释（评论面板滚动） */
  onFocusNode: (nodeId: string) => void
}

export function CanvasPinLayer({ snapshot, containerRef, callbacks }: {
  snapshot: CanvasSnapshot
  containerRef: { current: HTMLDivElement | null }
  callbacks: PinLayerCallbacks
}): ReactNode {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [lockedId, setLockedId] = useState<string | null>(null)
  const [draftRect, setDraftRect] = useState<Rect | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const surfaceRef = containerRef
  const nodeById = new Map(snapshot.canvas.nodes.map(n => [n.id, n]))

  /** 容器级 DOM 监听（零蒙层） */
  useEffect(() => {
    const surface = surfaceRef.current
    if (surface === null) return
    const prev = { cursor: surface.style.cursor, userSelect: surface.style.userSelect }
    surface.style.cursor = 'crosshair'
    surface.style.userSelect = 'none'

    const onPointerMove = (e: PointerEvent): void => {
      if (dragStart.current !== null) {
        const box = surface.getBoundingClientRect()
        setDraftRect({ x: dragStart.current.x, y: dragStart.current.y, w: e.clientX - box.left - dragStart.current.x, h: e.clientY - box.top - dragStart.current.y })
        setHoveredId(null)
        return
      }
      const hit = hitNode(surface, e.clientX, e.clientY)
      setHoveredId(hit?.id ?? null)
    }
    const onPointerDown = (e: PointerEvent): void => {
      if (e.button !== 0) return
      // 点选（立即命中）：锁定高亮 + targets + 评论面板定位
      const hit = hitNode(surface, e.clientX, e.clientY)
      if (hit !== null) {
        const node = nodeById.get(hit.id)
        if (node !== undefined) {
          setLockedId(hit.id)
          callbacks.onFocusNode(hit.id)
          callbacks.onTargetsChange([{ kind: 'node', id: hit.id, label: nodeLabelOf(node) }])
        }
        return
      }
      // 空白按下：进入框选
      const box = surface.getBoundingClientRect()
      dragStart.current = { x: e.clientX - box.left, y: e.clientY - box.top }
      setDraftRect({ x: e.clientX - box.left, y: e.clientY - box.top, w: 0, h: 0 })
    }
    const onPointerUp = (): void => {
      const rect = draftRect
      dragStart.current = null
      setDraftRect(null)
      if (rect === null) return
      const n = normalizeRect(rect)
      if (n.w < 10 && n.h < 10) return  // 小位移非框选（已在 down 里处理点选）
      // 框选：收集相交节点 → targets
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
      if (hits.length > 0) { setLockedId(null); callbacks.onTargetsChange(hits) }
    }
    surface.addEventListener('pointermove', onPointerMove)
    surface.addEventListener('pointerdown', onPointerDown)
    surface.addEventListener('pointerup', onPointerUp)
    return () => {
      surface.style.cursor = prev.cursor
      surface.style.userSelect = prev.userSelect
      surface.removeEventListener('pointermove', onPointerMove)
      surface.removeEventListener('pointerdown', onPointerDown)
      surface.removeEventListener('pointerup', onPointerUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surfaceRef, snapshot.canvasId])

  return (
    <>
      {/* hover 高亮 + DevTools 风格元素信息 tooltip（type #id · 宽×高） */}
      {hoveredId !== null && hoveredId !== lockedId ? (
        <HighlightRect surface={surfaceRef.current} nodeId={hoveredId} borderStyle="outline"
          tooltip={(() => { const n = nodeById.get(hoveredId); return n !== undefined ? `${n.type} #${hoveredId}` : `#${hoveredId}` })()} />
      ) : null}
      {/* 锁定/框选高亮（targets 由 callbacks 传给面板，pin 层只画当前锁定的） */}
      {lockedId !== null ? (
        <HighlightRect surface={surfaceRef.current} nodeId={lockedId} borderStyle="solid"
          tooltip={(() => { const n = nodeById.get(lockedId); return n !== undefined ? `${n.type} #${lockedId}` : `#${lockedId}` })()} />
      ) : null}
      {/* 框选拖拽虚线框 */}
      {draftRect !== null ? <div style={{ ...normalizeRect(draftRect), position: 'absolute', border: `1.5px dashed ${ACCENT}`, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)', borderRadius: 4, pointerEvents: 'none', zIndex: 30 }} /> : null}
      {/* 元素 pin（①角标 + hover 详情卡） */}
      {snapshot.canvas.nodes.map(n => {
        const anns = callbacks.annotations.filter(a => a.targets.some(t => t.kind === 'node' && t.id === n.id))
        if (anns.length === 0) return null
        return <PinBadge key={n.id} surface={surfaceRef.current} nodeId={n.id} anns={anns} onEdit={callbacks.onEditAnnotation} onDelete={callbacks.onDeleteAnnotation} />
      })}
    </>
  )
}

function HighlightRect({ surface, nodeId, borderStyle, tooltip }: { surface: HTMLElement | null; nodeId: string; borderStyle: 'outline' | 'solid'; tooltip?: string }): ReactNode {
  if (surface === null) return null
  const el = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(nodeId)}"]`)
  if (el === null) return null
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return (
    <>
      {/* DevTools 式底色高亮 + 边框 */}
      <div style={{
        position: 'absolute', left: r.left - box.left - 3, top: r.top - box.top - 3, width: r.width + 6, height: r.height + 6,
        border: borderStyle === 'outline' ? `1.5px solid ${ACCENT}` : `2px solid ${ACCENT}`, borderRadius: 6, pointerEvents: 'none', zIndex: 30,
        background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)',
        boxShadow: borderStyle === 'solid' ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : 'none',
      }} />
      {/* 元素信息 tooltip（DevTools 检查器风格：type #id · 宽×高） */}
      {tooltip !== undefined ? (
        <div style={{
          position: 'absolute', left: r.left - box.left - 3, top: Math.max(2, r.top - box.top - 22), zIndex: 31,
          fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1,
          padding: '3px 7px', borderRadius: 4, pointerEvents: 'none', whiteSpace: 'nowrap',
          color: '#fff', background: 'var(--dsw-alias-state-business-primary, #4176e6)',
          boxShadow: '0 2px 6px rgba(0,0,0,.2)',
        }}>
          {tooltip} · {Math.round(r.width)}×{Math.round(r.height)}
        </div>
      ) : null}
    </>
  )
}

function PinBadge({ surface, nodeId, anns, onEdit, onDelete }: { surface: HTMLElement | null; nodeId: string; anns: CanvasAnnotation[]; onEdit: (a: CanvasAnnotation) => void; onDelete: (a: CanvasAnnotation) => void }): ReactNode {
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
        <div style={{ position: 'absolute', right: 0, top: 20, zIndex: 55, width: 260, display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 10px', borderRadius: 9, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 26px rgba(0,0,0,.2)', userSelect: 'text' }}>
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
