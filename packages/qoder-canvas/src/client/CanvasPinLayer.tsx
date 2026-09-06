/**
 * CanvasPinLayer：画布上的元素 pin 标注层（S7 元素级精度重写）。
 *
 * 核心升级（2026-09-06 用户拍板，对齐 workbuddy/DevTools 检查器精度）：
 * - 点选命中 = elementsFromPoint 的【最深层 DOM 元素】，不再只到 data-canvas-node 级
 *   ——复杂布局里能选到一个小框里的一个胶囊/一个字
 * - target 记录：所属 nodeId（DSL 注入）+ domPath（node → 元素的 CSS 路径）+ tag + 文本
 * - hover 高亮元素本身 + DevTools 式 tooltip（tag · 宽×高）
 * - mode 受控（toolbar 提到 CanvasWorkbench）
 *
 * 设计参照（QODER_CANVAS_SIDEBAR §3）：零蒙层拦截，hover 高亮 → 点击锁定 →
 * targets 气泡 → 评注 → 结构化草稿（canvas-annotations.ts）。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CanvasSnapshot } from '../dsl.ts'
import type { AnnotationTarget, CanvasAnnotation } from './canvas-annotations.ts'

export type PinMode = 'point' | 'marquee' | 'text'

export interface PinLayerCallbacks {
  /** 一次完整交互（点选锁定/框选完成/划字完成）产出的 targets */
  readonly onTargetsChange: (targets: readonly AnnotationTarget[]) => void
  /** Enter 快捷键 → 工作台保存 */
  readonly onSave: () => void
  /** 已存注释（画 badges） */
  readonly annotations: readonly CanvasAnnotation[]
  readonly onEditAnnotation: (a: CanvasAnnotation) => void
  readonly onDeleteAnnotation: (a: CanvasAnnotation) => void
  /** hover badge/列表 → 工作台联动高亮 */
  readonly onFocusNode: (nodeId: string | null) => void
}

interface Props {
  readonly snapshot: CanvasSnapshot
  readonly containerRef: { readonly current: HTMLElement | null }
  readonly mode: PinMode
  /** 当前选中 targets（S8 高亮驱动源：框选 N 个全部亮蓝框；保存/Esc 清空后高亮自动消失） */
  readonly targets: readonly AnnotationTarget[]
  readonly callbacks: PinLayerCallbacks
}

/** 元素级命中结果 */
interface ElementHit {
  readonly nodeId: string
  /** 从 node 元素到命中元素的 CSS 路径；'' = node 根元素本身 */
  readonly domPath: string
  readonly tag: string
  readonly text?: string | undefined
}

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

