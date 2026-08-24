/**
 * OpenLoop Dock client 半：
 * - DockHost 挂载（padding-right push + better-sidebar 空间探测，见 DockHost.tsx）
 * - cordis service `openloop-dock/client`：pinPanel / pinArtifact / toggle / open
 *   （panels/artifact 的 PinButton 经可选 inject 消费——dock 未装时按钮自动降级隐藏）
 * - 右上角浮动开关（不依赖 slots，零冲突）
 */
import type { Context } from '@deepseek-ai/cordis'
import { createElement, useEffect, useState, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { DockHost, probeDockRightEdge } from './DockHost.tsx'
import { DockBoardView } from './DockBoardView.tsx'
import { dockStore, type DockTile } from './store.ts'

export const name = 'openloop-dock'
// dock 不依赖宿主 cordis 服务（自主渲染 + provide service）——空 inject
export const inject: string[] = []

export interface DockClientService {
  /** 固定一个面板（快照语义：meta 含 panel + resolved） */
  pinPanel(meta: unknown, title: string, origin?: DockTile['origin']): void
  /** 固定一个 html artifact */
  pinArtifact(meta: unknown, title: string, origin?: DockTile['origin']): void
  /** 打开/收起 dock */
  toggle(): void
  /** dock 是否打开 */
  isOpen(): boolean
}

function DockToggle({ open, onToggle, count, right }: { open: boolean; onToggle: () => void; count: number; right: number }): ReactNode {
  // 开态隐藏：面板 header 自带「收起」按钮（bsb 同款——开着的面板用面板自己的
  // 关闭控制，不再让浮动按钮遮挡 tile 内容）
  const [hover, setHover] = useState(false)
  if (open) return null
  return (
    <button
      type="button"
      onClick={onToggle}
      title="展开 OpenLoop Dock"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed',
        // top 52 错层（2026-08-24 真机冲突修复）：bsb 的面板开关在 header 行
        // （y≈3-40），dock toggle 与其垂直错开避免命中冲突。
        top: 52,
        right,
        zIndex: 2147483100,
        minWidth: 34,
        height: 34,
        padding: '0 8px',
        borderRadius: 10,
        // 低存在感处理（2026-08-24 对比 bsb）：无阴影、静止半透明，
        // hover 才完全显现——浮动按钮不该抢视觉
        border: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.25))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        opacity: hover ? 1 : 0.55,
        transition: 'opacity .15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      📌{count > 0 ? <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span> : null}
    </button>
  )
}

const WIDTH_KEY = 'openloop.dock.width.v1'
const DEFAULT_WIDTH = 420

function readStoredWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY)
    const n = raw === null ? NaN : Number(raw)
    return Number.isFinite(n) ? Math.max(280, Math.min(760, n)) : DEFAULT_WIDTH
  } catch {
    return DEFAULT_WIDTH
  }
}

/** header ghost 按钮（bsb 工具栏风格：无边框、hover 淡底、可 danger 态） */
function HeaderButton({ label, title, onClick, danger = false }: { label: string; title: string; onClick: () => void; danger?: boolean }): ReactNode {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        fontSize: 11,
        padding: '3px 8px',
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
        lineHeight: 1.5,
        color: danger ? 'var(--dsw-alias-danger, #d4453a)' : 'inherit',
        opacity: danger ? 1 : 0.72,
        background: hover ? (danger ? 'rgba(212,69,58,.12)' : 'rgba(127,127,127,.14)') : 'transparent',
        transition: 'background .12s ease',
      }}
    >{label}</button>
  )
}

