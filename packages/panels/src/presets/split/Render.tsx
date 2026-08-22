/**
 * split 渲染器：两栏（children[0]=左栏，children[1]=右栏；1 个时单栏）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { JsonObject } from '../../contract.ts'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isFiniteNumber } from '../common.ts'
import { WidgetView } from '../widget-view.tsx'

const pane: CSSProperties = {
  minWidth: 0,
}

export function SplitRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const gutter = isFiniteNumber(root.gutter) ? Math.max(0, Math.min(48, Math.trunc(root.gutter))) : 12
  const children = Array.isArray(root.children) ? (root.children as JsonObject[]) : []
  const left = children[0]
  const right = children[1]

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: right ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)',
    gap: gutter,
  }
  return (
    <div data-openloop-preset="split" data-openloop-panes={right ? '2' : '1'} style={style}>
      {left ? <div style={pane}><WidgetView widget={left} /></div> : null}
      {right ? <div style={pane}><WidgetView widget={right} /></div> : null}
    </div>
  )
}
