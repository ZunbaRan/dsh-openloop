/**
 * DockHost：右侧 dock 的挂载层（方案 A，DOCK_DESIGN §1）。
 *
 * 冲突规避三件套：
 * 1. host div 挂 body（data-openloop-dock），MutationObserver 保活——与 better-sidebar 各挂各的；
 * 2. 挤压用 #root 的 padding-right（better-sidebar 用 margin-right，天然叠加不覆盖）；
 * 3. 空间探测（bsb 的公开布局副作用：#root computed margin-right）+ 500ms poll。
 *
 * 展开交互（2026-08-24 重做，对齐 better-sidebar 体验）：
 * - 面板常驻渲染，宽度过渡（width 0 ↔ W）——从右侧推出的动画效果；
 * - 左缘 6px 拖宽手柄（col-resize），实时生效，松手持久化 localStorage；
 * - 拖动期间禁用 width 过渡（否则动画滞后手感）；内容层固定宽度不随动画压缩。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const DOCK_WIDTH_VAR = '--openloop-dock-width'
const TRANSITION = 'width .22s ease'

/** 右侧空间探测：锚 #root 的 computed margin-right（bsb 的公开布局副作用） */
export function probeDockRightEdge(): number {
  if (typeof window === 'undefined') return 0
  const root = document.getElementById('root')
  if (!root) return window.innerWidth
  const marginRight = parseFloat(getComputedStyle(root).marginRight) || 0
  // 防御：异常大值（>70% 视口）视为无效，贴视口右缘
  const occupied = marginRight > 0 && marginRight < window.innerWidth * 0.7 ? marginRight : 0
  return window.innerWidth - occupied
}

export interface DockHostProps {
  open: boolean
  width: number
  onWidthChange?: (width: number) => void
  children: ReactNode
}

export function DockHost({ open, width, onWidthChange, children }: DockHostProps): ReactNode {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [rightEdge, setRightEdge] = useState(() => probeDockRightEdge())
  const [resizing, setResizing] = useState(false)
  const widthRef = useRef(width)
  widthRef.current = width

  // host 挂载 + 保活（body 被清空时重挂——better-sidebar 同款防御）
  useEffect(() => {
    const el = document.createElement('div')
    el.setAttribute('data-openloop-dock', '')
    document.body.appendChild(el)
    setHost(el)
    const observer = new MutationObserver(() => {
      if (!document.body.contains(el)) document.body.appendChild(el)
    })
    observer.observe(document.body, { childList: true })
    return () => {
      observer.disconnect()
      el.remove()
    }
  }, [])

  // 空间探测：500ms poll（CSS 变量驱动的 push 无法被 MutationObserver 捕获）
  useEffect(() => {
    const update = () => setRightEdge(probeDockRightEdge())
    update()
    const timer = setInterval(update, 500)
    window.addEventListener('resize', update)
    return () => {
      clearInterval(timer)
      window.removeEventListener('resize', update)
    }
  }, [])

  // 挤压：#root 的 padding-right（与 better-sidebar 的 margin-right 叠加共存）。
  // 注入一次全局样式（padding 过渡与面板 width 过渡时长一致，两侧同步推出）
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-openloop-dock-style', '')
    styleEl.textContent = `#root { padding-right: var(${DOCK_WIDTH_VAR}, 0px); transition: padding-right .22s ease }`
    document.head.appendChild(styleEl)
    return () => styleEl.remove()
  }, [])
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.style.setProperty(DOCK_WIDTH_VAR, open ? `${width}px` : '0px')
    return () => {
      root.style.removeProperty(DOCK_WIDTH_VAR)
    }
  }, [open, width])

  // 左缘拖宽：实时调 onWidthChange（拖动中禁过渡），松手由调用方持久化
  const startResize = (event: React.PointerEvent): void => {
    if (!open) return
    event.preventDefault()
    const startX = event.clientX
    const startW = widthRef.current
    setResizing(true)
    const move = (e: PointerEvent): void => {
      const next = Math.round(Math.max(280, Math.min(760, startW + (startX - e.clientX))))
      onWidthChange?.(next)
    }
    const up = (): void => {
      setResizing(false)
      removeEventListener('pointermove', move)
      removeEventListener('pointerup', up)
    }
    addEventListener('pointermove', move)
    addEventListener('pointerup', up)
  }

  if (!host) return null

  // 外层：宽度动画容器（0 ↔ W），右缘固定 → 从右侧推出；内层固定宽度防内容压缩
  const outer: CSSProperties = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    right: typeof window === 'undefined' ? 0 : Math.max(0, window.innerWidth - rightEdge),
    width: open ? width : 0,
    transition: resizing ? 'none' : TRANSITION,
    overflow: 'hidden',
    zIndex: 2147483050,
    background: 'var(--dsw-alias-bg-layer-1, #fff)',
    boxSizing: 'border-box',
  }
  // bsb 同款「嵌入式」处理（2026-08-24 对比实测）：无 box-shadow、无 border-left——
  // 面板与主内容仅靠背景色差分层（panel rgb(35,35,36) vs 主区更深），
  // 阴影/边线是「悬浮」感的来源，bsb 面板实测 shadow:none / radius:0 / 无描边。
  const inner: CSSProperties = {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--dsw-alias-bg-layer-1, #fff)',
    boxSizing: 'border-box',
  }
  return createPortal(
    <div style={outer} data-openloop-dock-panel="">
      <div style={inner}>
        {children}
        {/* 左缘拖宽手柄 */}
        <div
          onPointerDown={startResize}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 7,
            cursor: open ? 'col-resize' : 'default',
            pointerEvents: open ? 'auto' : 'none',
            zIndex: 10,
          }}
          title="拖动调整宽度"
        />
      </div>
    </div>,
    host,
  )
}
