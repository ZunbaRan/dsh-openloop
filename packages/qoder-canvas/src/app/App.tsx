/**
 * CanvasApp：canvas iframe 内的自包含画布应用（0.12）。
 *
 * 组合现有组件（CanvasSurface/CanvasPinLayer/CommentPanel——代码零改动复用，
 * 只是搬进 iframe 文档）+ 模式 toolbar + 主题/高度/桥接线。
 * 标注交互（点选/框选/划字/评注面板）全部在 iframe 内闭环——保存后经桥传出。
 *
 * 沙箱事实（设计约束）：sandbox allow-scripts（无 same-origin）的 opaque origin
 * 里 localStorage 不可用——注释持久化留宿主（保存传出、随 snapshot 附带回传）。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CanvasSurface } from '../client/CanvasSurface.tsx'
import { CanvasPinLayer, type PinMode } from '../client/CanvasPinLayer.tsx'
import { CommentPanel } from '../client/CommentPanel.tsx'
import type { CanvasSnapshot } from '../dsl.ts'
import type { AnnotationTarget, CanvasAnnotation } from '../client/canvas-annotations.ts'
import { CanvasAppClientBridge } from '../canvas-app-bridge.ts'
import { HtmlNode } from './HtmlNode.tsx'

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'
const MODES: readonly { key: PinMode; label: string; hint: string }[] = [
  { key: 'point', label: '点选', hint: 'hover 高亮元素，点击选中（元素级精度）' },
  { key: 'marquee', label: '框选', hint: '拖拽框选多个元素' },
  { key: 'text', label: '划字', hint: '划选文本作为引用' },
]

export interface AppSnapshotMessage {
  readonly snapshot: CanvasSnapshot
  readonly annotations?: readonly CanvasAnnotation[]
}

export function CanvasApp(): ReactNode {
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null)
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [targets, setTargets] = useState<AnnotationTarget[]>([])
  const [note, setNote] = useState('')
  const [mode, setMode] = useState<PinMode>('browse')
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null)
  const [editAnn, setEditAnn] = useState<CanvasAnnotation | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const canvasAreaRef = useRef<HTMLDivElement | null>(null)
  const bridgeRef = useRef<CanvasAppClientBridge | null>(null)

  // 0.12.8 版本隔离（用户拍板）：badge/评注列表只显示当前 revision 的注释
  const revAnnotations = snapshot === null ? [] : annotations.filter(a => a.revision === snapshot.revision)

  const showToast = (msg: string): void => {
    setToast(msg)
    setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2200)
  }

  // 桥接线（一次性）：init（主题 setProperty + ready）/ snapshot（渲染 + 注释回传）
  useEffect(() => {
    const bridge = new CanvasAppClientBridge({
      onInit: (theme) => {
        if (theme !== undefined) {
          for (const [k, v] of Object.entries(theme)) {
            document.documentElement.style.setProperty(k, v)
          }
        }
      },
      onOpenPanel: () => { setPanelOpen(true) },
      onSnapshot: (data, annotations) => {
        // 真机教训（0.12 T5）：data 已是 snapshot 本身（桥解包了消息信封）——
        // 旧代码 data.snapshot 双重解包 undefined，校验永假，UI 停「等待画布数据」
        const snap = data as { kind?: string } | null
        if (snap?.kind === 'qoder-canvas') {
          setSnapshot(snap as never)
          setAnnotations(Array.isArray(annotations) ? annotations as never : [])
          setTargets([])
        }
      },
    })
    bridgeRef.current = bridge
    return () => { bridge.dispose(); bridgeRef.current = null }
  }, [])

  // 高度上报（ResizeObserver 节流 200ms——宿主设 iframe 高度）
  useEffect(() => {
    let last = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const report = (): void => {
      const h = document.documentElement.scrollHeight
      if (h > 0 && Math.abs(h - last) > 2) {
        last = h
        bridgeRef.current?.send({ t: 'height', height: h })
      }
    }
    const ro = new ResizeObserver(() => {
      if (timer !== null) return
      timer = setTimeout(() => { timer = null; report() }, 200)
    })
    ro.observe(document.documentElement)
    report()
    return () => { ro.disconnect(); if (timer !== null) clearTimeout(timer) }
  }, [snapshot])

  // 保存评注 → 桥传出（宿主接胶囊链路 + localStorage 持久化）
  const saveAnnotation = (): void => {
    if (snapshot === null || note.trim().length === 0 || targets.length === 0) return
    bridgeRef.current?.send({
      t: 'annotation',
      payload: {
        canvasId: snapshot.canvasId,
        revision: snapshot.revision,
        targets,
        note: note.trim(),
      },
    })
    showToast('评论已保存——发送消息时随消息发出')
    setTargets([])
    setNote('')
    // 乐观本地追加（宿主持久化后下次 snapshot 会带回权威列表）
    setAnnotations(prev => [...prev, {
      id: `local_${Date.now()}`,
      canvasId: snapshot.canvasId,
      revision: snapshot.revision,
      targets,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    }])
  }

  useEffect(() => {
    if (targets.length > 0) setPanelOpen(true)
  }, [targets.length])

  const modeHint = useMemo(() => mode === 'browse' ? '普通鼠标，纯查看（不选中不标注）' : (MODES.find(m => m.key === mode)?.hint ?? ''), [mode])

  if (snapshot === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--dsw-alias-label-caption, #888)', fontSize: 12 }}>
        等待画布数据…
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--dsw-alias-bg-layer-1, #fff)' }}>
      {/* 模式 toolbar（iframe 内） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))', flexShrink: 0 }}>
        {MODES.map(m => (
          <button key={m.key} type="button" title={`${m.hint}${mode === m.key ? '（再点取消）' : ''}`}
            onClick={() => setMode(prev => prev === m.key ? 'browse' : m.key)}
            style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6, fontFamily: 'inherit', cursor: 'pointer',
              border: mode === m.key ? `1px solid ${ACCENT}` : '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))',
              background: mode === m.key ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)' : 'none',
              color: mode === m.key ? ACCENT : 'var(--dsw-alias-label-secondary, inherit)',
            }}>{m.label}</button>
        ))}
        <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--dsw-alias-label-caption, #999)' }}>{modeHint}</span>
        {targets.length > 0 ? (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: ACCENT, fontWeight: 600 }}>已选 {targets.length} 个目标 → 在评论面板写评注</span>
        ) : null}
      </div>

      {/* 画布区（标注主场） */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14, position: 'relative' }} ref={canvasAreaRef}>
        <CanvasSurface
          snapshot={snapshot}
          onAction={(node) => { bridgeRef.current?.send({ t: 'action', node: { id: node.id, type: node.type, props: node.props } }) }}
          renderHtml={(node) => <HtmlNode nodeId={node.id} props={node.props as Record<string, unknown>} />}
        />
        <CanvasPinLayer
          snapshot={snapshot}
          containerRef={canvasAreaRef}
          mode={mode}
          targets={targets}
          callbacks={{
            onTargetsChange: (t) => { setTargets([...t]); setNote('') },
            onSave: () => saveAnnotation(),
            // 0.12.8 版本隔离（用户拍板）：badge 只显示当前 revision 的注释——
            // v1 的选中标识和注释不再出现在 v2（存储不动，切回 v1 仍在）
            annotations: revAnnotations,
            onEditAnnotation: (a) => setEditAnn(a),
            onDeleteAnnotation: (a) => setAnnotations(prev => prev.filter(x => x.id !== a.id)),
            onFocusNode: (id) => setFocusNodeId(id),
          }}
        />

        {/* 悬浮评注面板（iframe 内——交互闭环） */}
        {panelOpen ? (
          <div
            data-annotation-float
            style={{
              position: 'absolute', right: 12, top: 12, zIndex: 45, width: 280, maxHeight: 'min(520px, calc(100% - 24px))',
              display: 'flex', flexDirection: 'column',
              borderRadius: 12, overflow: 'hidden',
              background: 'var(--dsw-alias-bg-layer-1, #fff)',
              border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))',
              boxShadow: '0 12px 36px rgba(0,0,0,.26)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))' }}>
              <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>评论</span>
              <button type="button" onClick={() => setPanelOpen(false)} title="关闭面板"
                style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1, color: 'var(--dsw-alias-label-caption, #888)', fontFamily: 'inherit' }}>×</button>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              <CommentPanel
                targets={targets}
                note={note}
                setNote={setNote}
                onRemoveTarget={(i) => setTargets(prev => prev.filter((_, j) => j !== i))}
                onSave={saveAnnotation}
                onCancel={() => { setTargets([]); setNote('') }}
                annotations={revAnnotations}
                onEdit={(a) => setEditAnn(a)}
                onDelete={(a) => setAnnotations(prev => prev.filter(x => x.id !== a.id))}
                focusNodeId={focusNodeId}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* 注释编辑弹层 */}
      {editAnn !== null ? (
        <div style={{ position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, width: 300, display: 'flex', flexDirection: 'column', gap: 7, padding: '10px 12px', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.22)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 600, color: ACCENT }}>编辑评论</div>
          <textarea value={editAnn.note} onChange={e => setEditAnn({ ...editAnn, note: e.target.value })} rows={3} autoFocus
            style={{ fontSize: 11.5, padding: '6px 8px', borderRadius: 7, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'var(--dsw-alias-bg-layer-2, #f6f6f7)', color: 'inherit', resize: 'vertical', fontFamily: 'inherit' }} />
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setEditAnn(null)} style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', background: 'none', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit' }}>取消</button>
            <button type="button" onClick={() => { setAnnotations(prev => prev.map(x => x.id === editAnn.id ? { ...x, note: editAnn.note.trim() } : x)); setEditAnn(null) }} disabled={editAnn.note.trim().length === 0}
              style={{ fontSize: 10.5, padding: '3px 12px', borderRadius: 6, border: 0, cursor: 'pointer', fontFamily: 'inherit', color: '#fff', background: ACCENT }}>保存</button>
          </div>
        </div>
      ) : null}

      {/* toast */}
      {toast !== null ? (
        <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, fontSize: 11, padding: '7px 14px', borderRadius: 9, color: 'var(--dsw-alias-label-primary, inherit)', background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.25)' }}>{toast}</div>
      ) : null}
    </div>
  )
}
