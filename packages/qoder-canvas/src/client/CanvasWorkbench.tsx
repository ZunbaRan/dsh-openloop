/**
 * CanvasWorkbench：canvas dock 的工作台（S3：元素 pin 标注 + 评论面板）。
 *
 * 布局：画布区（CanvasSurface + CanvasPinLayer，标注主场）| 评论面板（CommentPanel，常驻右栏）。
 * 标注范式 = design-comments 元素 pin（零蒙层，QODER_CANVAS_SIDEBAR §3）。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CanvasDockHost, CanvasToggle, CANVAS_DEFAULT_WIDTH, clampCanvasWidth } from './CanvasDockHost.tsx'
import { CanvasSurface } from './CanvasSurface.tsx'
import { CanvasPinLayer } from './CanvasPinLayer.tsx'
import { CommentPanel } from './CommentPanel.tsx'
import { injectComposerDraft, reportAnnotation } from './composer-bridge.ts'
import { addAnnotation, formatAnnotationDraft, listAnnotations, removeAnnotation, updateAnnotationNote, type AnnotationTarget, type CanvasAnnotation } from './canvas-annotations.ts'
import type { CanvasSnapshot } from '../dsl.ts'

const WIDTH_KEY = 'openloop.canvas.width.v1'
const OPEN_KEY = 'openloop.canvas.open.v1'

function readWidth(): number {
  try { const v = Number(localStorage.getItem(WIDTH_KEY)); return Number.isFinite(v) && v > 0 ? clampCanvasWidth(v) : CANVAS_DEFAULT_WIDTH } catch { return CANVAS_DEFAULT_WIDTH }
}
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}

declare global {
  interface Window { __openloopCanvasOpen?: (canvasId: string, snapshot?: CanvasSnapshot) => void }
}

export function CanvasWorkbench(): ReactNode {
  const [open, setOpen] = useState(readOpen)
  const [width, setWidth] = useState(readWidth)
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null)
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [targets, setTargets] = useState<AnnotationTarget[]>([])
  const [note, setNote] = useState('')
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [editAnn, setEditAnn] = useState<CanvasAnnotation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const canvasAreaRef = useRef<HTMLDivElement | null>(null)

  const persistOpen = (v: boolean): void => { setOpen(v); try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ } }
  const persistWidth = (w: number): void => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }
  const showToast = (msg: string): void => { setToast(msg); setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2200) }

  // 事件桥：对话流卡片打开（展开 + 定位 + 快照渲染保底 + 端点拉真身刷新 S4）
  useEffect(() => {
    window.__openloopCanvasOpen = (canvasId: string, snap?: CanvasSnapshot) => {
      if (snap !== undefined) setSnapshot(snap)
      setAnnotations(listAnnotations(canvasId))
      setTargets([])
      persistOpen(true)
      // S4：从端点拉最新真身（Agent 续编后工作台看到的是最新版，而非卡片快照定格）
      void refreshFromStorage(canvasId)
    }
    return () => { delete window.__openloopCanvasOpen }
  }, [])

  /** S4：GET 端点拉真身（端点不可用时静默保底快照；webServer 运行时注入，headless 跳过） */
  const refreshFromStorage = async (canvasId: string): Promise<void> => {
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}`)
      if (!res.ok) return
      const snap = await res.json() as CanvasSnapshot
      if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId) {
        setSnapshot(prev => prev === null || snap.revision > prev.revision ? snap : prev)
      }
    } catch { /* 端点不存在（headless）——保底快照即可 */ }
  }

  const saveAnnotation = (): void => {
    if (snapshot === null || note.trim().length === 0 || targets.length === 0) return
    const trimmed = note.trim()
    const text = formatAnnotationDraft(snapshot, targets, trimmed)
    const ok = injectComposerDraft(text)
    addAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets, note: trimmed })
    setAnnotations(listAnnotations(snapshot.canvasId))
    reportAnnotation({ canvasId: snapshot.canvasId, revision: snapshot.revision, targets: targets.map(t => t.kind === 'node' ? t.id : 'text'), note: trimmed })
    showToast(ok ? '评论已保存并注入输入框草稿' : '评论已保存；注入失败已复制到剪贴板')
    if (!ok) { try { void navigator.clipboard?.writeText(text) } catch { /* 不可用 */ } }
    setTargets([]); setNote('')
  }

  return (
    <>
      <CanvasToggle open={open} onToggle={() => persistOpen(!open)} />
      <CanvasDockHost open={open} width={width} onWidthChange={persistWidth}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }} data-openloop-canvas-workbench>
          <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }}>
            <span style={{ fontSize: 13, fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {snapshot !== null ? snapshot.canvas.title : '画布工作台'}
            </span>
            {snapshot !== null ? (
              <span style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--dsw-alias-label-caption, #888)' }}>{snapshot.canvasId}@r{snapshot.revision}</span>
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
            <div style={{ flex: 1, minHeight: 0, display: 'flex', minWidth: 0 }}>
              {/* 画布区（标注主场） */}
              <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto', padding: 14, position: 'relative' }} ref={canvasAreaRef}>
                <CanvasSurface snapshot={snapshot} />
                <CanvasPinLayer
                  snapshot={snapshot}
                  containerRef={canvasAreaRef}
                  callbacks={{
                    onTargetsChange: (t) => { setTargets(t); setNote('') },
                    onSave: () => saveAnnotation(),
                    annotations,
                    onEditAnnotation: (a) => setEditAnn(a),
                    onDeleteAnnotation: (a) => { removeAnnotation(snapshot.canvasId, a.id); setAnnotations(listAnnotations(snapshot.canvasId)) },
                    onFocusNode: (id) => setFocusNodeId(id),
                  }}
                />
              </div>
              {/* 评论面板（常驻右栏 260px） */}
              <div style={{ width: 260, flexShrink: 0, minHeight: 0 }}>
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
          )}
        </div>
      </CanvasDockHost>

      {/* 注释编辑弹层 */}
      {editAnn !== null ? (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, width: 300, display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.22)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--dsw-alias-state-business-primary, #4176e6)' }}>编辑评论</div>
          <textarea value={editAnn.note} onChange={e => setEditAnn({ ...editAnn, note: e.target.value })} rows={3} autoFocus
            style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditAnn(null)} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
            <button type="button" onClick={() => { if (snapshot !== null) { updateAnnotationNote(snapshot.canvasId, editAnn.id, editAnn.note.trim()); setAnnotations(listAnnotations(snapshot.canvasId)) } setEditAnn(null) }} disabled={editAnn.note.trim().length === 0}
              style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: 'var(--dsw-alias-state-business-primary, #4176e6)' }}>保存</button>
          </div>
        </div>
      ) : null}

      {/* toast（挂工作台外层 fixed） */}
      {toast !== null ? (
        <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, fontSize: 11, padding: '7px 14px', borderRadius: 9, color: 'var(--dsw-alias-label-primary, inherit)', background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.25)' }}>{toast}</div>
      ) : null}
    </>
  )
}