/** 已存注释的编号角标（点击弹操作卡） */
function PinBadge({ n, annotation, onEdit, onDelete, onHover }: {
  readonly n: number
  readonly annotation: CanvasAnnotation
  readonly onEdit: () => void
  readonly onDelete: () => void
  readonly onHover: (id: string | null) => void
}): ReactNode {
  const [cardOpen, setCardOpen] = useState(false)
  const firstTarget = annotation.targets[0]
  const anchorId = firstTarget !== undefined && (firstTarget.kind === 'node' || firstTarget.kind === 'element') ? firstTarget.id : null
  return (
    <>
      <button
        type="button"
        data-openloop-pin-badge
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.stopPropagation(); setCardOpen(v => !v) }}
        onPointerEnter={() => { if (anchorId !== null) onHover(anchorId) }}
        onPointerLeave={() => onHover(null)}
        title={annotation.note}
        style={{
          position: 'absolute', right: -9, top: -9, zIndex: 40,
          width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--dsw-alias-bg-layer-1, #fff)',
          background: ACCENT, color: '#fff', fontSize: 10, fontWeight: 700, lineHeight: 1,
          cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,.25)', fontFamily: 'inherit',
        }}
      >
        {n}
      </button>
      {cardOpen ? (
        <div
          onPointerDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', right: -8, top: 14, zIndex: 41, width: 190,
            borderRadius: 9, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6,
            background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
            boxShadow: '0 8px 24px rgba(0,0,0,.22)', fontSize: 11,
          }}
        >
          <div style={{ color: 'var(--dsw-alias-label-secondary, inherit)', lineHeight: 1.5, maxHeight: 72, overflow: 'auto' }}>{annotation.note}</div>
          <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { onEdit(); setCardOpen(false) }} style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 5, border: `1px solid ${ACCENT}`, background: 'none', color: ACCENT, cursor: 'pointer', fontFamily: 'inherit' }}>编辑</button>
            <button type="button" onClick={() => { onDelete(); setCardOpen(false) }} style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 5, border: '1px solid var(--dsw-alias-state-business-danger, #d0453e)', background: 'none', color: 'var(--dsw-alias-state-business-danger, #d0453e)', cursor: 'pointer', fontFamily: 'inherit' }}>删除</button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function CanvasPinLayer({ snapshot, containerRef, mode, targets, callbacks }: Props): ReactNode {
  const [hovered, setHovered] = useState<ElementHit | null>(null)
  const [locked, setLocked] = useState<ElementHit | null>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  /** 框选拖拽中实时命中的 nodeIds（Figma 式即时反馈） */
  const [marqueeHits, setMarqueeHits] = useState<string[]>([])
  const marqueeActive = useRef(false)
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  const surfaceRef = useRef<HTMLElement | null>(null)
  // 每次渲染同步 surface（监听挂在画布容器上——画布会随 snapshot 重渲染，但容器稳定）
  surfaceRef.current = containerRef.current

  // node 目标分组（badges：一个 node 上可能有多个注释，取第一个定位）
  const annotationsByNode = new Map<string, { ann: CanvasAnnotation; n: number }[]>()
  callbacks.annotations.forEach((ann, i) => {
    const t = ann.targets[0]
    if (t !== undefined && (t.kind === 'node' || t.kind === 'element')) {
      const list = annotationsByNode.get(t.id) ?? []
      list.push({ ann, n: i + 1 })
      annotationsByNode.set(t.id, list)
    }
  })

  /**
   * 元素级命中（S7 核心）：elementsFromPoint 取最深层属于画布的元素。
   * - 跳过 pin 层自身（badges/高亮——高亮是 pointer-events:none 本不会被返回，badge 需要跳过）
   * - 返回元素 + 所属 nodeId + domPath
   */
  const hitElement = (x: number, y: number): ElementHit | null => {
    const surface = surfaceRef.current
    if (surface === null) return null
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.closest('[data-openloop-canvas-pin-layer]') !== null) continue
      if (!surface.contains(el)) continue
      const nodeEl = el.closest('[data-canvas-node]')
      if (nodeEl === null || !surface.contains(nodeEl)) continue
      const nodeId = nodeEl.getAttribute('data-canvas-node')
      if (nodeId === null || nodeId.length === 0) continue
      if (el === nodeEl) {
        return { nodeId, domPath: '', tag: nodeEl.tagName.toLowerCase() }
      }
      const domPath = domPathWithin(nodeEl, el)
      const text = (el.textContent ?? '').trim()
      return {
        nodeId,
        domPath,
        tag: el.tagName.toLowerCase(),
        text: text.length > 0 ? text.slice(0, 40) : undefined,
      }
    }
    return null
  }

  /** 命中矩形内的全部 node（框选保持 node 级——用户拍板框选暂不深化） */
  const hitNodesInRect = (rect: { left: number; top: number; right: number; bottom: number }): string[] => {
    const surface = surfaceRef.current
    if (surface === null) return []
    const out: string[] = []
    for (const el of surface.querySelectorAll('[data-canvas-node]')) {
      const r = el.getBoundingClientRect()
      if (r.left >= rect.left && r.right <= rect.right && r.top >= rect.top && r.bottom <= rect.bottom) {
        const id = el.getAttribute('data-canvas-node')
        if (id !== null) out.push(id)
      }
    }
    return out
  }

  // 文本划选：Range 索引（与 S4 相同）
  const buildRangeIndex = (range: Range): { nodeId: string; text: string }[] => {
    const surface = surfaceRef.current
    if (surface === null) return []
    const out: { nodeId: string; text: string }[] = []
    for (const el of surface.querySelectorAll('[data-canvas-node]')) {
      const id = el.getAttribute('data-canvas-node')
      if (id === null) continue
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let textNode = walker.nextNode()
      let acc = ''
      let hit = false
      while (textNode !== null) {
        const tr = document.createRange()
        tr.selectNodeContents(textNode)
        if (range.compareBoundaryPoints(Range.END_TO_START, tr) < 0 && range.compareBoundaryPoints(Range.START_TO_END, tr) > 0) {
          acc += textNode.textContent ?? ''
          hit = true
        }
        textNode = walker.nextNode()
      }
      if (hit) out.push({ nodeId: id, text: acc.trim() })
    }
    return out
  }

  const hitText = (): { nodeId: string; text: string }[] => {
    const sel = window.getSelection()
    if (sel === null || sel.rangeCount === 0 || sel.isCollapsed) return []
    const surface = surfaceRef.current
    if (surface === null) return []
    const range = sel.getRangeAt(0)
    if (!surface.contains(range.commonAncestorContainer)) return []
    return buildRangeIndex(range)
  }

  // 容器级事件（挂画布滚动容器，零蒙层）
  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    /**
     * 悬浮注释面板内的交互完全豁免（真机教训 2026-09-06：面板在画布容器内，
     * 面板上的点击会冒泡到容器触发点选——点 textarea/保存按钮时穿透命中
     * 画布元素或把 targets 重置为空，导致「评论了但什么都没保存」）
     */
    const inFloatPanel = (e: Event): boolean =>
      e.target instanceof Element && e.target.closest('[data-annotation-float]') !== null

    const onPointerMove = (e: PointerEvent): void => {
      if (inFloatPanel(e)) { setHovered(null); return }
      if (mode === 'point' && !marqueeActive.current) {
        setHovered(hitElement(e.clientX, e.clientY))
      } else if (marqueeActive.current) {
        setMarquee(prev => prev !== null ? { ...prev, x1: e.clientX, y1: e.clientY } : null)
        // 实时反馈：矩形内 node 即时亮框（用 ref 起点算，避免 state 闭包旧值）
        const start = marqueeStart.current
        if (start !== null) {
          const rect = {
            left: Math.min(start.x, e.clientX), right: Math.max(start.x, e.clientX),
            top: Math.min(start.y, e.clientY), bottom: Math.max(start.y, e.clientY),
          }
          setMarqueeHits(hitNodesInRect(rect))
        }
      }
    }
    const onPointerDown = (e: PointerEvent): void => {
      if (inFloatPanel(e)) return
      if (mode === 'marquee' && e.button === 0) {
        marqueeActive.current = true
        marqueeStart.current = { x: e.clientX, y: e.clientY }
        setMarquee({ x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY })
        setMarqueeHits([])
        setLocked(null)
        e.preventDefault()
      }
    }
    const onPointerUp = (e: PointerEvent): void => {
      if (inFloatPanel(e)) { marqueeActive.current = false; marqueeStart.current = null; setMarquee(null); setMarqueeHits([]); return }
      if (mode === 'point' && !marqueeActive.current) {
        const hit = hitElement(e.clientX, e.clientY)
        if (hit !== null) {
          setLocked(hit)
          const node = snapshot.canvas.nodes.find(n => n.id === hit.nodeId)
          const type = node?.type ?? hit.nodeId
          if (hit.domPath.length === 0) {
            // 命中 node 根元素——node 级
            const label = node !== undefined ? String(node.props.label ?? node.props.title ?? hit.nodeId) : hit.nodeId
            callbacks.onTargetsChange([{ kind: 'node', id: hit.nodeId, label }])
          } else {
            callbacks.onTargetsChange([{
              kind: 'element',
              id: hit.nodeId,
              label: `${type} ${hit.tag}${hit.text !== undefined ? ` "${hit.text.slice(0, 20)}"` : ''}`,
              tag: hit.tag,
              domPath: hit.domPath,
              text: hit.text,
            }])
          }
        } else {
          setLocked(null)
          callbacks.onTargetsChange([])
        }
      } else if (marqueeActive.current) {
        marqueeActive.current = false
        marqueeStart.current = null
        setMarqueeHits([])
        setMarquee(prev => {
          if (prev !== null) {
            const rect = {
              left: Math.min(prev.x0, prev.x1), right: Math.max(prev.x0, prev.x1),
              top: Math.min(prev.y0, prev.y1), bottom: Math.max(prev.y0, prev.y1),
            }
            if (rect.right - rect.left > 6 && rect.bottom - rect.top > 6) {
              const nodes = hitNodesInRect(rect)
              if (nodes.length > 0) {
                callbacks.onTargetsChange(nodes.map(id => {
                  const node = snapshot.canvas.nodes.find(n => n.id === id)
                  const label = node !== undefined ? String(node.props.label ?? node.props.title ?? id) : id
                  return { kind: 'node', id, label } as const
                }))
              } else {
                callbacks.onTargetsChange([])
              }
            }
          }
          return null
        })
      } else if (mode === 'text') {
        const hits = hitText()
        const first = hits[0]
        if (first !== undefined) {
          const excerpt = hits.map(h => h.text).join(' ').slice(0, 120)
          // 带所属节点 id（S7.1：注入时 Agent 能定位到 nodes[i]，不再只靠文本猜）
          callbacks.onTargetsChange([{ kind: 'text', excerpt, nodeId: first.nodeId }])
        }
      }
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') { setLocked(null); setMarquee(null); setMarqueeHits([]); callbacks.onTargetsChange([]) }
      if (e.key === 'Enter' && (e.target === document.body || e.target === container)) callbacks.onSave()
    }
    container.addEventListener('pointermove', onPointerMove)
    container.addEventListener('pointerdown', onPointerDown)
    container.addEventListener('pointerup', onPointerUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('pointerdown', onPointerDown)
      container.removeEventListener('pointerup', onPointerUp)
      document.removeEventListener('keydown', onKeyDown)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, snapshot.canvasId, snapshot.revision, containerRef.current])

  // 光标语义
  const cursor = mode === 'marquee' ? 'crosshair' : mode === 'text' ? 'text' : 'default'

  return (
    <>
      {/* 光标样式注入容器 */}
      <style>{`[data-openloop-canvas-workbench] [data-openloop-canvas]{ cursor: ${cursor}; }`}</style>
      <div data-openloop-canvas-pin-layer style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
        {/* hover 高亮（元素级）+ DevTools 式 tooltip */}
        {hovered !== null && (locked === null || hovered.nodeId !== locked.nodeId || hovered.domPath !== locked.domPath) ? (
          <HighlightEl surface={surfaceRef.current} hit={hovered} borderStyle="outline" nodeType={snapshot.canvas.nodes.find(n => n.id === hovered.nodeId)?.type} />
        ) : null}
        {/* 选中高亮（S8：targets 驱动——点选 1 个带 tooltip；框选 N 个全部亮框不带 tooltip） */}
        {targets.map(t => {
          if (t.kind !== 'node' && t.kind !== 'element') return null
          const hit: ElementHit = t.kind === 'element'
            ? { nodeId: t.id, domPath: t.domPath, tag: t.tag, text: t.text }
            : { nodeId: t.id, domPath: '', tag: 'div' }
          return (
            <HighlightEl key={`sel-${t.id}-${t.kind === 'element' ? t.domPath : 'root'}`}
              surface={surfaceRef.current} hit={hit} borderStyle="solid"
              nodeType={snapshot.canvas.nodes.find(n => n.id === t.id)?.type}
              showTooltip={targets.length === 1} />
          )
        })}
        {/* 框选拖拽中的实时命中高亮（outline，无 tooltip） */}
        {marqueeHits.map(id => (
          <HighlightEl key={`mq-${id}`} surface={surfaceRef.current}
            hit={{ nodeId: id, domPath: '', tag: 'div' }} borderStyle="outline"
            nodeType={undefined} showTooltip={false} />
        ))}
        {/* 框选矩形 */}
        {marquee !== null ? (
          <div style={{
            position: 'fixed',
            left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1),
            width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0),
            border: `1.5px dashed ${ACCENT}`, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)',
            pointerEvents: 'none', zIndex: 50,
          }} />
        ) : null}
        {/* 已存注释 badges（node 级定位） */}
        {[...annotationsByNode.entries()].map(([nodeId, list]) => (
          <NodeBadgeAnchor key={nodeId} surface={surfaceRef.current} nodeId={nodeId}>
            {list.map(({ ann, n }) => (
              <PinBadge key={ann.id} n={n} annotation={ann}
                onEdit={() => callbacks.onEditAnnotation(ann)}
                onDelete={() => callbacks.onDeleteAnnotation(ann)}
                onHover={callbacks.onFocusNode} />
            ))}
          </NodeBadgeAnchor>
        ))}
      </div>
    </>
  )
}

