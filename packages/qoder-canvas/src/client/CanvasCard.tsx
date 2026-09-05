/**
 * CanvasCard：toolview 卡片（M1+M2）。
 * 读 block.meta（presentationMeta 内嵌的扁平快照）→ CanvasSurface 渲染 +
 * AnnotationOverlay（标注回流：圈选评注→composer 草稿注入）。
 */
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { useRef, useState, type ReactNode } from 'react'
import type { CanvasSnapshot } from '../dsl.ts'
import { CanvasSurface } from './CanvasSurface.tsx'
import { AnnotationOverlay } from './AnnotationOverlay.tsx'
import { formatAnnotationDraft } from './canvas-annotations.ts'
import { injectComposerDraft } from './composer-bridge.ts'

const captionStyle = { color: 'var(--dsw-alias-label-caption, #888)', fontSize: 12 } as const

/** 容错解析 presentationMeta 的快照（§5.3 惯例：无法解析返回 undefined 不抛错）。
 *  ⚠️ 0.1.1 真机修复：presentationMeta 返回的就是扁平 snapshot 本体（无 .snapshot
 *  包装层）——原实现多剥了一层导致永远解析失败、卡片渲染成 "metadata unavailable"。 */
export function canvasMetaFrom(value: unknown): CanvasSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const s = value as Record<string, unknown>
  if (s.kind !== 'qoder-canvas' || s.version !== 1) return undefined
  if (typeof s.canvasId !== 'string' || typeof s.revision !== 'number') return undefined
  const canvas = s.canvas
  if (typeof canvas !== 'object' || canvas === null) return undefined
  const c = canvas as Record<string, unknown>
  if (typeof c.title !== 'string' || !Array.isArray(c.nodes)) return undefined
  return value as CanvasSnapshot
}

export function CanvasCard({ block }: ToolCallViewProps) {
  if (!('kind' in block)) return <div style={captionStyle}>Canvas · rendering…</div>
  if (block.isError) return <div style={captionStyle}>Canvas · failed</div>
  const meta = canvasMetaFrom(block.meta)
  if (!meta) return <div style={captionStyle}>Canvas · metadata unavailable</div>
  return <CanvasCardInner snapshot={meta} />
}

/** 有状态内层（hooks 不能在早退之后——block 校验先走完） */
function CanvasCardInner({ snapshot }: { snapshot: CanvasSnapshot }): ReactNode {
  const surfaceRef = useRef<HTMLDivElement | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string): void => {
    setToast(msg)
    setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2400)
  }

  /** action 节点回传（AnnotationOverlay 之外的第三入口）：intent+context 编排注入 */
  const onAction = (node: { id: string; props: Readonly<Record<string, unknown>> }): void => {
    const intent = typeof node.props.intent === 'string' ? node.props.intent : ''
    const label = typeof node.props.label === 'string' ? node.props.label : 'action'
    const context = node.props.context
    const ctxText = typeof context === 'object' && context !== null
      ? Object.entries(context as Record<string, unknown>).map(([k, v]) => `${k}=${String(v)}`).slice(0, 6).join(', ')
      : ''
    const text = formatAnnotationDraft(snapshot, [
      { kind: 'node', id: node.id, label },
    ], `执行动作：${intent}${ctxText.length > 0 ? `（${ctxText}）` : ''}`)
    const ok = injectComposerDraft(text)
    showToast(ok ? `「${label}」已注入输入框草稿——可编辑后发送` : `「${label}」注入失败，已复制到剪贴板`)
    if (!ok) { try { void navigator.clipboard?.writeText(text) } catch { /* 不可用 */ } }
  }

  return (
    <div style={{ position: 'relative' }} ref={surfaceRef}>
      {/* ⇱ 工作台打开（canvas dock 展开并定位该画布；传快照供工作台即时渲染） */}
      <button type="button" onClick={() => window.__openloopCanvasOpen?.(snapshot.canvasId, snapshot)} title="在画布工作台打开（右侧推出栏：标注/迭代）"
        style={{ position: 'absolute', top: 6, right: 8, zIndex: 20, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, padding: '2px 9px', borderRadius: 6, cursor: 'pointer', color: 'var(--dsw-alias-state-business-primary, #4176e6)', background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 28%, transparent)', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
        ⇱ 工作台
      </button>
      <CanvasSurface snapshot={snapshot} onAction={onAction} />
      <AnnotationOverlay snapshot={snapshot} containerRef={surfaceRef} />
      {toast !== null ? (
        <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 70, fontSize: 10.5, padding: '5px 12px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 4px 14px rgba(0,0,0,.14)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      ) : null}
    </div>
  )
}

