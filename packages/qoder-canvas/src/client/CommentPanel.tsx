/**
 * CommentPanel：工作台右侧常驻评论面板（design-comments 范式，QODER_CANVAS_SIDEBAR §3）。
 *
 * 与对话流版「画布浮动小框」的根本区别：评论 UI 是【常驻面板】——
 * 注释按元素分组列表 + 新建输入框（targets 已选时出现）+ 编辑/删除。
 * 空间从容，评论历史/输入/管理分层清晰。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { AnnotationTarget, CanvasAnnotation } from './canvas-annotations.ts'

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

export function CommentPanel({ targets, note, setNote, onRemoveTarget, onSave, onCancel, annotations, onEdit, onDelete, focusNodeId }: {
  targets: readonly AnnotationTarget[]
  note: string
  setNote: (v: string) => void
  onRemoveTarget: (i: number) => void
  onSave: () => void
  onCancel: () => void
  annotations: CanvasAnnotation[]
  onEdit: (a: CanvasAnnotation) => void
  onDelete: (a: CanvasAnnotation) => void
  focusNodeId: string | null
}): ReactNode {
  const listRef = useRef<HTMLDivElement | null>(null)
  // 定位到某元素注释（点选时评论面板滚动）
  useEffect(() => {
    if (focusNodeId === null || listRef.current === null) return
    const el = listRef.current.querySelector(`[data-ann-node="${CSS.escape(focusNodeId)}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [focusNodeId])

  // 按元素分组注释
  const byNode = new Map<string, CanvasAnnotation[]>()
  const textAnns: CanvasAnnotation[] = []
  for (const a of annotations) {
    const nodeTarget = a.targets.find(t => t.kind === 'node')
    if (nodeTarget !== undefined && nodeTarget.kind === 'node') {
      const arr = byNode.get(nodeTarget.id) ?? []
      arr.push(a)
      byNode.set(nodeTarget.id, arr)
    } else {
      textAnns.push(a)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, borderLeft: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 650 }}>评论</span>
        <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)' }}>{annotations.length}</span>
      </div>

      {/* 新建输入框（有 targets 时出现） */}
      {targets.length > 0 ? (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))', display: 'flex', flexDirection: 'column', gap: 7, background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 5%, transparent)' }}>
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
      ) : null}

      {/* 注释列表（按元素分组） */}
      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {annotations.length === 0 && targets.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', lineHeight: 1.7, padding: '12px 4px' }}>
            还没有评论<br />
            <span style={{ fontSize: 10 }}>在左侧画布上点选/框选元素或选中文本，即可添加评论</span>
          </div>
        ) : null}
        {[...byNode.entries()].map(([nodeId, anns]) => {
          const first = anns[0]?.targets.find(t => t.kind === 'node')
          const label = first !== undefined && first.kind === 'node' ? first.label : nodeId
          return (
            <div key={nodeId} data-ann-node={nodeId} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 10.5, fontWeight: 650, color: ACCENT, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, flexShrink: 0 }} />
                {nodeId} {label}
              </div>
              {anns.map(a => (
                <div key={a.id} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11.5, lineHeight: 1.55, padding: '6px 8px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)' }}>
                  <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{a.note}</span>
                  <button type="button" onClick={() => onEdit(a)} title="编辑" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 0, flexShrink: 0 }}>✎</button>
                  <button type="button" onClick={() => onDelete(a)} title="删除" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 0, flexShrink: 0 }}>🗑</button>
                </div>
              ))}
            </div>
          )
        })}
        {textAnns.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 10.5, fontWeight: 650, color: 'var(--dsw-alias-label-secondary, inherit)' }}>文本注释</div>
            {textAnns.map(a => {
              const excerpt = a.targets.find(t => t.kind === 'text')
              return (
                <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, padding: '6px 8px', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)' }}>
                  {excerpt !== undefined && excerpt.kind === 'text' ? (
                    <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)', fontStyle: 'italic', borderLeft: `2px solid ${ACCENT}`, paddingLeft: 6 }}>"{excerpt.excerpt}"</span>
                  ) : null}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                    <span style={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{a.note}</span>
                    <button type="button" onClick={() => onEdit(a)} title="编辑" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 0, flexShrink: 0 }}>✎</button>
                    <button type="button" onClick={() => onDelete(a)} title="删除" style={{ border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', padding: 0, flexShrink: 0 }}>🗑</button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}