/**
 * 从 ancestor 到 el 的 CSS 路径（tag.firstClass > tag:nth-of-type(n) > ...）。
 * 真机教训（2026-09-06）：无 class 的元素（table 的 td、stat-card 的子 div）
 * 若不带序号，`nodeEl.querySelector(domPath)` 永远命中【第一个】匹配——
 * 高亮框永远钉在第一格/第一个子元素上，用户以为「只能选第一格」。
 * 加 :nth-of-type 保证回查唯一命中自己。
 */
function domPathWithin(ancestor: Element, el: Element): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur !== null && cur !== ancestor) {
    const tag = cur.tagName.toLowerCase()
    const cls = (cur.getAttribute('class') ?? '').trim().split(/\s+/)[0]
    let part = cls !== undefined && cls.length > 0 ? `${tag}.${CSS.escape(cls)}` : tag
    const parent: Element | null = cur.parentElement
    if (parent !== null) {
      const sameTag = [...parent.children].filter(c => c.tagName === (cur as Element).tagName)
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(cur) + 1})`
    }
    parts.unshift(part)
    cur = cur.parentElement
  }
  return parts.join(' > ')
}

/** badge 锚点：包一层 node 元素尺寸的 absolute 容器，角标钉在右上 */
function NodeBadgeAnchor({ surface, nodeId, children }: { surface: HTMLElement | null; nodeId: string; children: ReactNode }): ReactNode {
  if (surface === null) return null
  const el = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(nodeId)}"]`)
  if (el === null) return null
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  return (
    <div style={{ position: 'absolute', left: r.left - box.left, top: r.top - box.top, width: r.width, height: r.height, pointerEvents: 'none', zIndex: 35 }}>
      <div style={{ position: 'absolute', right: 0, top: 0, pointerEvents: 'auto' }}>{children}</div>
    </div>
  )
}

