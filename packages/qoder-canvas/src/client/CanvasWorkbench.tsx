/**
 * CanvasWorkbench：canvas dock 工作台（0.12 整体 iframe 化）。
 *
 * 架构（用户 2026-09-08 拍板「canvas 整体放 iframe 里运行」）：
 * - 画布区 = sandbox="allow-scripts" iframe（/qoder-canvas/app 壳端点）——
 *   DSL 渲染 + 标注交互（toolbar/评注面板）全部住在 iframe 内，交互零跨界
 * - 宿主保留：header（目录/版本菜单）、composer 胶囊链路、注释持久化
 * - 通信只有低频业务事件（canvas-app-bridge）：init 主题/snapshot 进；
 *   ready/height/annotation/action 出
 * - 降级：iframe 3s 未 ready（webServer 未注入的 headless/端点缺失）→
 *   直渲染 CanvasSurface（无标注，保底可看）
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { CanvasDockHost, CanvasToggle, CANVAS_DEFAULT_WIDTH, clampCanvasWidth } from './CanvasDockHost.tsx'
import { CanvasSurface } from './CanvasSurface.tsx'
import { AnnotationCapsuleBar, pushCapsuleDraft, registerCanvasSnapshot, setCurrentCanvasRef } from './annotation-capsule.tsx'
import { reportAnnotation, injectComposerDraft } from './composer-bridge.ts'
import { addAnnotation, listAnnotations, type CanvasAnnotation } from './canvas-annotations.ts'
import { CanvasAppHostBridge, type AppAnnotationPayload } from '../canvas-app-bridge.ts'
import type { CanvasSnapshot } from '../dsl.ts'

const WIDTH_KEY = 'openloop.canvas.width.v1'
const OPEN_KEY = 'openloop.canvas.open.v1'

function readWidth(): number {
  try { const v = Number(localStorage.getItem(WIDTH_KEY)); return Number.isFinite(v) && v > 0 ? clampCanvasWidth(v) : CANVAS_DEFAULT_WIDTH } catch { return CANVAS_DEFAULT_WIDTH }
}
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}

/** 工作区目录条目（GET /qoder-canvas/list） */
interface CanvasListItem { canvasId: string; title: string; revision: number; revisions: readonly number[]; updatedAt: string }

declare global {
  interface Window { __openloopCanvasOpen?: (canvasId: string, snapshot?: CanvasSnapshot) => void }
}

const ACCENT = 'var(--dsw-alias-state-business-primary, #4176e6)'

/** 采集宿主主题关键变量下传 iframe（可选增强——不传走 fallback 也能跑） */
const THEME_VARS: readonly string[] = [
  '--dsw-alias-bg-layer-1', '--dsw-alias-bg-layer-2',
  '--dsw-alias-border-l1', '--dsw-alias-border-l2',
  '--dsw-alias-label-primary', '--dsw-alias-label-secondary', '--dsw-alias-label-caption',
  '--dsw-alias-state-business-primary',
  '--dsw-alias-interactive-bg-hover',
]
function collectTheme(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    const cs = getComputedStyle(document.documentElement)
    for (const v of THEME_VARS) {
      const val = cs.getPropertyValue(v).trim()
      if (val.length > 0) out[v] = val
    }
    out['--openloop-host-font'] = getComputedStyle(document.body).fontFamily
  } catch { /* 采集失败——空主题，iframe 走 fallback */ }
  return out
}

