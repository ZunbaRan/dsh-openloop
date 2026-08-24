/**
 * DockHost：右侧 dock 的挂载层（方案 A，DOCK_DESIGN §1）。
 *
 * 冲突规避三件套：
 * 1. host div 挂 body（data-openloop-dock），MutationObserver 保活——与 better-sidebar 各挂各的；
 * 2. 挤压用 #root 的 padding-right（better-sidebar 用 margin-right，天然叠加不覆盖）；
 * 3. 空间探测（非 API 对接）：[data-dsh-better-sidebar] 存在 → dock 贴其左侧；
 *    不存在 → 贴视口右缘。ResizeObserver + MutationObserver 跟踪其开/关/宽度变化。
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

const DOCK_WIDTH_VAR = '--openloop-dock-width'

/**
 * 右侧空间探测（2026-08-24 第二次修正）：锚点从 bsb host DOM 改为
 * #root 的 computed margin-right——better-sidebar 的核心机制就是给 #root
 * 加 margin-right 推布局（layout.css），这是它的「公开布局副作用」：
 * 右侧栏开 → margin-right = 侧栏宽（实测 448px）；关 → 0。
 * 相比 DOM 探测的两次失败（host 常驻 h=0 误判、内部容器全视口），
 * margin 信号语义稳定且与面板显隐严格同步，也不耦合其内部结构。
 * dock 用 padding-right 推（与 margin 天然叠加），读 margin 不读 padding，
 * 不会读到自己的 push。
 */
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
  children: ReactNode
}

export function DockHost({ open, width, children }: DockHostProps): ReactNode {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [rightEdge, setRightEdge] = useState(() => probeDockRightEdge())

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

  // 空间探测：bsb 的 push 经 CSS 变量（--bsb-width）驱动——#root 的 style
  // 属性本身不变，MutationObserver 抓不到（2026-08-24 第三次修正）。
  // 改 500ms poll getComputedStyle（开/关侧栏是低频动作，开销可忽略）。
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
  // 2026-08-24 修复：此前只 setProperty 变量、无规则消费——push 从未生效。
  // 注入一次全局样式（#root padding-right: var(--openloop-dock-width)）。
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-openloop-dock-style', '')
    styleEl.textContent = `#root { padding-right: var(${DOCK_WIDTH_VAR}, 0px); transition: padding-right .18s ease }`
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

  if (!host || !open) return null

  // right 定位 = 视口右缘到 rightEdge 的距离：
  // - 无 bsb：rightEdge = window.innerWidth → right = 0 → 贴视口右缘
  // - 有 bsb：rightEdge = bsb.left → right = window.innerWidth - bsb.left = bsb 占据的左缘
  //   距离 → dock 右边贴 bsb 左边，width 由 prop 决定（不超出 rightEdge）
  // 修前 bug：旧版用 `left: rightEdge - width` 在 bsb 存在时让 dock 跑出屏幕左外
  const style: CSSProperties = {
    position: 'fixed',
    top: 0,
    bottom: 0,
    right: typeof window === 'undefined' ? 0 : Math.max(0, window.innerWidth - rightEdge),
    width,
    zIndex: 2147483050, // 略高于 better-sidebar 渲染层，避免被遮（其 zIndex 段 2147483xxx）
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--dsw-alias-bg-layer-1, #fff)',
    borderLeft: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))',
    boxShadow: '-4px 0 14px rgba(0,0,0,.06)',
    boxSizing: 'border-box',
  }
  return createPortal(
    <div style={style} data-openloop-dock-panel="">{children}</div>,
    host,
  )
}
