/**
 * annotation-capsule：画布注释的 composer 胶囊（S7 新增，2026-09-06 用户拍板）。
 *
 * 核心语义（对齐 workbuddy/Qoder Canvas 的「引用胶囊」）：
 * - 保存注释【不再】把文本铺进输入框——而是以「胶囊」挂在 composer 上方
 * - hover 胶囊 → 悬浮详情卡（每条注释的 target 摘要 + 评注 + 编辑/删除）
 * - 用户正常输入自己的问题，按 Enter（或点发送按钮）时，
 *   胶囊里的全部注释被格式化为结构化草稿注入 composer 随消息一起发出
 * - 发送后胶囊清空
 *
 * 技术要点：
 * - 胶囊条用 fixed 定位贴 composer 外框上方（不侵入 Lexical 内部结构）
 * - 发送拦截 = document 级 capture（keydown Enter / 发送按钮 click），
 *   在 DSH 处理之前把草稿注入（execCommand 同步生效，发送时完整携带）
 */
import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { CanvasAnnotation } from './canvas-annotations.ts'
import { formatAnnotationDraft } from './canvas-annotations.ts'
import { injectComposerDraft } from './composer-bridge.ts'
import type { CanvasSnapshot } from '../dsl.ts'

// ---------------------------------------------------------------------------
// 模块级 store：待发送的注释草稿 + 最新快照 registry（flush 时格式化用）
// ---------------------------------------------------------------------------

const drafts: CanvasAnnotation[] = []
const latestSnapshots = new Map<string, CanvasSnapshot>()
const listeners = new Set<() => void>()

function emit(): void {
  for (const l of listeners) l()
}

export function pushCapsuleDraft(ann: CanvasAnnotation): void {
  drafts.push(ann)
  emit()
}

export function registerCanvasSnapshot(snap: CanvasSnapshot): void {
  latestSnapshots.set(snap.canvasId, snap)
}

function flushDraftsIntoComposer(): void {
  if (drafts.length === 0) return
  const parts: string[] = []
  for (const ann of drafts) {
    const snap = latestSnapshots.get(ann.canvasId)
    if (snap !== undefined) {
      parts.push(formatAnnotationDraft({ canvasId: ann.canvasId, revision: ann.revision, canvas: snap.canvas }, ann.targets, ann.note))
    } else {
      parts.push(`画布标注 · ${ann.canvasId}@r${ann.revision}\n${ann.note}`)
    }
  }
  injectComposerDraft(parts.join('\n\n'))
  drafts.length = 0
  emit()
}

// ---------------------------------------------------------------------------
// composer 定位 + 发送拦截
// ---------------------------------------------------------------------------

function findComposerInput(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-composer-input="true"]')
    ?? document.querySelector<HTMLElement>('[contenteditable="true"]')
}

/** composer 外框（含输入区+工具行的容器）：从输入框向上找第一个带 button 的祖先 */
function findComposerFrame(input: HTMLElement): HTMLElement {
  let cur: HTMLElement | null = input
  for (let i = 0; i < 8 && cur !== null; i += 1) {
    if (cur.querySelector('button') !== null && cur.getBoundingClientRect().height > 60) return cur
    cur = cur.parentElement
  }
  return input.parentElement ?? input
}

/** 发送按钮探测：composer 外框内最后一个【无文本内容的圆形/图标按钮】 */
function findSendButton(frame: HTMLElement): HTMLButtonElement | null {
  const buttons = [...frame.querySelectorAll('button')]
  // 从后往前找：发送按钮一般在最右下，且无文字、内含 svg
  for (let i = buttons.length - 1; i >= 0; i -= 1) {
    const b = buttons[i]
    if (b === undefined) continue
    const text = (b.textContent ?? '').trim()
    if (text.length === 0 && b.querySelector('svg') !== null) return b
  }
  return null
}

// ---------------------------------------------------------------------------
// 胶囊条组件
// ---------------------------------------------------------------------------

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

