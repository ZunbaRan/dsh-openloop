/**
 * 列表排序助手（2026-09-03 用户自定义排序迭代；2026-09-04 拖拽层迁移 dnd-kit）：
 * - 排序模式：custom（用户拖拽顺序，持久化）/ az / za
 * - 拖拽顺序存 localStorage（key 由调用方定）；拖动即切回 custom 模式
 * - 拖拽交互：@dnd-kit/sortable（FLIP 滑动动画 + 键盘可达性 + 无原生影子漂移）
 */
import type { CSSProperties, ReactNode } from 'react'
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export type SortMode = 'custom' | 'az' | 'za'

export const SORT_MODE_LABEL: Record<SortMode, string> = {
  custom: '自定义',
  az: 'A → Z',
  za: 'Z → A',
}

export function readSortMode(key: string): SortMode {
  try {
    const v = localStorage.getItem(key)
    return v === 'az' || v === 'za' ? v : 'custom'
  } catch {
    return 'custom'
  }
}

export function writeSortMode(key: string, mode: SortMode): void {
  try { localStorage.setItem(key, mode) } catch { /* ignore */ }
}

/** custom → az → za → custom 循环 */
export function cycleSortMode(mode: SortMode): SortMode {
  return mode === 'custom' ? 'az' : mode === 'az' ? 'za' : 'custom'
}

export function readOrder(key: string): string[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function writeOrder(key: string, order: string[]): void {
  try { localStorage.setItem(key, JSON.stringify(order)) } catch { /* ignore */ }
}

/**
 * 应用排序：custom 模式按 saved order 排（已存 id 按保存顺序在前，新 id 按原顺序续后）；
 * az/za 按 label 排序（locale 感知，中文友好）。
 */
export function applySortOrder<T>(
  items: readonly T[],
  mode: SortMode,
  order: readonly string[],
  keyOf: (item: T) => string,
  labelOf: (item: T) => string,
): T[] {
  if (mode === 'az' || mode === 'za') {
    const sorted = [...items].sort((a, b) => labelOf(a).localeCompare(labelOf(b), 'zh-Hans-CN-u-co-pinyin'))
    return mode === 'az' ? sorted : sorted.reverse()
  }
  if (order.length === 0) return [...items]
  const pos = new Map(order.map((id, i) => [id, i]))
  return [...items].sort((a, b) => {
    const pa = pos.get(keyOf(a))
    const pb = pos.get(keyOf(b))
    if (pa !== undefined && pb !== undefined) return pa - pb
    if (pa !== undefined) return -1
    if (pb !== undefined) return 1
    return 0
  })
}

/** 拖拽实时换位：把 dragId 移到 targetId 前面（同位/no-op 返回原数组） */
export function moveBefore(order: readonly string[], dragId: string, targetId: string): string[] {
  if (dragId === targetId) return [...order]
  const from = order.indexOf(dragId)
  const to = order.indexOf(targetId)
  if (from === -1 || to === -1 || from === to) return [...order]
  const next = [...order]
  next.splice(from, 1)
  next.splice(next.indexOf(targetId) + (from < to ? 1 : 0), 0, dragId)
  return next
}

/** 排序模式切换按钮（小图标，title 显示当前模式与切换目标） */
export function SortButton({ mode, onCycle }: { mode: SortMode; onCycle: () => void }): ReactNode {
  const next = cycleSortMode(mode)
  return (
    <button
      type="button"
      className="d2-sort-btn"
      title={`排序：${SORT_MODE_LABEL[mode]}（点击切换为 ${SORT_MODE_LABEL[next]}）`}
      onClick={e => { e.stopPropagation(); onCycle() }}
    >
      {mode === 'custom' ? '⇅' : mode === 'az' ? 'A↓' : 'Z↓'}
    </button>
  )
}

// ---------------------------------------------------------------------
// dnd-kit 封装（2026-09-04：手搓 HTML5 DnD → @dnd-kit/sortable）
// ---------------------------------------------------------------------

/** 每行渲染 props（由 useSortable 产出，调用方挂到行元素上） */
export interface SortableRowRenderProps {
  setNodeRef: (el: HTMLElement | null) => void
  attributes: Record<string, unknown>
  listeners: Record<string, unknown> | undefined
  style: CSSProperties
  isDragging: boolean
}

function SortableRow({ id, children }: { id: string; children: (p: SortableRowRenderProps) => ReactNode }): ReactNode {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return children({
    setNodeRef,
    attributes: attributes as unknown as Record<string, unknown>,
    listeners: listeners as unknown as Record<string, unknown> | undefined,
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : undefined,
      zIndex: isDragging ? 5 : undefined,
      position: 'relative' as const,
      touchAction: 'none',
    },
    isDragging,
  })
}

/**
 * 可拖拽排序列表：包一层 DndContext + SortableContext，逐行给 useSortable props。
 * 拖动中其它行 FLIP 滑动让位（dnd-kit transform transition 自带动画）；
 * onReorder 在松手时拿到完整新顺序（调用方负责持久化 + 切回 custom 模式）。
 */
export function SortableRows<T>({ items, keyOf, onReorder, children }: {
  items: readonly T[]
  keyOf: (item: T) => string
  onReorder: (ids: string[]) => void
  children: (item: T, rowProps: SortableRowRenderProps) => ReactNode
}): ReactNode {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = items.map(keyOf)
  const onDragEnd = (e: DragEndEvent): void => {
    const { active, over } = e
    if (over === null || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from === -1 || to === -1) return
    onReorder(arrayMove(ids, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map(item => (
          <SortableRow key={keyOf(item)} id={keyOf(item)}>
            {rowProps => children(item, rowProps)}
          </SortableRow>
        ))}
      </SortableContext>
    </DndContext>
  )
}
