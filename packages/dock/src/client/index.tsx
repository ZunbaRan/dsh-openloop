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
import { DockHost } from './DockHost.tsx'
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

function DockToggle({ open, onToggle, count }: { open: boolean; onToggle: () => void; count: number }): ReactNode {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={open ? '收起 OpenLoop Dock' : '展开 OpenLoop Dock'}
      style={{
        position: 'fixed',
        top: 10,
        right: 10,
        zIndex: 2147483100,
        width: 34,
        height: 34,
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12))',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
        cursor: 'pointer',
        fontSize: 14,
        lineHeight: 1,
        boxShadow: '0 2px 8px rgba(0,0,0,.12)',
      }}
    >
      {open ? '▶' : '📌'}{count > 0 && !open ? <span style={{ fontSize: 10, marginLeft: 2 }}>{count}</span> : null}
    </button>
  )
}

function DockShell(): ReactNode {
  const [open, setOpen] = useState(() => dockStore.getSnapshot().tiles.length > 0)
  const [version, setVersion] = useState(0)
  useEffect(() => dockStore.subscribe(() => setVersion(v => v + 1)), [])
  const tiles = dockStore.getSnapshot().tiles

  // service 桥（toggle 供外部按钮调用）
  useEffect(() => {
    ;(window as unknown as Record<string, unknown>).__openloopDockToggle = () => setOpen(o => !o)
    return () => { delete (window as unknown as Record<string, unknown>).__openloopDockToggle }
  }, [])

  return (
    <>
      <DockToggle open={open} onToggle={() => setOpen(o => !o)} count={tiles.length} />
      <DockHost open={open} width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} data-dock-version={version}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.08))', flexShrink: 0 }}>
            <strong style={{ fontSize: 13 }}>OpenLoop Dock</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => dockStore.compact()} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12))', background: 'transparent', cursor: 'pointer' }}>整理</button>
              <button type="button" onClick={() => { if (confirm('清空 Dock 画板？')) dockStore.clear() }} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12))', background: 'transparent', cursor: 'pointer' }}>清空</button>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <DockBoardView />
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
      ;(window as unknown as { __openloopDockToggle?: () => void }).__openloopDockToggle?.()
    },
    pinArtifact(meta, title, origin) {
      dockStore.pin({ kind: 'artifact', meta }, title, origin)
      ;(window as unknown as { __openloopDockToggle?: () => void }).__openloopDockToggle?.()
    },
    toggle() {
      ;(window as unknown as { __openloopDockToggle?: () => void }).__openloopDockToggle?.()
    },
    isOpen() {
      return document.querySelector('[data-openloop-dock-panel]') !== null
    },
  }
  ctx.provide('openloop-dock/client', service)
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
      void root?.unmount()
      host.remove()
    }
  }, 'openloop-dock: shell mount')
}
