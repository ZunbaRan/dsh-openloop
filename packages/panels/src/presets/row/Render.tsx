/**
 * row 渲染器：水平弹性行（可换行、交叉轴对齐）。
 * 样式 100% 来自 var(--openloop-*)。
 */
import type { CSSProperties } from 'react'
import type { PresetRenderProps } from '../index.ts'
import { asRecord, isFiniteNumber } from '../common.ts'
import { renderChildren } from '../widget-view.tsx'

const ALIGN_MAP: Record<string, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
}

export function RowRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const gap = isFiniteNumber(root.gap) ? Math.max(0, Math.min(48, Math.trunc(root.gap))) : 8
  const align = ALIGN_MAP[String(root.align)] ?? 'center'
  const wrap = root.wrap !== false
  const children = Array.isArray(root.children) ? (root.children as unknown[]) : []

  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: wrap ? 'wrap' : 'nowrap',
    alignItems: align,
    gap,
    minWidth: 0,
  }
  return (
    <div data-openloop-preset="row" data-openloop-gap={String(gap)} style={style}>
      {renderChildren(children)}
    </div>
  )
}
