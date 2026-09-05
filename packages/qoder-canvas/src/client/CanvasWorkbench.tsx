/**
 * CanvasWorkbench：canvas dock 的工作台容器（S1 骨架）。
 *
 * S1 范围：推出面板 + toggle + 工作台骨架（画布占位 + 「从对话流打开」事件桥）。
 * S3 范围（后续）：元素 pin 标注 + 评论面板。
 */
import { useEffect, useState, type ReactNode } from 'react'
import { CanvasDockHost, CanvasToggle, CANVAS_DEFAULT_WIDTH, clampCanvasWidth } from './CanvasDockHost.tsx'

const WIDTH_KEY = 'openloop.canvas.width.v1'
const OPEN_KEY = 'openloop.canvas.open.v1'

function readWidth(): number {
  try { const v = Number(localStorage.getItem(WIDTH_KEY)); return Number.isFinite(v) && v > 0 ? clampCanvasWidth(v) : CANVAS_DEFAULT_WIDTH } catch { return CANVAS_DEFAULT_WIDTH }
}
function readOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === '1' } catch { return false }
}

/** window 事件桥：对话流入口卡片「⇱ 工作台」→ 展开并定位画布 */
declare global {
  interface Window { __openloopCanvasOpen?: (canvasId: string) => void }
}

export function CanvasWorkbench(): ReactNode {
  const [open, setOpen] = useState(readOpen)
  const [width, setWidth] = useState(readWidth)
  const [activeCanvasId, setActiveCanvasId] = useState<string | null>(null)

  const persistOpen = (v: boolean): void => { setOpen(v); try { localStorage.setItem(OPEN_KEY, v ? '1' : '0') } catch { /* ignore */ } }
  const persistWidth = (w: number): void => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }

  // 事件桥：对话流卡片打开（展开 + 定位）
  useEffect(() => {
    window.__openloopCanvasOpen = (canvasId: string) => {
      setActiveCanvasId(canvasId)
      persistOpen(true)
    }
    return () => { delete window.__openloopCanvasOpen }
  }, [])

  return (
    <>
      <CanvasToggle open={open} onToggle={() => persistOpen(!open)} />
      <CanvasDockHost open={open} width={width} onWidthChange={persistWidth}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }} data-openloop-canvas-workbench>
          <header style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))' }}>
            <span style={{ fontSize: 13, fontWeight: 650, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>画布工作台</span>
            {activeCanvasId !== null ? (
              <span style={{ fontSize: 10, fontFamily: 'ui-monospace, Menlo, monospace', color: 'var(--dsw-alias-label-caption, #888)' }}>{activeCanvasId}</span>
            ) : null}
            <button type="button" onClick={() => persistOpen(false)} title="收起（画布保留）"
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: 0, cursor: 'pointer', background: 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))', color: 'var(--dsw-alias-label-secondary, inherit)', fontFamily: 'inherit' }}>收起</button>
          </header>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 16 }}>
            {activeCanvasId === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '48px 20px', color: 'var(--dsw-alias-label-caption, #888)' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2.5" /><path d="M3 9h18M9 9v12" />
                </svg>
                <div style={{ fontSize: 12, lineHeight: 1.7, textAlign: 'center' }}>
                  还没有打开的画布<br />
                  <span style={{ fontSize: 11 }}>让 Agent 用 canvas 工具画一个，或在对话流的画布卡片上点「⇱ 工作台」</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--dsw-alias-label-caption, #888)' }}>
                {/* S3：CanvasSurface 真身渲染 + 元素 pin 标注 + 评论面板 */}
                画布 {activeCanvasId} 的真身渲染（S3 接入 CanvasSurface + 标注）
              </div>
            )}
          </div>
        </div>
      </CanvasDockHost>
    </>
  )
}
