/**
 * 列表排序助手（2026-09-03 用户自定义排序迭代）：
 * - 排序模式：custom（用户拖拽顺序，持久化）/ az / za
 * - 拖拽顺序存 localStorage（key 由调用方定）；拖动即切回 custom 模式
 * - HTML5 DnD 拖拽重排：行 dragover 时实时预览换位，dragend 提交持久化
 */
import type { ReactNode } from 'react'

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

/** HTML5 DnD 行拖拽 props 生成器：返回挂到行元素上的事件集（dragover 实时换位） */
export interface RowDragHandlers {
  draggable: true
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}

export function makeRowDragHandlers(args: {
  id: string
  getDragId: () => string | null
  setDragId: (id: string | null) => void
  onHover: (dragId: string, targetId: string) => void
  onCommit: () => void
}): RowDragHandlers {
  const { id, getDragId, setDragId, onHover, onCommit } = args
  return {
    draggable: true,
    onDragStart: e => {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', id)
      setDragId(id)
    },
    onDragOver: e => {
      const dragId = getDragId()
      if (dragId === null || dragId === id) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      onHover(dragId, id)
    },
    onDragEnd: () => {
      setDragId(null)
      onCommit()
    },
  }
}
