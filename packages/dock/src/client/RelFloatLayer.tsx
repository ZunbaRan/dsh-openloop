/**
 * Board 联动悬浮窗层（M3，2026-09-02 联动特性 v1）。
 *
 * 挂在 DockBoardView 内：监听联动事件总线，按「registry 组件 relations.consumes」
 * 把事件映射为目标面板 rid + params → 悬浮窗渲染目标面板（PanelSurface 带参）。
 *
 * 交互语义（原型 designs/linkage-proto 决策 B/C，用户已批）：
 * - 多开：不同 params 各自开窗并排对比；同 rid+params 重复事件 → 聚焦已有窗
 * - 悬浮窗不 pin 进 board（只是投影壳：拖拽 / 折叠 / 关闭）
 * - 用户关闭的窗口，同参数事件再次到来不自动重开（本会话记住关闭意图）
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { getPanelsClient } from './openloop-clients.ts'
import { lookupRegistryComponent } from './app-registry.ts'
import { buildRelConsumesIndex } from './rel-views.tsx'

type PanelsClient = NonNullable<ReturnType<typeof getPanelsClient>>
type PanelMeta = Parameters<NonNullable<PanelsClient['PanelSurface']>>[0]['meta']
type PanelDefinition = PanelMeta['panel']
type JsonObject = Record<string, unknown>

interface FloatWindowState {
  readonly winId: string
  readonly rid: string
  readonly params: JsonObject
  readonly paramKey: string
  x: number
  y: number
  collapsed: boolean
  z: number
}

let zSeq = 20
let winSeq = 0

/** rid → PanelDefinition 解析器（registry entry → panel 定义，经 panels 懒桥） */
function registryPanelResolver(rid: string): PanelDefinition | undefined {
  const comp = lookupRegistryComponent(rid)
  if (!comp) return undefined
  return getPanelsClient()?.panelDefinitionFromEntry(comp.entry)
}

export function RelFloatLayer(): ReactNode {
  const [wins, setWins] = useState<FloatWindowState[]>([])
  const closedKeysRef = useRef(new Set<string>())
  const zIndexRef = useRef(zSeq)

  useEffect(() => {
    const panels = getPanelsClient()
    if (!panels) return
    const consumesIndex = buildRelConsumesIndex()
    return panels.relBus().subscribe((event, payload) => {
      const targets = consumesIndex.get(event)
      if (!targets || targets.length === 0) return
      setWins(prev => {
        const next = [...prev]
        for (const target of targets) {
          const paramKey = `${target.rid}::${target.param}=${String(payload[target.param] ?? '')}`
          // 用户已显式关闭同参数窗口：本会话不自动重开
          if (closedKeysRef.current.has(paramKey)) continue
          const existing = next.find(w => w.paramKey === paramKey)
          if (existing) {
            existing.z = ++zIndexRef.current
            continue
          }
          winSeq += 1
          zIndexRef.current += 1
          next.push({
            winId: `relfw-${winSeq}`,
            rid: target.rid,
            params: payload,
            paramKey,
            x: 380 + (winSeq % 5) * 42,
            y: 48 + (winSeq % 5) * 44,
            collapsed: false,
            z: zIndexRef.current,
          })
        }
        return next
      })
    })
  }, [])

  const closeWin = useCallback((winId: string, paramKey: string) => {
    closedKeysRef.current.add(paramKey)
    setWins(prev => prev.filter(w => w.winId !== winId))
  }, [])
  const toggleWin = useCallback((winId: string) => {
    setWins(prev => prev.map(w => w.winId === winId ? { ...w, collapsed: !w.collapsed } : w))
  }, [])
  const focusWin = useCallback((winId: string) => {
    setWins(prev => prev.map(w => w.winId === winId ? { ...w, z: ++zIndexRef.current } : w))
  }, [])
  const moveWin = useCallback((winId: string, x: number, y: number) => {
    setWins(prev => prev.map(w => w.winId === winId ? { ...w, x, y } : w))
  }, [])

  if (wins.length === 0) return null
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 40 }} data-openloop-rel-float-layer>
      {wins.map(w => (
        <RelFloatWindow
          key={w.winId}
          win={w}
          onClose={() => closeWin(w.winId, w.paramKey)}
          onToggle={() => toggleWin(w.winId)}
          onFocus={() => focusWin(w.winId)}
          onMove={(x, y) => moveWin(w.winId, x, y)}
        />
      ))}
    </div>
  )
}

function RelFloatWindow({ win, onClose, onToggle, onFocus, onMove }: {
  win: FloatWindowState
  onClose: () => void
  onToggle: () => void
  onFocus: () => void
  onMove: (x: number, y: number) => void
}): ReactNode {
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const panels = getPanelsClient()
  const PanelSurface = panels?.PanelSurface
  const panel = registryPanelResolver(win.rid)

  const onPointerDown = (e: React.PointerEvent<HTMLElement>): void => {
    onFocus()
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: win.x, oy: win.y }
    const move = (ev: PointerEvent): void => {
      const d = dragRef.current
      if (!d) return
      onMove(d.ox + ev.clientX - d.sx, d.oy + ev.clientY - d.sy)
    }
    const up = (): void => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const title = panel?.title ?? win.rid
  return (
    <div
      style={{
        position: 'absolute',
        left: win.x,
        top: win.y,
        width: 420,
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: win.z,
        boxShadow: '0 12px 40px rgba(0,0,0,.32)',
        border: '1px solid color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 38%, transparent)',
        background: 'var(--dsw-alias-bg-layer-1, #fff)',
      }}
      data-openloop-rel-window={win.rid}
      onPointerDown={() => onFocus()}
    >
      <div
        style={{
          flex: '0 0 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 10px',
          cursor: 'grab',
          userSelect: 'none',
          background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 10%, var(--dsw-alias-bg-layer-2, #f6f6f7))',
          borderBottom: '1px solid var(--dsw-alias-border-l1, rgba(127,127,127,.12))',
        }}
        onPointerDown={onPointerDown}
      >
        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 5, color: 'var(--dsw-alias-state-business-primary, #4176e6)', background: 'color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)' }}>详情</span>
        <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 5, flexShrink: 0 }}>
          <button type="button" title={win.collapsed ? '展开' : '折叠'} onClick={onToggle} style={{ width: 18, height: 18, borderRadius: 5, border: 0, background: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--dsw-alias-label-tertiary, #888)' }}>{win.collapsed ? '▢' : '—'}</button>
          <button type="button" title="关闭" onClick={onClose} style={{ width: 18, height: 18, borderRadius: 5, border: 0, background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #888)' }}>×</button>
        </span>
      </div>
      {win.collapsed ? null : (
        <div style={{ maxHeight: 360, overflow: 'auto' }}>
          {panel && PanelSurface ? (
            <PanelSurface
              meta={{ kind: 'openloop.panel', version: 1, panel, resolved: {}, resolvedAt: new Date().toISOString() }}
              relParams={win.params}
            />
          ) : (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--dsw-alias-label-caption, #888)' }}>
              页面 {win.rid} 当前不可用（可能未注册或已移除）
            </div>
          )}
        </div>
      )}
    </div>
  )
}