/** 元素级高亮框 + DevTools 式 tooltip（type tag · 宽×高；showTooltip=false 时只画框） */
function HighlightEl({ surface, hit, borderStyle, nodeType, showTooltip = true }: {
  surface: HTMLElement | null
  hit: ElementHit
  borderStyle: 'outline' | 'solid'
  nodeType: string | undefined
  showTooltip?: boolean
}): ReactNode {
  if (surface === null) return null
  const nodeEl = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(hit.nodeId)}"]`)
  if (nodeEl === null) return null
  let el: Element = nodeEl
  if (hit.domPath.length > 0) {
    try { el = nodeEl.querySelector(hit.domPath) ?? nodeEl } catch { el = nodeEl }
  }
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  if (r.width === 0 && r.height === 0) return null
  const tooltip = `${nodeType ?? ''} ${hit.tag} · ${Math.round(r.width)}×${Math.round(r.height)}`.trim()
  return (
    <>
      <div style={{
        position: 'absolute', left: r.left - box.left - 2, top: r.top - box.top - 2, width: r.width + 4, height: r.height + 4,
        border: borderStyle === 'outline' ? `1.5px solid ${ACCENT}` : `2px solid ${ACCENT}`, borderRadius: 5, pointerEvents: 'none', zIndex: 30,
        background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)',
        boxShadow: borderStyle === 'solid' ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : 'none',
      }} />
      {showTooltip ? (
        <div style={{
          position: 'absolute', left: r.left - box.left - 2, top: Math.max(2, r.top - box.top - 22), zIndex: 31,
          fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', lineHeight: 1,
          padding: '3px 7px', borderRadius: 4, pointerEvents: 'none', whiteSpace: 'nowrap',
          color: '#fff', background: 'var(--dsw-alias-state-business-primary, #4176e6)',
          boxShadow: '0 2px 6px rgba(0,0,0,.2)',
        }}>
          {tooltip}
        </div>
      ) : null}
    </>
  )
}