function DockShell(): ReactNode {
  const [open, setOpen] = useState(() => dockStore.getSnapshot().tiles.length > 0)
  const [version, setVersion] = useState(0)
  const [width, setWidth] = useState(readStoredWidth)
  const [confirmingClear, setConfirmingClear] = useState(false)
  // 两步确认 3 秒未确认自动复位（替代原生 confirm 弹窗）
  useEffect(() => {
    if (!confirmingClear) return
    const timer = setTimeout(() => setConfirmingClear(false), 3000)
    return () => clearTimeout(timer)
  }, [confirmingClear])
  useEffect(() => dockStore.subscribe(() => setVersion(v => v + 1)), [])
  const tiles = dockStore.getSnapshot().tiles
  // toggle 跟随 bsb 右缘（bsb 开时挪到其左侧 10px，避免与其按钮重叠）
  const [toggleRight, setToggleRight] = useState(10)
  useEffect(() => {
    const update = () => setToggleRight(Math.max(10, window.innerWidth - probeDockRightEdge() + 10))
    update()
    // 与 DockHost 同款：500ms poll（CSS 变量驱动的 push 无法被 MutationObserver 捕获）
    const timer = setInterval(update, 500)
    window.addEventListener('resize', update)
    return () => { clearInterval(timer); window.removeEventListener('resize', update) }
  }, [])

  // service 桥：toggle 给手动操作、ensureOpen 给 pin（2026-08-24 修复：pinPanel
  // 之前用 toggle 但 toggle 无状态翻转——dock 已开时 pin 反而把它关掉；
  // ensureOpen 强制开，幂等）
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>
    w.__openloopDockToggle = () => setOpen(o => !o)
    w.__openloopDockOpen = () => setOpen(true)
    return () => {
      delete w.__openloopDockToggle
      delete w.__openloopDockOpen
    }
  }, [])

  return (
    <>
      <DockToggle open={open} onToggle={() => setOpen(o => !o)} count={tiles.length} right={toggleRight} />
      <DockHost open={open} width={width} onWidthChange={(w) => { setWidth(w); try { localStorage.setItem(WIDTH_KEY, String(w)) } catch { /* ignore */ } }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-dock-version={version}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(127,127,127,.18))', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: 0.2, opacity: 0.85 }}>OpenLoop Dock</span>
            <div style={{ display: 'flex', gap: 2 }}>
              <HeaderButton label="整理" title="重力紧凑：消除空洞，保持相对顺序" onClick={() => dockStore.compact()} />
              <HeaderButton label="收起" title="收起 Dock（tile 保留，再点右上角 📌 展开）" onClick={() => setOpen(false)} />
              <HeaderButton
                label={confirmingClear ? '确认清空？' : '清空'}
                title={confirmingClear ? '再次点击确认移除全部 tile' : '移除画板上的全部 tile'}
                danger={confirmingClear}
                onClick={() => {
                  if (confirmingClear) {
                    dockStore.clear()
                    setConfirmingClear(false)
                  } else {
                    setConfirmingClear(true)
                  }
                }}
              />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {tiles.length === 0
              ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0.45, padding: 24, textAlign: 'center', userSelect: 'none' }}>
                  <div style={{ fontSize: 24 }}>📌</div>
                  <div style={{ fontSize: 12, lineHeight: 1.8 }}>
                    面板或页面卡片右上角点「📌 固定」<br />把 widget / artifact 钉到这里自由排布
                  </div>
                </div>
              )
              : <DockBoardView />}
          </div>
        </div>
      </DockHost>
    </>
  )
}

export function apply(ctx: Context): void {
  // service：panels/artifact 经 ctx.inject(['openloop-dock/client']) 可选消费
  const service: DockClientService = {
    pinPanel(meta, title, origin) {
      dockStore.pin({ kind: 'panel', meta }, title, origin)
      ;(window as unknown as { __openloopDockOpen?: () => void }).__openloopDockOpen?.()
    },
    pinArtifact(meta, title, origin) {
      dockStore.pin({ kind: 'artifact', meta }, title, origin)
      ;(window as unknown as { __openloopDockOpen?: () => void }).__openloopDockOpen?.()
    },
    toggle() {
      ;(window as unknown as { __openloopDockToggle?: () => void }).__openloopDockToggle?.()
    },
    isOpen() {
      return document.querySelector('[data-openloop-dock-panel]') !== null
    },
  }
  // service 双通道：cordis provide（保留语义）+ window 直通（消费方零 inject 依赖——
  // 真机验证 cordis client 侧动态 inject(['openloop-dock/client']) 回调未触发，
  // pin 按钮两包全灭；window 直通是 __openloopDockToggle 已实证的同款模式，
  // 且渲染时读取天然支持时序（晚渲染的卡片拿到最新状态））
  ctx.provide('openloop-dock/client', service)
  ;(window as unknown as Record<string, unknown>).__openloopDockService = service
  // 自主渲染（better-sidebar 同款模式）：自建 host + createRoot，
  // cordis 生命周期负责 dispose。
  ctx.effect(() => {
    const host = document.createElement('div')
    host.setAttribute('data-openloop-dock-root', '')
    document.body.appendChild(host)
    let root: Root | undefined
    try {
      root = createRoot(host)
      root.render(createElement(DockShell))
    } catch { /* 渲染失败静默——不影响宿主页面 */ }
    return () => {
      delete (window as unknown as Record<string, unknown>).__openloopDockService
      void root?.unmount()
      host.remove()
    }
  }, 'openloop-dock: shell mount')
}
