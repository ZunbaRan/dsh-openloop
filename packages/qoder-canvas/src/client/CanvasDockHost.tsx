/**
 * CanvasDockHost：canvas dock 的推出面板（复刻 dock DockHost 已验证机制）。
 *
 * 与 board 的关系（QODER_CANVAS_SIDEBAR §2）：
 * - canvas dock 是与 board 平级的独立第二推出面板（内容 | canvas dock | board | bsb）
 * - 右缘定位：right = bsbWidth + boardWidth（读 --dsh-sidebar-width +
 *   --openloop-dock-width 两个变量，500ms 探测）
 * - 挤压：设 --openloop-canvas-width 变量；margin 总管规则在 dock 的 DockHost
 *   （calc(dock + canvas)，缺省 0 向后兼容）——本组件【不写】挤压规则
 * - 推出动画/左缘拖宽/bsb 同款嵌入式（无阴影无描边）——全部复刻 DockHost
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const CANVAS_WIDTH_VAR = '--openloop-canvas-width'
const BSB_WIDTH_VAR = '--dsh-sidebar-width'
const BOARD_WIDTH_VAR = '--openloop-dock-width'
const TRANSITION = 'width .22s ease'

export const CANVAS_MIN_WIDTH = 320
export const CANVAS_DEFAULT_WIDTH = 560
export function clampCanvasWidth(w: number): number {
  const max = Math.max(CANVAS_MIN_WIDTH, (typeof window === 'undefined' ? 1200 : window.innerWidth) - 200)
  return Math.min(Math.max(CANVAS_MIN_WIDTH, w), max)
}

/** canvas dock 右缘 = bsbWidth + boardWidth（最靠内容的面板） */
export function probeCanvasRightEdge(): number {
  if (typeof window === 'undefined') return 0
  const cs = getComputedStyle(document.documentElement)
  const read = (v: string): number => {
    const n = parseFloat(cs.getPropertyValue(v)) || 0
    return n > 0 && n < window.innerWidth * 0.8 ? n : 0
  }
  return window.innerWidth - read(BSB_WIDTH_VAR) - read(BOARD_WIDTH_VAR)
}

export interface CanvasDockHostProps {
  open: boolean
  width: number
  onWidthChange?: (width: number) => void
  children: ReactNode
}

export function CanvasDockHost({ open, width, onWidthChange, children }: CanvasDockHostProps): ReactNode {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [rightEdge, setRightEdge] = useState(() => probeCanvasRightEdge())
  const [resizing, setResizing] = useState(false)
  const [handleHover, setHandleHover] = useState(false)
  const widthRef = useRef(width)
  widthRef.current = width

  // host 挂载 + 保活（复刻 DockHost：body 被清空时重挂）
  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('data-openloop-canvas-dock', '')
    document.body.appendChild(el)
    setHost(el)
    const observer = new MutationObserver(() => {
      if (!document.body.contains(el)) document.body.appendChild(el)
    })
    observer.observe(document.body, { childList: true })
    return () => { observer.disconnect(); el.remove() }
  }, [])

  // 右缘探测：500ms poll（复刻 DockHost——CSS 变量驱动无法被 MutationObserver 捕获）
  useEffect(() => {
    const update = () => setRightEdge(probeCanvasRightEdge())
    update()
    const timer = setInterval(update, 500)
    window.addEventListener('resize', update)
    return () => { clearInterval(timer); window.removeEventListener('resize', update) }
  }, [])

  // 挤压：设 --openloop-canvas-width 变量（规则总管在 dock DockHost；本组件不写规则）
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.style.setProperty(CANVAS_WIDTH_VAR, open ? `${width}px` : '0px')
    return () => { root.style.removeProperty(CANVAS_WIDTH_VAR) }
  }, [open, width])

  // 左缘拖宽（复刻 DockHost：实时调宽，松手由调用方持久化；拖动中禁过渡）
  const startResize = (event: React.PointerEvent): void => {
    if (!open) return
    event.preventDefault()
    const startX = event.clientX
    const startW = widthRef.current
    setResizing(true)
    const move = (e: PointerEvent): void => { onWidthChange?.(clampCanvasWidth(Math.round(startW + (startX - e.clientX)))) }
    const up = (): void => { setResizing(false); removeEventListener('pointermove', move); removeEventListener('pointerup', up) }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
  }

  if (!host) return null

  const outer: CSSProperties = {
    position: 'fixed', top: 0, bottom: 0,
    right: typeof window === 'undefined' ? 0 : Math.max(0, window.innerWidth - rightEdge),
    width: open ? width : 0,
    transition: resizing ? 'none' : TRANSITION,
    overflow: 'hidden',
    zIndex: 2147483045,  // board(2147483050) 之下——canvas dock 在 board 左侧，层级略低
    background: 'var(--dsw-alias-bg-layer-1, #fff)',
    boxSizing: 'border-box',
  }
  const inner: CSSProperties = {
    position: 'absolute', top: 0, bottom: 0, right: 0,
    width, height: '100%',
    display: 'flex', flexDirection: 'column',
    background: 'var(--dsw-alias-bg-layer-1, #fff)',
    boxSizing: 'border-box',
  }
  return createPortal(
    <div style={outer} data-openloop-canvas-panel="">
      <div style={inner}>
        {children}
        {/* 左缘拖宽手柄（复刻 DockHost） */}
        <div
          onPointerDown={startResize}
          onPointerEnter={() => setHandleHover(true)}
          onPointerLeave={() => setHandleHover(false)}
          style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, cursor: open ? 'col-resize' : 'default', pointerEvents: open ? 'auto' : 'none', zIndex: 10 }}
          title="拖动调整宽度"
        >
          <div style={{
            width: resizing || handleHover ? 6 : 4, height: '100%',
            background: resizing || handleHover ? 'var(--dsw-alias-state-business-primary, #4176e6)' : 'var(--dsw-alias-border-l2, rgba(127,127,127,.3))',
            transition: 'background .15s ease, width .15s ease',
          }} />
        </div>
      </div>
    </div>,
    host,
  )
}

/** canvas toggle（board toggle 左侧；right = bsbWidth + boardWidth + 46） */
export function CanvasToggle({ open, onToggle }: { open: boolean; onToggle: () => void }): ReactNode {
  const [hover, setHover] = useState(false)
  const [right, setRight] = useState(46)
  // board toggle 隐藏时（board 开）canvas toggle 仍显示在 board 面板左边——故不随 open 隐藏
  useEffect(() => {
    const update = (): void => {
      const edge = probeCanvasRightEdge()  // = innerWidth - bsb - board
      setRight(Math.max(46, window.innerWidth - edge + 46))
    }
    update()
    const timer = setInterval(update, 500)
    window.addEventListener('resize', update)
    return () => { clearInterval(timer); window.removeEventListener('resize', update) }
  }, [])
  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? '收起画布工作台' : '展开画布工作台'}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed', top: 38, right, zIndex: 2147483045,
        width: 28, height: 28, padding: 0, borderRadius: '50%',
        border: 'none',
        background: hover ? 'var(--dsw-alias-interactive-bg-hover, rgba(127,127,127,.12))' : 'transparent',
        cursor: 'pointer', lineHeight: 1,
        opacity: hover || open ? 1 : 0.55,
        transition: 'opacity .15s ease, background .15s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: open ? 'var(--dsw-alias-state-business-primary, #4176e6)' : 'var(--dsw-alias-label-secondary, inherit)',
      }}
    >
      {/* canvas 图标：画板（调色板简化——矩形+内部分区） */}
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <path d="M3 9h18M9 9v12" />
      </svg>
    </button>
  )
}