export function AnnotationCapsuleBar(): ReactNode {
  const [, force] = useReducer((x: number) => x + 1, 0)
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNote, setEditingNote] = useState('')
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 订阅 store
  useEffect(() => {
    const l = (): void => force()
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])

  // 定位 composer 外框（scroll/resize/轮询兜底——消息流推高输入框时跟随）
  useEffect(() => {
    const update = (): void => {
      const input = findComposerInput()
      if (input === null) { setAnchor(null); return }
      const frame = findComposerFrame(input)
      const r = frame.getBoundingClientRect()
      if (r.width === 0) { setAnchor(null); return }
      setAnchor(prev => {
        const next = { left: r.left + 10, top: r.top - 36 }
        return prev !== null && Math.abs(prev.left - next.left) < 1 && Math.abs(prev.top - next.top) < 1 ? prev : next
      })
    }
    update()
    window.addEventListener('resize', update)
    document.addEventListener('scroll', update, true)
    const timer = setInterval(update, 800)
    return () => {
      window.removeEventListener('resize', update)
      document.removeEventListener('scroll', update, true)
      clearInterval(timer)
    }
  }, [])

  // 发送拦截：Enter（非 shift / 非输入法）+ 发送按钮 click，capture 阶段先注入
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent): void => {
      if (drafts.length === 0) return
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
      const input = findComposerInput()
      if (input === null || !input.contains(e.target as Node)) return
      flushDraftsIntoComposer()
      // 不阻止默认——事件继续传播，DSH 发送完整文档
    }
    const onClick = (e: MouseEvent): void => {
      if (drafts.length === 0) return
      const input = findComposerInput()
      if (input === null) return
      const frame = findComposerFrame(input)
      const sendBtn = findSendButton(frame)
      if (sendBtn !== null && (e.target as Node).nodeType === 1 && sendBtn.contains(e.target as Node)) {
        // 输入框非空才注入（空输入点发送无效，不浪费注释）
        if ((input.textContent ?? '').trim().length > 0) flushDraftsIntoComposer()
      }
    }
    document.addEventListener('keydown', onKeydown, true)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('keydown', onKeydown, true)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  if (drafts.length === 0 || anchor === null) return null

  const openDetail = (): void => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current)
    setDetailOpen(true)
  }
  const closeDetail = (): void => {
    if (hoverTimer.current !== null) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setDetailOpen(false), 180)
  }

  return createPortal(
    <>
      {/* 胶囊条：贴 composer 上方 */}
      <div
        data-openloop-annotation-capsule
        onPointerEnter={openDetail}
        onPointerLeave={closeDetail}
        style={{
          position: 'fixed', left: anchor.left, top: anchor.top, zIndex: 2147483050,
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11, padding: '3px 8px 3px 7px', borderRadius: 999,
          color: 'var(--dsw-alias-label-primary, inherit)',
          background: 'var(--dsw-alias-bg-layer-1, #fff)',
          border: `1px solid ${ACCENT}`,
          boxShadow: '0 2px 10px rgba(0,0,0,.14)', cursor: 'default', userSelect: 'none',
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ color: ACCENT, fontWeight: 600 }}>{drafts.length} 条画布注释</span>
          <button
            type="button"
            title="移除全部注释"
            onClick={() => { drafts.length = 0; emit() }}
            style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', color: 'var(--dsw-alias-label-caption, #888)', fontSize: 12, lineHeight: 1, fontFamily: 'inherit' }}
          >×</button>
        </span>
        <span style={{ fontSize: 10, color: 'var(--dsw-alias-label-caption, #999)' }}>发送消息时随消息发出</span>
      </div>

      {/* hover 详情卡（可移入编辑） */}
      {detailOpen ? (
        <div
          onPointerEnter={openDetail}
          onPointerLeave={closeDetail}
          style={{
            position: 'fixed', left: anchor.left, top: anchor.top - 8, transform: 'translateY(-100%)',
            zIndex: 2147483051, width: 320, maxHeight: 300, overflow: 'auto',
            borderRadius: 10, padding: '10px 12px',
            background: 'var(--dsw-alias-bg-layer-1, #fff)',
            border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
            boxShadow: '0 10px 32px rgba(0,0,0,.24)',
            display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11.5,
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 600, color: ACCENT }}>待发送的画布注释（{drafts.length}）</div>
          {drafts.map((ann, i) => {
            const t = ann.targets[0]
            const targetLabel = t === undefined ? '' : t.kind === 'text' ? `文本 "${t.excerpt.slice(0, 24)}"` : t.label
            return (
              <div key={ann.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '7px 9px', borderRadius: 8, background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.06))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {i + 1}。{targetLabel}
                  </span>
                  <button type="button" title="编辑评注"
                    onClick={() => { setEditingId(ann.id); setEditingNote(ann.note) }}
                    style={{ border: 0, background: 'none', padding: 2, cursor: 'pointer', color: 'var(--dsw-alias-label-caption, #888)', display: 'flex' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                  </button>
                  <button type="button" title="移除"
                    onClick={() => { const idx = drafts.findIndex(d => d.id === ann.id); if (idx >= 0) { drafts.splice(idx, 1); emit() } }}
                    style={{ border: 0, background: 'none', padding: 2, cursor: 'pointer', color: 'var(--dsw-alias-label-caption, #888)', fontSize: 13, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
                </div>
                {editingId === ann.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <textarea value={editingNote} onChange={e => setEditingNote(e.target.value)} rows={2} autoFocus
                      style={{ fontSize: 11, padding: '5px 7px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))', background: 'var(--dsw-alias-bg-layer-1, #fff)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setEditingId(null)}
                        style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>取消</button>
                      <button type="button" disabled={editingNote.trim().length === 0}
                        onClick={() => { const d = drafts.find(x => x.id === ann.id); if (d !== undefined) { (d as { note: string }).note = editingNote.trim() } setEditingId(null); emit() }}
                        style={{ fontSize: 10, padding: '2px 10px', borderRadius: 5, border: 0, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: ACCENT }}>保存</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--dsw-alias-label-secondary, inherit)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{ann.note}</div>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </>,
    document.body,
  )
}
