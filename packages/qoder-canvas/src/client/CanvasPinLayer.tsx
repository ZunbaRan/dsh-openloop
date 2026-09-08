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
  /** 0.12：html 节点 open shadow DOM 内的命中（同文档——el 是 shadow 内元素；
      targets 回显时 el 可缺省（HighlightEl 内部回查） */
  readonly shadowHit?: {
    readonly el?: Element | undefined
    readonly domPath: string
    readonly snippet: string
    /** 0.12.6 兄弟索引路径（[顶层 childIndex, …, 命中 childIndex]）——
        CSS 选择器在 baoyu/Tailwind class（含 : 特殊字符）下回查不稳，
        索引 walk 纯数字绝对稳定 */
    readonly indexPath?: readonly number[] | undefined
  } | undefined
}

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

/** AnnotationTarget → ElementHit（text 类无定位返回 null） */
function targetToHit(t: AnnotationTarget): ElementHit | null {
  if (t.kind === 'node') return { nodeId: t.id, domPath: '', tag: 'div' }
  if (t.kind === 'element') return { nodeId: t.id, domPath: t.domPath, tag: t.tag, text: t.text }
  return null
}

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
  const anchorId = firstTarget !== undefined && (firstTarget.kind === 'node' || firstTarget.kind === 'element' || firstTarget.kind === 'html-element') ? firstTarget.id : null
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
  /** 框选拖拽中实时命中的元素（Figma 式即时反馈，元素级） */
  const [marqueeHits, setMarqueeHits] = useState<ElementHit[]>([])
  const marqueeActive = useRef(false)
  const marqueeStart = useRef<{ x: number; y: number } | null>(null)
  /** 框选实时命中节流：同帧合并一次计算 + 矩形未变跳过重算 */
  const marqueeRaf = useRef(0)
  const lastMarqueeRect = useRef<{ left: number; top: number; right: number; bottom: number } | null>(null)
  /** iframe hover 预取竞态序号（旧异步响应丢弃） */
  const hoverIframeSeq = useRef(0)
  /** iframe hover 探针查询去抖定时器（鼠标稳定 60ms 才发） */
  const hoverIframeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 最新 targets（异步 iframe 框选合并时读取——避免闭包旧值） */
  const targetsRef = useRef<readonly AnnotationTarget[]>([])
  targetsRef.current = targets
  // 0.9.4 真机根因修复：不使用渲染期同步的 surfaceRef——PinLayer 与 area div 同
  // commit 挂载时渲染体读 canvasAreaRef.current 必为 null（ref 赋值在 commit 阶段，
  // 渲染体在 commit 前跑），无 state 变化则无重渲染，surfaceRef 永远 null，hitElement
  // 永远 return null（单 html 节点画布必现「点不中/框选无反馈」；多节点画布碰巧
  // 因 annotations 加载重渲染而掩盖）。使用处一律直接读 containerRef.current。

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
   * 元素级命中（S7 核心）：elementsFromPoint 最深层命中。
   */
  const hitElement = (x: number, y: number): ElementHit | null => {
    const surface = containerRef.current
    if (surface === null) return null
    // 0.12.2 shadow 自查优先（真机根因修正）：sandbox opaque origin 下
    // document.elementsFromPoint 不穿透 open shadow——hover html 节点时栈顶是
    // shadow host（外层），永远进不了 shadow 分支。改为先对每个 open shadow
    // 用 shadowRoot.elementFromPoint（shadow 内部自查，天然稳定不依赖穿透）。
    const shadowHosts = surface.querySelectorAll('[data-openloop-html-host]')
    for (const host of shadowHosts) {
      const sr = host.shadowRoot
      if (sr === null) continue
      const hostRect = host.getBoundingClientRect()
      if (x < hostRect.left || x > hostRect.right || y < hostRect.top || y > hostRect.bottom) continue
      const nodeId = host.getAttribute('data-canvas-node')
      if (nodeId === null || nodeId.length === 0) continue
      const inner = sr.elementFromPoint(x, y)
      if (inner === null) continue
      const deep = drillToDeepest(inner, x, y)
      const text = (deep.textContent ?? '').trim()
      let snippet = ''
      try { snippet = deep.outerHTML ?? '' } catch { snippet = '' }
      if (snippet.length > 600) snippet = snippet.slice(0, 600)
      return {
        nodeId,
        domPath: '',
        tag: deep.tagName.toLowerCase(),
        text: text.length > 0 ? text.slice(0, 40) : undefined,
        shadowHit: { el: deep, domPath: domPathWithinShadow(deep), indexPath: indexPathWithinShadow(deep), snippet },
      }
    }
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

  /**
   * 框选命中（S8.1 元素级深化，用户拍板）：
   * - node 与矩形相交面积占比 ≥ 0.5 → 选整个 node（node 级）
   *   （旧逻辑要求完全包含——大卡片框不住，用户「框了都没选到」）
   * - 占比不足 → 深入 node 内部，收集与矩形相交的【叶子元素】（element 级）
   *   （如只框住 table 第一列 → 选中该列的若干 td，而不是整个 table）
   */
  const hitMarquee = (rect: { left: number; top: number; right: number; bottom: number }): AnnotationTarget[] => {
    const surface = containerRef.current
    if (surface === null) return []
    const intersects = (r: DOMRect): boolean =>
      !(r.right < rect.left || r.left > rect.right || r.bottom < rect.top || r.top > rect.bottom)
    const intersectArea = (r: DOMRect): number => {
      const w = Math.min(r.right, rect.right) - Math.max(r.left, rect.left)
      const h = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top)
      return w > 0 && h > 0 ? w * h : 0
    }
    const out: AnnotationTarget[] = []
    for (const nodeEl of surface.querySelectorAll('[data-canvas-node]')) {
      const nodeId = nodeEl.getAttribute('data-canvas-node')
      if (nodeId === null || nodeId.length === 0) continue
      const nr = nodeEl.getBoundingClientRect()
      if (!intersects(nr)) continue
      const node = snapshot.canvas.nodes.find(n => n.id === nodeId)
      const type = node?.type ?? nodeId
      const label = node !== undefined ? String(node.props.label ?? node.props.title ?? nodeId) : nodeId
      const ratio = nr.width * nr.height > 0 ? intersectArea(nr) / (nr.width * nr.height) : 0
      if (ratio >= 0.5) {
        out.push({ kind: 'node', id: nodeId, label })
        continue
      }
      // 元素级：收集相交的叶子元素（无 element 子节点——td/span/叶子 div/svg path 等）
      // 真机修复（2026-09-07）：跳过 IFRAME——父层 DOM 里 iframe 无子元素会被
      // 当叶子误收为 element target（框选 html 区域时把整块 iframe 当叶子选中，
      // 而不是深入 iframe 内元素）；iframe 区域的命中一律交给 probeMarquee 探针路径
      const walk = (el: Element): void => {
        for (const child of el.children) {
          if (child.tagName === 'IFRAME') continue
          if (child.children.length === 0) {
            const cr = child.getBoundingClientRect()
            if (cr.width > 0 && cr.height > 0 && intersects(cr)) {
              const domPath = domPathWithin(nodeEl, child)
              const text = (child.textContent ?? '').trim()
              const tag = child.tagName.toLowerCase()
              out.push({
                kind: 'element',
                id: nodeId,
                label: `${type} ${tag}${text.length > 0 ? ` "${text.slice(0, 20)}"` : ''}`,
                tag,
                domPath,
                text: text.length > 0 ? text.slice(0, 40) : undefined,
              })
            }
          } else {
            walk(child)
          }
        }
      }
      walk(nodeEl)
    }
    return out
  }

  // 文本划选：Range 索引（与 S4 相同）
  const buildRangeIndex = (range: Range): { nodeId: string; text: string }[] => {
    const surface = containerRef.current
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
    const surface = containerRef.current
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
        // 实时反馈：矩形命中元素即时亮框（rAF 节流——真机教训 2026-09-07：
        // 每帧全量 querySelectorAll + 全叶子遍历 + getBoundingClientRect 是框选卡顿
        // 根因；同帧合并为一次计算，且矩形未变时跳过重算）
        const start = marqueeStart.current
        if (start !== null && marqueeRaf.current === 0) {
          const ex = e.clientX, ey = e.clientY
          marqueeRaf.current = requestAnimationFrame(() => {
            marqueeRaf.current = 0
            const rect = {
              left: Math.min(start.x, ex), right: Math.max(start.x, ex),
              top: Math.min(start.y, ey), bottom: Math.max(start.y, ey),
            }
            const last = lastMarqueeRect.current
            if (last !== null && Math.abs(last.left - rect.left) < 2 && Math.abs(last.right - rect.right) < 2 && Math.abs(last.top - rect.top) < 2 && Math.abs(last.bottom - rect.bottom) < 2) return
            lastMarqueeRect.current = rect
            setMarqueeHits(hitMarquee(rect).map(targetToHit).filter((h): h is ElementHit => h !== null))
          })
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
          if (hit.shadowHit !== undefined) {
            // 0.12：html 节点 shadow 内命中 → html-element target（snippet 定位）
            callbacks.onTargetsChange([{
              kind: 'html-element',
              id: hit.nodeId,
              label: `html ${hit.tag}${hit.text !== undefined ? ` "${hit.text.slice(0, 20)}"` : ''}`,
              tag: hit.tag,
              domPath: hit.shadowHit.domPath,
              indexPath: hit.shadowHit.indexPath,
              text: hit.text,
              snippet: hit.shadowHit.snippet,
              el: hit.shadowHit.el, // 0.12.7：元素引用直接带上——确认后高亮直接用，不回查
            }])
          } else if (hit.domPath.length === 0) {
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
        if (marqueeRaf.current !== 0) { cancelAnimationFrame(marqueeRaf.current); marqueeRaf.current = 0 }
        lastMarqueeRect.current = null
        setMarqueeHits([])
        setMarquee(prev => {
          if (prev !== null) {
            const rect = {
              left: Math.min(prev.x0, prev.x1), right: Math.max(prev.x0, prev.x1),
              top: Math.min(prev.y0, prev.y1), bottom: Math.max(prev.y0, prev.y1),
            }
            if (rect.right - rect.left > 6 && rect.bottom - rect.top > 6) {
              callbacks.onTargetsChange(hitMarquee(rect))
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
      if (e.key === 'Escape') {
        setLocked(null); setMarquee(null); setMarqueeHits([])
        if (marqueeRaf.current !== 0) { cancelAnimationFrame(marqueeRaf.current); marqueeRaf.current = 0 }
        lastMarqueeRect.current = null
        callbacks.onTargetsChange([])
      }
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
          <HighlightEl surface={containerRef.current} hit={hovered} borderStyle="outline" nodeType={snapshot.canvas.nodes.find(n => n.id === hovered.nodeId)?.type} />
        ) : null}
        {/* 选中高亮（S8：targets 驱动——点选 1 个带 tooltip；框选 N 个全部亮框不带 tooltip。
            0.12：html-element target 回显 host 整块（精确 rect 在 hover/锁定态） */}
        {targets.map(t => {
          if (t.kind === 'node' || t.kind === 'element') {
            const hit: ElementHit = t.kind === 'element'
              ? { nodeId: t.id, domPath: t.domPath, tag: t.tag, text: t.text }
              : { nodeId: t.id, domPath: '', tag: 'div' }
            return (
              <HighlightEl key={`sel-${t.id}-${t.kind === 'element' ? t.domPath : 'root'}`}
                surface={containerRef.current} hit={hit} borderStyle="solid"
                nodeType={snapshot.canvas.nodes.find(n => n.id === t.id)?.type}
                showTooltip={targets.length === 1} />
            )
          }
          if (t.kind === 'html-element') {
            // 0.12.7（用户点破）：优先用命中时存的元素引用直接画（不回查）；
            // el 失效（DOM 重建 isConnected=false）或缺失（持久化历史注释）才走 indexPath/domPath 回查
            const liveEl = t.el !== undefined && t.el.isConnected ? t.el : undefined
            return (
              <HighlightEl key={`sel-${t.id}-${t.domPath}`}
                surface={containerRef.current}
                hit={{ nodeId: t.id, domPath: '', tag: t.tag, shadowHit: { el: liveEl, domPath: t.domPath, indexPath: t.indexPath, snippet: t.snippet } }}
                borderStyle="solid" nodeType="html" showTooltip={targets.length === 1} />
            )
          }
          return null
        })}
        {/* 框选拖拽中的实时命中高亮（outline，无 tooltip；元素级 domPath 定位） */}
        {marqueeHits.map(h => (
          <HighlightEl key={`mq-${h.nodeId}-${h.domPath}`} surface={containerRef.current}
            hit={h} borderStyle="outline"
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
          <NodeBadgeAnchor key={nodeId} surface={containerRef.current} nodeId={nodeId}>
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

/**
 * 0.12.1 drill-down：从命中元素向下找最深的含坐标子元素（DevTools 检查器语义）。
 * 纯 rect 遍历（无额外 API 调用），shadow 内 DOM 有限，成本 O(深度×兄弟数)。
 */
function drillToDeepest(el: Element, x: number, y: number): Element {
  let cur = el
  for (let depth = 0; depth < 8 && cur.children.length > 0; depth += 1) {
    let next: Element | null = null
    for (let i = 0; i < cur.children.length; i += 1) {
      const c = cur.children[i]
      if (c === undefined) continue
      const r = c.getBoundingClientRect()
      if (r.width > 0 && r.height > 0 && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) { next = c; break }
    }
    if (next === null) break
    cur = next
  }
  return cur
}

/** 0.12：shadow 内 CSS 路径（从命中元素向上到 ShadowRoot 停——parentElement 在 shadow root 处为 null） */
function domPathWithinShadow(el: Element): string {
  const parts: string[] = []
  let cur: Element | null = el
  while (cur !== null) {
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

/** 0.12.6 兄弟索引路径（从 ShadowRoot 顶层到命中元素的 childIndex 序列）。
    与 CSS 选择器无关——baoyu/Tailwind class（含 : 等特殊字符）下回查 100% 稳定 */
function indexPathWithinShadow(el: Element): number[] {
  const idx: number[] = []
  let cur: Element | null = el
  while (cur !== null) {
    const parent: Element | null = cur.parentElement
    if (parent !== null) {
      idx.unshift([...parent.children].indexOf(cur))
    } else {
      // 顶层（parentNode 是 ShadowRoot）：childIndex 相对 shadowRoot.children
      const root = cur.getRootNode()
      if (root instanceof ShadowRoot) idx.unshift([...root.children].indexOf(cur))
    }
    cur = cur.parentElement
  }
  return idx
}

/** badge 锚点：包一层 node 元素尺寸的 absolute 容器，角标钉在右上 */
function NodeBadgeAnchor({ surface, nodeId, children }: { surface: HTMLElement | null; nodeId: string; children: ReactNode }): ReactNode {
  if (surface === null) return null
  const el = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(nodeId)}"]`)
  if (el === null) return null
  const box = surface.getBoundingClientRect()
  const r = el.getBoundingClientRect()
  // 0.12.2 滚动补偿（用户实测「滚动后高亮错位」）：absolute 定位的参照是
  // pin-layer 的内容坐标系——视口坐标差之外必须加容器 scroll 偏移
  return (
    <div style={{ position: 'absolute', left: r.left - box.left + surface.scrollLeft, top: r.top - box.top + surface.scrollTop, width: r.width, height: r.height, pointerEvents: 'none', zIndex: 35 }}>
      <div style={{ position: 'absolute', right: 0, top: 0, pointerEvents: 'auto' }}>{children}</div>
    </div>
  )
}

/** 元素级高亮框 + DevTools 式 tooltip（showTooltip=false 时只画框） */
function HighlightEl({ surface, hit, borderStyle, nodeType, showTooltip = true }: {
  surface: HTMLElement | null
  hit: ElementHit
  borderStyle: 'outline' | 'solid'
  nodeType: string | undefined
  showTooltip?: boolean
}): ReactNode {
  if (surface === null) return null
  const box = surface.getBoundingClientRect()
  const nodeEl = surface.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(hit.nodeId)}"]`)
  if (nodeEl === null) return null
  let el: Element = nodeEl
  if (hit.shadowHit !== undefined) {
    // 0.12 shadow 命中回查（优先级）：
    // 1) indexPath walk（0.12.6——纯数字索引，CSS 选择器在 Tailwind class 下不稳时仍 100% 稳定）
    // 2) domPath querySelector
    // 3) el 引用（hover 实时命中）
    // 4) nodeEl 兜底
    const sr = nodeEl.shadowRoot
    if (sr !== null) {
      const ip = hit.shadowHit.indexPath
      let found: Element | null = null
      if (ip !== undefined && ip.length > 0) {
        let cur: Element | null = null
        let container: Element | ShadowRoot = sr
        let ok = true
        for (const idx of ip) {
          const next: Element | null = container.children.item(idx)
          if (next === null) { ok = false; break }
          cur = next
          container = next
        }
        if (ok && cur !== null) found = cur
      }
      if (found !== null) {
        el = found
      } else {
        // 0.12.7：el 引用（选中态直接存的）优先于 domPath 查询
        const ref = hit.shadowHit.el
        if (ref !== undefined && ref.isConnected) {
          el = ref
        } else {
          try { el = sr.querySelector(hit.shadowHit.domPath) ?? nodeEl } catch { el = nodeEl }
        }
      }
    } else {
      el = hit.shadowHit.el ?? nodeEl
    }
  } else if (hit.domPath.length > 0) {
    try { el = nodeEl.querySelector(hit.domPath) ?? nodeEl } catch { el = nodeEl }
  }
  const er = el.getBoundingClientRect()
  const r: { left: number; top: number; width: number; height: number } = { left: er.left, top: er.top, width: er.width, height: er.height }
  if (r.width === 0 && r.height === 0) return null
  const tooltip = `${nodeType ?? ''} ${hit.tag} · ${Math.round(r.width)}×${Math.round(r.height)}`.trim()
  // 0.12.2 滚动补偿（用户实测「滚动后高亮错位」的根因）：
  // 高亮框 absolute 定位的参照是 pin-layer 的内容坐标系——视口坐标差之外
  // 必须加容器的 scrollLeft/scrollTop，否则滚动后高亮框画在旧位置
  const sx = surface.scrollLeft, sy = surface.scrollTop
  return (
    <>
      <div style={{
        position: 'absolute', left: r.left - box.left - 2 + sx, top: r.top - box.top - 2 + sy, width: r.width + 4, height: r.height + 4,
        border: borderStyle === 'outline' ? `1.5px solid ${ACCENT}` : `2px solid ${ACCENT}`, borderRadius: 5, pointerEvents: 'none', zIndex: 30,
        background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)',
        boxShadow: borderStyle === 'solid' ? `0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)` : 'none',
      }} />
      {showTooltip ? (
        <div style={{
          position: 'absolute', left: r.left - box.left - 2 + sx, top: Math.max(2, r.top - box.top - 22 + sy), zIndex: 31,
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
