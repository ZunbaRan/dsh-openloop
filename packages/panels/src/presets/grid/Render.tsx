/**
 * grid 渲染器：等宽列网格（columns 1–6）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isFiniteNumber } from '../common.ts'
import { renderChildren } from '../widget-view.tsx'

export function GridRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const columns = isFiniteNumber(root.columns) ? Math.max(1, Math.min(6, Math.trunc(root.columns))) : 2
  const gap = isFiniteNumber(root.gap) ? Math.max(0, Math.min(48, Math.trunc(root.gap))) : 8
  const children = Array.isArray(root.children) ? (root.children as unknown[]) : []

  const style: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gap,
  }
  return (
    <div data-openloop-preset="grid" data-openloop-columns={String(columns)} data-openloop-gap={String(gap)} style={style}>
      {renderChildren(children)}
    </div>
  )
}
