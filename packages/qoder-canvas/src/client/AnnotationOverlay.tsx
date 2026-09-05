/**
 * AnnotationOverlay：画布标注层（M2，设计文档 §3.3）。
 *
 * 交互：标注模式开关（卡片头按钮）→ 元素 hover 高亮 + 点选 / 矩形拖圈
 * （node rect 与选框相交判定）→ 评注输入弹层（快捷短语）→ 编排注入 composer。
 *
 * 实现要点：
 * - 每个 node 渲染时自带 data-canvas-node="<id>"（CanvasSurface 已加），
 *   overlay 用它做命中判定，无需独立坐标系
 * - 矩形圈选：overlay 蒙层上拖拽画框，松手时取所有与框相交的 node rect
 * - 编排：node id → title 翻译（meta 内嵌快照在手），紧凑草稿格式见 §3.3
 */
import { useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { injectComposerDraft, reportAnnotation } from './composer-bridge.ts'
import type { CanvasSnapshot } from '../dsl.ts'

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'
const QUICK_PHRASES = ['太小了', '信息过时', '这里错了', '删掉这块'] as const

/** node id → 人类可读描述（类型 + 标题/首行文本） */
export function nodeLabelOf(node: { id: string; type: string; props: Readonly<Record<string, unknown>> }): string {
  const p = node.props
  const title = typeof p.title === 'string' && p.title.length > 0 ? p.title
    : typeof p.label === 'string' && p.label.length > 0 ? p.label
    : typeof p.text === 'string' && p.text.length > 0 ? (p.text.length > 24 ? `${p.text.slice(0, 24)}…` : p.text)
    : node.type
  return title
}

interface AnnotationDraft {
  readonly targets: readonly { id: string; label: string }[]
  readonly note: string
}

/** 编排为紧凑草稿文本（§3.3 格式） */
export function formatAnnotationDraft(snapshot: CanvasSnapshot, draft: AnnotationDraft): string {
  const targetText = draft.targets.map(t => `${t.id} ${t.label}`).join(', ')
  return `[画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId}@r${snapshot.revision} · 选中 ${draft.targets.length} 个节点: ${targetText}]\n${draft.note}`
}

export function AnnotationOverlay({ snapshot, containerRef }: { snapshot: CanvasSnapshot; containerRef: { current: HTMLDivElement | null } }): ReactNode {
  const [active, setActive] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [note, setNote] = useState('')
  const [dragRect, setDragRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dragStart = useRef<{ x: number; y: number } | null>(null)
  const surfaceRef = containerRef

  const nodeById = new Map(snapshot.canvas.nodes.map(n => [n.id, n]))

  const showToast = (msg: string): void => {
    setToast(msg)
    setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2000)
  }

  /** 矩形圈选：与选框相交的 node 全选 */
  const finishDrag = (rect: { x: number; y: number; w: number; h: number }): void => {
    const surface = surfaceRef.current
    if (surface === null || (Math.abs(rect.w) < 8 && Math.abs(rect.h) < 8)) return
    const hits: string[] = []
    for (const el of surface.querySelectorAll<HTMLElement>('[data-canvas-node]')) {
      const r = el.getBoundingClientRect()
      const box = surface.getBoundingClientRect()
      // 转成 surface 内相对坐标
      const nx = r.left - box.left, ny = r.top - box.top
      const intersect = nx < rect.x + rect.w && nx + r.width > rect.x && ny < rect.y + rect.h && ny + r.height > rect.y
      if (intersect) hits.push(el.getAttribute('data-canvas-node') ?? '')
    }
    setSelected(prev => [...new Set([...prev, ...hits.filter(Boolean)])])
  }

  const submit = (): void => {
    if (selected.length === 0 || note.trim().length === 0) return
    const targets = selected
      .map(id => nodeById.get(id))
      .filter((n): n is NonNullable<typeof n> => n !== undefined)
      .map(n => ({ id: n.id, label: nodeLabelOf(n) }))
    const text = formatAnnotationDraft(snapshot, { targets, note: note.trim() })
    const ok = injectComposerDraft(text)
    if (ok) {
      showToast(`已注入输入框草稿（${targets.length} 个节点）——可编辑后发送`)
      setActive(false)
      setSelected([])
      setNote('')
    } else {
      showToast('注入失败——复制到剪贴板')
      try { void navigator.clipboard?.writeText(text) } catch { /* 剪贴板不可用 */ }
    }
    // 审计上报（尽力而为，不依赖结果）
    reportAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets: selected, note: note.trim() })
  }

  // ── 非激活态：开关按钮浮在卡片头部右侧（与控制条同位，0.2.1 位置修复） ──
  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        title="标注画布：圈选元素写评注，注入输入框草稿"
        style={{
          position: 'absolute', top: 6, right: 8, zIndex: 40,
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 10.5, padding: '2px 9px', borderRadius: 6, cursor: 'pointer',
          color: 'var(--dsw-alias-label-secondary, inherit)',
          background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))',
          border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
          fontFamily: 'inherit', whiteSpace: 'nowrap',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        标注
      </button>
    )
  }

  // ── 激活态：蒙层 + 圈选 + 评注面板 ──
  // 事件模型 v2（0.2.1 用户真机反馈修复）：蒙层 pointer-events:auto——
  // ① cursor:crosshair 才生效（none 时鼠标命中下层普通元素，视觉无反馈）
  // ② 点选改用 document.elementsFromPoint 穿透命中（蒙层在最上，但
  //    elementsFromPoint 返回堆叠列表，可找到下方的 data-canvas-node）
  // ③ userSelect:none 防拖拽圈选时选中页面文本
  const overlayStyle: CSSProperties = {
    position: 'absolute', inset: 0, zIndex: 30,
    background: 'rgba(0,0,0,.04)',
    cursor: 'crosshair',
    pointerEvents: 'auto',
    userSelect: 'none',
  }

  return (
    <>
      {/* 蒙层：auto 事件（圈选拖拽 + 穿透点选），纯视觉装饰 */}
      <div
        style={overlayStyle}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          const box = surfaceRef.current?.getBoundingClientRect()
          if (box === undefined) return
          dragStart.current = { x: e.clientX - box.left, y: e.clientY - box.top }
          setDragRect({ x: e.clientX - box.left, y: e.clientY - box.top, w: 0, h: 0 })
        }}
        onPointerMove={(e) => {
          const start = dragStart.current
          const box = surfaceRef.current?.getBoundingClientRect()
          if (start === null || box === undefined) return
          setDragRect({ x: start.x, y: start.y, w: e.clientX - box.left - start.x, h: e.clientY - box.top - start.y })
        }}
        onPointerUp={() => {
          if (dragRect !== null) finishDrag(normalizeRect(dragRect))
          dragStart.current = null
          setDragRect(null)
        }}
        onClick={(e) => {
          // 点选：纯几何命中（0.2.1 修复——elementsFromPoint 合成/覆盖层
          // 场景不可靠）。遍历节点 rect，找包含点击坐标的节点；
          // 多选取面积最小者（嵌套/容器节点时命中最内层）。
          let best: { id: string; area: number } | null = null
          for (const el of surfaceRef.current?.querySelectorAll<HTMLElement>('[data-canvas-node]') ?? []) {
            const r = el.getBoundingClientRect()
            const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
            if (!inside) continue
            const area = r.width * r.height
            if (best === null || area < best.area) {
              const id = el.getAttribute('data-canvas-node')
              if (id !== null && id.length > 0) best = { id, area }
            }
          }
          if (best !== null) {
            const id = best.id
            setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
          }
        }}
      >
        {/* 拖拽框 */}
        {dragRect !== null ? <div style={{ ...normalizeRect(dragRect), position: 'absolute', border: `1.5px dashed ${ACCENT}`, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)', borderRadius: 4, pointerEvents: 'none' }} /> : null}
        {/* 已选节点高亮框 */}
        {selected.map(id => {
          const el = surfaceRef.current?.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(id)}"]`)
          if (el === null || el === undefined) return null
          const box = surfaceRef.current?.getBoundingClientRect()
          if (box === undefined) return null
          const r = el.getBoundingClientRect()
          return <div key={id} style={{ position: 'absolute', left: r.left - box.left - 3, top: r.top - box.top - 3, width: r.width + 6, height: r.height + 6, border: `2px solid ${ACCENT}`, borderRadius: 8, pointerEvents: 'none', boxShadow: '0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)' }} />
        })}
      </div>
      {/* 评注控制条（覆盖在头部位置；蒙层之后 z40 保持可点） */}
      <div style={{
        position: 'absolute', top: 6, right: 8, zIndex: 40,
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 8px', borderRadius: 8,
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        border: `1px solid ${ACCENT}`,
        boxShadow: '0 4px 16px rgba(0,0,0,.14)',
      }}>
        <span style={{ fontSize: 10, color: ACCENT, fontWeight: 600 }}>标注模式</span>
        <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>
          {selected.length > 0 ? `已选 ${selected.length} 个` : '点选或框选节点'}
        </span>
        <button type="button" onClick={() => { setActive(false); setSelected([]) }}
          style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: 0, cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', fontFamily: 'inherit' }}>
          取消
        </button>
      </div>

      {/* 蒙层：纯视觉（pointer-events:none，事件由外层容器捕获） */}
      <div style={overlayStyle}>
        {/* 拖拽框 */}
        {dragRect !== null ? <div style={{ ...normalizeRect(dragRect), position: 'absolute', border: `1.5px dashed ${ACCENT}`, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)', borderRadius: 4, pointerEvents: 'none' }} /> : null}
        {/* 已选节点高亮框 */}
        {selected.map(id => {
          const el = surfaceRef.current?.querySelector<HTMLElement>(`[data-canvas-node="${CSS.escape(id)}"]`)
          if (el === null || el === undefined) return null
          const box = surfaceRef.current?.getBoundingClientRect()
          if (box === undefined) return null
          const r = el.getBoundingClientRect()
          return <div key={id} style={{ position: 'absolute', left: r.left - box.left - 3, top: r.top - box.top - 3, width: r.width + 6, height: r.height + 6, border: `2px solid ${ACCENT}`, borderRadius: 8, pointerEvents: 'none', boxShadow: '0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 18%, transparent)' }} />
        })}
      </div>

      {/* 评注输入弹层（选中即出现） */}
      {selected.length > 0 ? (
        <div style={{
          position: 'absolute', bottom: 10, left: 10, right: 10, zIndex: 50,
          display: 'flex', flexDirection: 'column', gap: 7,
          padding: '10px 12px', borderRadius: 10,
          background: 'var(--dsw-alias-bg-layer-1, #fff)',
          border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
          boxShadow: '0 8px 28px rgba(0,0,0,.18)',
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {selected.map(id => {
              const n = nodeById.get(id)
              return n === undefined ? null : (
                <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '1.5px 7px', borderRadius: 5, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)', color: ACCENT }}>
                  {nodeLabelOf(n)}
                  <button type="button" onClick={() => setSelected(prev => prev.filter(x => x !== id))} style={{ border: 0, background: 'none', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: 11, lineHeight: 1 }}>×</button>
                </span>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {QUICK_PHRASES.map(phrase => (
              <button key={phrase} type="button" onClick={() => setNote(cur => cur.length > 0 ? `${cur}；${phrase}` : phrase)}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', background: 'none', cursor: 'pointer', color: 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>
                {phrase}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="写下修改建议…（将注入输入框为草稿，可编辑后发送）"
            rows={2}
            style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setSelected([])} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>清除选择</button>
            <button type="button" onClick={submit} disabled={note.trim().length === 0}
              style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: note.trim().length > 0 ? 'pointer' : 'not-allowed', fontFamily: 'inherit', color: '#fff', background: note.trim().length > 0 ? ACCENT : 'var(--dsw-alias-interactive-bg-active, rgba(127,127,127,.2))' }}>
              注入草稿
            </button>
          </div>
        </div>
      ) : null}

      {/* toast */}
      {toast !== null ? (
        <div style={{ position: 'absolute', top: 44, left: '50%', transform: 'translateX(-50%)', zIndex: 60, fontSize: 10.5, padding: '5px 12px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 4px 14px rgba(0,0,0,.14)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      ) : null}
    </>
  )
}

function normalizeRect(r: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  return { x: Math.min(r.x, r.x + r.w), y: Math.min(r.y, r.y + r.h), w: Math.abs(r.w), h: Math.abs(r.h) }
}
