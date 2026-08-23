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
const BSB_HOST = '[data-dsh-better-sidebar]'

/** 读取 better-sidebar 的右缘（存在且可见时返回其左边界 x；否则返回视口宽） */
function probeRightEdge(): number {
  if (typeof window === 'undefined') return 0
  const host = document.querySelector(BSB_HOST)
  if (!host) return window.innerWidth
  const rect = host.getBoundingClientRect()
  // 不可见（宽 0 或不在视口内）视为不存在
  if (rect.width <= 0 || rect.right <= 0) return window.innerWidth
  return rect.left
}

export interface DockHostProps {
  open: boolean
  width: number
  children: ReactNode
}

export function DockHost({ open, width, children }: DockHostProps): ReactNode {
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [rightEdge, setRightEdge] = useState(() => probeRightEdge())

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

  // 空间探测：better-sidebar 开/关/宽度变化 → 更新右缘
  useEffect(() => {
    const update = () => setRightEdge(probeRightEdge())
    update()
    const bsb = document.querySelector(BSB_HOST)
    const observers: Array<ResizeObserver | MutationObserver> = []
    if (bswObserve(bsb)) {
      const ro = new ResizeObserver(update)
      ro.observe(bsb as Element)
      observers.push(ro)
    }
    const mo = new MutationObserver(update)
    mo.observe(document.body, { childList: true, subtree: false })
    observers.push(mo)
    window.addEventListener('resize', update)
    return () => {
      for (const o of observers) o.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // 挤压：#root 的 padding-right（与 better-sidebar 的 margin-right 叠加共存）
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const apply = () => {
      root.style.setProperty(DOCK_WIDTH_VAR, open ? `${width}px` : '0px')
    }
    apply()
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

// bswObserve：bsb host 可观察性守卫（Element 且 connected）
function bswObserve(target: Element | null): boolean {
  return target instanceof Element && target.isConnected
}
