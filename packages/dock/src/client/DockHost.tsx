/**
 * DockHost：右侧 dock 的挂载层（方案 A，DOCK_DESIGN §1）。
 *
 * 冲突规避三件套：
 * 1. host div 挂 body（data-openloop-dock），MutationObserver 保活——与 better-sidebar 各挂各的；
 * 2. 挤压用 bsb 同款 margin-right + width calc（见 DOCK_DESIGN §1.1 的 2026-08-24 更正：
 *    padding-right 对固定轨道 grid 的 AppFrame 无挤压效果，已被实测证伪并替换）；
 * 3. 空间探测读 bsb 的 --dsh-sidebar-width 变量（其设于 <html>，经继承在 #root computed 可见），
 *    不能再读 computed margin-right——新机制下它包含 dock 自身宽度，会形成反馈回路。
 *
 * 展开交互（2026-08-24 重做，对齐 better-sidebar 体验）：
 * - 面板常驻渲染，宽度过渡（width 0 ↔ W）——从右侧推出的动画效果；
 * - 左缘 6px 拖宽手柄（col-resize），实时生效，松手持久化 localStorage；
 * - 拖动期间禁用 width 过渡（否则动画滞后手感）；内容层固定宽度不随动画压缩。
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { clampDockWidth } from '../shared/dock-width.ts'

export { clampDockWidth, DOCK_MIN_WIDTH, dockMaxWidth } from '../shared/dock-width.ts'

const DOCK_WIDTH_VAR = '--openloop-dock-width'
const BSB_WIDTH_VAR = '--dsh-sidebar-width'
const TRANSITION = 'width .22s ease'

/** 右侧空间探测：bsb 占用 = 其 --dsh-sidebar-width（设于 <html>，继承到 #root）。 */
export function probeDockRightEdge(): number {
  if (typeof window === 'undefined') return 0
  const root = document.getElementById('root')
  if (!root) return window.innerWidth
  const raw = parseFloat(getComputedStyle(root).getPropertyValue(BSB_WIDTH_VAR)) || 0
  // 防御：异常大值（>70% 视口）视为无效，贴视口右缘
  const occupied = raw > 0 && raw < window.innerWidth * 0.7 ? raw : 0
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
  const [handleHover, setHandleHover] = useState(false)
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

  // 挤压：bsb 同款 margin-right + width calc（DOCK_DESIGN §1.1）。规则内同时引用 bsb
  // 变量——本 <style> 运行时注入、在 bsb 样式之后，同优先级后加载胜出，因此 bsb 的开合
  // 经由这条规则继续生效；bsb 不存在时其变量回落 0。
  // 注意：不能用 padding-right——AppFrame 是固定轨道 grid，padding 只缩内容盒而
  // frame 不收缩（2026-08-24 CDP 实测：padding 360 时 frame 右缘纹丝不动，margin+width 正常）。
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-openloop-dock-style', '')
    styleEl.textContent = [
      `#root {`,
      `  margin-right: calc(var(${BSB_WIDTH_VAR}, 0px) + var(${DOCK_WIDTH_VAR}, 0px));`,
      `  width: calc(100% - var(${BSB_WIDTH_VAR}, 0px) - var(${DOCK_WIDTH_VAR}, 0px));`,
      `  transition: margin-right .22s ease, width .22s ease;`,
      `}`,
    ].join('\n')
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
      const next = clampDockWidth(Math.round(startW + (startX - e.clientX)))
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
        {/* 左缘拖宽手柄（0.8.5：常驻 4px 宽条 + hover/拖动中变蓝——此前是 7px 全透明条，
            用户看不到也找不到 hover 目标；对齐 bsb/col 把手手感） */}
        <div
          onPointerDown={startResize}
          onPointerEnter={() => setHandleHover(true)}
          onPointerLeave={() => setHandleHover(false)}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
            cursor: open ? 'col-resize' : 'default',
            pointerEvents: open ? 'auto' : 'none',
            zIndex: 10,
          }}
          title="拖动调整宽度"
        >
          <div
            style={{
              width: resizing || handleHover ? 6 : 4,
              height: '100%',
              background: resizing || handleHover
                ? 'var(--dsw-alias-state-business-primary, #4176e6)'
                : 'var(--dsw-alias-border-l2, rgba(127,127,127,.3))',
              transition: 'background .15s ease, width .15s ease',
            }}
          />
        </div>
      </div>
    </div>,
    host,
  )
}
