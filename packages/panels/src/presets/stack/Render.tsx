/**
 * stack 渲染器：方向 + 间距的弹性布局。
 * 样式 100% 来自 var(--openloop-*)，间距用内联 px（§14 space 阶梯兜底由主题提供）。
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

export function StackRender({ props }: PresetRenderProps) {
  const root = asRecord(props) ?? {}
  const direction = root.direction === 'horizontal' ? 'horizontal' : 'vertical'
  const gap = isFiniteNumber(root.gap) ? Math.max(0, Math.min(48, Math.trunc(root.gap))) : 8
  const align = ALIGN_MAP[String(root.align)] ?? 'flex-start'
  const children = Array.isArray(root.children) ? (root.children as unknown[]) : []

  const style: CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap,
    alignItems: align,
    minWidth: 0,
  }
  return (
    <div data-openloop-preset="stack" data-openloop-direction={direction} data-openloop-gap={String(gap)} style={style}>
      {renderChildren(children)}
    </div>
  )
}
