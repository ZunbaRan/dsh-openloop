/**
 * 画布注释持久化（M2.5）：注释归属于画布元素——画布卡片上显示角标、
 * hover 弹出详情卡可编辑（CodeBuddy 注释语义：对话里的是引用，详情在画布侧）。
 *
 * 存储：localStorage 会话级（不进 meta——注释是用户交互产物，不是 Agent 快照；
 * 与快照生命周期解耦：画布迭代 revision 增加后注释仍挂在元素上）
 */

export type AnnotationTarget =
  | { readonly kind: 'node'; readonly id: string; readonly label: string }
  | { readonly kind: 'text'; readonly excerpt: string }

export interface CanvasAnnotation {
  readonly id: string
  readonly canvasId: string
  readonly revision: number
  readonly targets: readonly AnnotationTarget[]
  readonly note: string
  readonly createdAt: string
}

const KEY_PREFIX = 'qoder-canvas.annotations.v1.'

function keyOf(canvasId: string): string {
  return KEY_PREFIX + canvasId
}

function readAll(canvasId: string): CanvasAnnotation[] {
  try {
    const raw = localStorage.getItem(keyOf(canvasId))
    if (raw === null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(a => typeof a?.id === 'string' && typeof a?.note === 'string') : []
  } catch {
    return []
  }
}

function writeAll(canvasId: string, items: readonly CanvasAnnotation[]): void {
  try { localStorage.setItem(keyOf(canvasId), JSON.stringify(items)) } catch { /* 存储满则静默 */ }
}

export function listAnnotations(canvasId: string): CanvasAnnotation[] {
  return readAll(canvasId)
}

export function addAnnotation(input: Omit<CanvasAnnotation, 'id' | 'createdAt'>): CanvasAnnotation {
  const annotation: CanvasAnnotation = {
    ...input,
    id: `ann_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`,
    createdAt: new Date().toISOString(),
  }
  writeAll(input.canvasId, [...readAll(input.canvasId), annotation])
  return annotation
}

export function updateAnnotationNote(canvasId: string, id: string, note: string): void {
  writeAll(canvasId, readAll(canvasId).map(a => a.id === id ? { ...a, note } : a))
}

export function removeAnnotation(canvasId: string, id: string): void {
  writeAll(canvasId, readAll(canvasId).filter(a => a.id !== id))
}

/** 进 composer 的草稿格式：引用头 + 评注（纯文本胶囊风格） */
export function formatAnnotationDraft(snapshot: { canvasId: string; revision: number; canvas: { title: string } }, targets: readonly AnnotationTarget[], note: string): string {
  const lines = targets.map(t => t.kind === 'node' ? `▸ ${t.id} ${t.label}` : `▸ 文本 "${t.excerpt}"`)
  return `[画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId}@r${snapshot.revision}]\n${lines.join('\n')}\n${note}`
}