export function CanvasWorkbench(): ReactNode {
  const [open, setOpen] = useState(readOpen)
  const [width, setWidth] = useState(readWidth)
  const [snapshot, setSnapshot] = useState<CanvasSnapshot | null>(null)
  const [annotations, setAnnotations] = useState<CanvasAnnotation[]>([])
  const [toast, setToast] = useState<string | null>(null)
  /** 工作区目录（M4） */
  const [catalogOpen, setCatalogOpen] = useState(false)
  const [catalogItems, setCatalogItems] = useState<CanvasListItem[]>([])
  const [revMenuOpen, setRevMenuOpen] = useState(false)
  /** iframe 桥状态 */
  const [appReady, setAppReady] = useState(false)
  const [appFailed, setAppFailed] = useState(false)
  const [iframeH, setIframeH] = useState(400)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const bridgeRef = useRef<CanvasAppHostBridge | null>(null)
  /** 最新数据 ref（桥回调闭包读最新值——避免闭包旧值） */
  const snapshotRef = useRef<CanvasSnapshot | null>(null)
  const annotationsRef = useRef<CanvasAnnotation[]>([])
  snapshotRef.current = snapshot
  annotationsRef.current = annotations

  // 0.12 排查期：壳诊断信（__openloopCanvasAppDiag——无 token，仅 console）
  useEffect(() => {
    const onDiag = (ev: MessageEvent): void => {
      const d = ev.data as { __openloopCanvasAppDiag?: boolean; kind?: string; message?: string }
      if (d?.__openloopCanvasAppDiag === true) console.info('[canvas-app-diag]', d.kind, d.message ?? '')
    }
    window.addEventListener('message', onDiag)
    return () => { window.removeEventListener('message', onDiag) }
  }, [])

  const persistOpen = (v: boolean): void => { setOpen(v); try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ } }
  const persistWidth = (w: number): void => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }
  const showToast = (msg: string): void => { setToast(msg); setTimeout(() => { setToast(cur => cur === msg ? null : cur) }, 2200) }

  const hasEverOpened = useRef(false)

  useEffect(() => {
    const applySnapshot = (canvasId: string, snap: CanvasSnapshot | undefined): void => {
      // != null 宽松判断（真机教训：测试脚本/边界场景可能传 null）
      if (snap != null) {
        setSnapshot(snap)
        registerCanvasSnapshot(snap)
      }
      setAnnotations(listAnnotations(canvasId))
    }
    window.__openloopCanvasOpen = (canvasId: string, snap?: CanvasSnapshot) => {
      applySnapshot(canvasId, snap)
      hasEverOpened.current = true
      persistOpen(true)
      void refreshFromStorage(canvasId)
    }
    window.__openloopCanvasUpdate = (canvasId: string, snap: CanvasSnapshot) => {
      applySnapshot(canvasId, snap)
      if (!hasEverOpened.current) {
        hasEverOpened.current = true
        persistOpen(true)
      }
      void refreshFromStorage(canvasId)
    }
    return () => {
      delete window.__openloopCanvasOpen
      delete window.__openloopCanvasUpdate
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshFromStorage = async (canvasId: string): Promise<void> => {
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}`)
      if (!res.ok) return
      const snap = await res.json() as CanvasSnapshot
      if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId) {
        setSnapshot(prev => {
          if (prev !== null && snap.revision <= prev.revision) return prev
          registerCanvasSnapshot(snap)
          return snap
        })
      }
    } catch { /* 端点不存在（headless）——保底快照即可 */ }
  }

  /** M4 工作区目录：拉清单（列表端点；失败静默） */
  const refreshCatalog = async (): Promise<void> => {
    try {
      const res = await fetch('/qoder-canvas/list')
      if (!res.ok) return
      const body = await res.json() as { items?: CanvasListItem[] }
      if (Array.isArray(body.items)) setCatalogItems(body.items)
    } catch { /* headless / 端点未注入 */ }
  }

  /** M4 切换画布（目录点击）：拉指定 canvas 最新快照 + 注释跟随 */
  const openCanvas = async (canvasId: string): Promise<void> => {
    setSnapshot(null)
    setAnnotations([])
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}`)
      if (res.ok) {
        const snap = await res.json() as CanvasSnapshot
        if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId) {
          setSnapshot(snap)
          registerCanvasSnapshot(snap)
        }
      }
    } catch { /* 端点不可用——目录本身来自端点，一般不会走到 */ }
    setAnnotations(listAnnotations(canvasId))
    setCatalogOpen(false)
  }

  /** M4 版本切换：读指定 rev 快照（标注按 canvasId 共享，天然跨版本） */
  const openRevision = async (canvasId: string, rev: number): Promise<void> => {
    if (snapshot !== null && snapshot.canvasId === canvasId && snapshot.revision === rev) { setRevMenuOpen(false); return }
    try {
      const res = await fetch(`/qoder-canvas/canvas/${canvasId}?rev=${rev}`)
      if (!res.ok) { setRevMenuOpen(false); return }
      const snap = await res.json() as CanvasSnapshot
      if (snap?.kind === 'qoder-canvas' && snap.canvasId === canvasId && snap.revision === rev) {
        setSnapshot(snap)
        registerCanvasSnapshot(snap)
      }
    } catch { /* 网络异常——保持当前版本 */ }
    setRevMenuOpen(false)
  }

  // M4 引用注入桥：dock 开着时暴露「当前画布 + 版本」给 capsule（发送时轻量引用）
  useEffect(() => {
    setCurrentCanvasRef(snapshot !== null && open ? { canvasId: snapshot.canvasId, revision: snapshot.revision, title: snapshot.canvas.title } : null)
  }, [snapshot, open])

  // ---------------------------------------------------------------------------
  // 0.12 iframe 桥：挂载（React 属性时序教训 AGENTS.md #18——sandbox 先于 src 手动序贯）
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const iframe = iframeRef.current
    if (iframe === null || snapshot === null) return

    // 手动序贯：先 sandbox 再 src（srcdoc/src 先生效会触发一次无沙箱 load）
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('src', '/qoder-canvas/app')

    const bridge = new CanvasAppHostBridge(iframe, {
      onReady: () => { setAppReady(true); setAppFailed(false) },
      onHeight: (h: number) => { setIframeH(Math.min(Math.max(h, 200), 4000)) },
      onAnnotation: (payload: AppAnnotationPayload) => {
        // iframe 内保存的标注 → 宿主持久化 + 胶囊（现有链路零改动接续）
        const ann = addAnnotation({
          canvasId: payload.canvasId,
          revision: payload.revision,
          targets: payload.targets as never,
          note: payload.note,
        })
        pushCapsuleDraft(ann)
        setAnnotations(listAnnotations(payload.canvasId))
        reportAnnotation({
          canvasId: payload.canvasId,
          revision: payload.revision,
          targets: (payload.targets as readonly { kind: string; id?: string }[]).map(t => t.kind === 'node' || t.kind === 'element' || t.kind === 'html-element' ? String(t.id ?? '') : 'text'),
          note: payload.note,
        })
        showToast('评论已保存——已挂到输入框上方胶囊，发送时随消息发出')
      },
      onAction: (node) => {
        // action 节点回流（iframe 内点击 → 宿主 composer 草稿）
        const intent = typeof node.props.intent === 'string' ? node.props.intent : node.id
        const ctx = typeof node.props.context === 'object' && node.props.context !== null ? JSON.stringify(node.props.context) : ''
        injectComposerDraft(`${intent}${ctx.length > 0 ? `\ncontext: ${ctx}` : ''}`)
      },
    })
    bridgeRef.current = bridge

    // 3s 未 ready → 降级直渲染（webServer 未注入 / 端点缺失）
    const failTimer = setTimeout(() => {
      setAppReady(ready => {
        if (!ready) setAppFailed(true)
        return ready
      })
    }, 3000)

    const onLoad = (): void => { bridge.sendInit(collectTheme()) }
    iframe.addEventListener('load', onLoad)
    return () => {
      clearTimeout(failTimer)
      iframe.removeEventListener('load', onLoad)
      bridge.dispose()
      bridgeRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot === null])

  // ready 后推送快照；snapshot/annotations 变化时重推
  useEffect(() => {
    if (!appReady || snapshot === null) return
    bridgeRef.current?.sendSnapshot(snapshot, annotations)
  }, [appReady, snapshot, annotations])

  return (
    <>
      <CanvasToggle open={open} onToggle={() => persistOpen(!open)} />
      <CanvasDockHost open={open} width={width} onWidthChange={persistWidth}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }} data-openloop-canvas-workbench>
          <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }}>
            <span style={{ fontSize: 13, fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {snapshot !== null ? snapshot.canvas.title : '画布工作台'}
            </span>
            {/* 目录按钮（M4：工作区画布清单，点击切换） */}
            <button type="button" onClick={() => { setCatalogOpen(v => !v); if (!catalogOpen) void refreshCatalog() }} title="工作区画布目录"
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: catalogOpen ? `1px solid ${ACCENT}` : '1px solid transparent', cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', color: catalogOpen ? ACCENT : 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>目录</button>
            {/* 版本切换（M4） */}
            {snapshot !== null ? (
              <span style={{ position: 'relative' }}>
                <button type="button" onClick={() => setRevMenuOpen(v => !v)}
                  title={`版本历史 · ${snapshot.canvasId}@r${snapshot.revision}`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--dsw-alias-label-caption, #888)', background: 'none', border: revMenuOpen ? `1px solid ${ACCENT}` : '1px solid transparent', borderRadius: 5, padding: '2px 6px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 12a9 9 3 0 9-9 9.75 9.75 0 0 1-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
                  </svg>
                  版本 r{snapshot.revision} ▾
                </button>
                {revMenuOpen ? (() => {
                  const item = catalogItems.find(c => c.canvasId === snapshot.canvasId)
                  const revs = item !== undefined && item.revisions.length > 0 ? item.revisions : [snapshot.revision]
                  return (
                    <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 60, minWidth: 120, borderRadius: 8, padding: '4px', background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}>
                      {[...revs].reverse().map(r => (
                        <button key={r} type="button" onClick={() => { void openRevision(snapshot.canvasId, r) }}
                          style={{ display: 'block', width: '100%', textAlign: 'left', fontSize: 10.5, padding: '4px 8px', borderRadius: 5, border: 0, cursor: 'pointer', fontFamily: 'ui-monospace, Menlo, monospace', background: r === snapshot.revision ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 12%, transparent)' : 'none', color: r === snapshot.revision ? ACCENT : 'inherit' }}>
                          r{r}{r === snapshot.revision ? ' · 当前' : ''}
                        </button>
                      ))}
                    </div>
                  )
                })() : null}
              </span>
            ) : null}
            {/* 评论计数（0.12：评注面板在 iframe 内自动弹出——此为指示器） */}
            {snapshot !== null && annotations.length > 0 ? (
              <span title="评论面板在画布内（选中元素时自动弹出）" style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', color: 'var(--dsw-alias-label-secondary, inherit)' }}>
                评论 {annotations.length}
              </span>
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
            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 14, position: 'relative' }}>
              {/* 工作区目录（M4：悬浮列表） */}
              {catalogOpen ? (
                <div style={{ position: 'absolute', right: 12, top: 0, zIndex: 65, width: 270, maxHeight: 'min(420px, calc(100% - 24px))', overflow: 'auto', borderRadius: 12, background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.2))', boxShadow: '0 12px 36px rgba(0,0,0,.26)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.1))', background: 'var(--dsw-alias-bg-layer-2, rgba(127,127,127,.05))' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>工作区画布（{catalogItems.length}）</span>
                    <button type="button" onClick={() => setCatalogOpen(false)} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', fontSize: 13, lineHeight: 1, color: 'var(--dsw-alias-label-caption, #888)', fontFamily: 'inherit' }}>×</button>
                  </div>
                  {catalogItems.length === 0 ? (
                    <div style={{ padding: '20px 14px', fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', textAlign: 'center' }}>
                      还没有画布产物<br /><span style={{ fontSize: 10 }}>让 Agent 用 canvas 工具生成第一个（历史画布首次续编后入册）</span>
                    </div>
                  ) : catalogItems.map(item => (
                    <button key={item.canvasId} type="button" onClick={() => { void openCanvas(item.canvasId) }}
                      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 0, borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.06))', cursor: 'pointer', background: snapshot?.canvasId === item.canvasId ? 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 8%, transparent)' : 'none', fontFamily: 'inherit' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'inherit' }}>{item.title}</span>
                        {item.revisions.length > 1 ? <span style={{ fontSize: 9.5, color: ACCENT, fontWeight: 600 }}>r{item.revision} · {item.revisions.length}版</span> : <span style={{ fontSize: 9.5, color: 'var(--dsw-alias-label-caption, #999)' }}>r{item.revision}</span>}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--dsw-alias-label-caption, #999)', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' }}>
                        {item.canvasId}{item.updatedAt.length > 0 ? ` · ${new Date(item.updatedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              ) : null}

              {/* 0.12 画布区：整体 iframe（sandbox 属性由桥 effect 手动序贯设置）。
                  appFailed（3s 未 ready / headless）→ 降级直渲染（无标注保底） */}
              {appFailed ? (
                <div style={{ padding: 10, fontSize: 11, color: 'var(--dsw-alias-label-caption, #888)', border: '1px dashed var(--dsw-alias-border-l2, rgba(127,127,127,.25))', borderRadius: 8, marginBottom: 10 }}>
                  画布沙箱应用未加载（降级直渲染——标注交互不可用，查看无碍）
                </div>
              ) : null}
              {appFailed ? (
                <CanvasSurface snapshot={snapshot} />
              ) : (
                <iframe
                  ref={iframeRef}
                  title={`canvas-app-${snapshot.canvasId}`}
                  style={{ width: '100%', height: iframeH, border: 0, display: 'block', borderRadius: 10, background: 'var(--dsw-alias-bg-layer-1, #fff)' }}
                />
              )}
            </div>
          )}
        </div>
      </CanvasDockHost>

      {/* composer 注释胶囊（全局） */}
      <AnnotationCapsuleBar />

      {/* toast */}
      {toast !== null ? (
        <div style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', zIndex: 2147483100, fontSize: 11, padding: '7px 14px', borderRadius: 9, color: 'var(--dsw-alias-label-primary, inherit)', background: 'var(--dsw-alias-bg-layer-1, #fff)', border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', boxShadow: '0 8px 28px rgba(0,0,0,.25)' }}>{toast}</div>
      ) : null}
    </>
  )
}
