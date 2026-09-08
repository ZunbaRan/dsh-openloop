/**
 * 画布注释持久化（M2.5）：注释归属于画布元素——画布卡片上显示角标、
 * hover 弹出详情卡可编辑（CodeBuddy 注释语义：对话里的是引用，详情在画布侧）。
 *
 * 存储：localStorage 会话级（不进 meta——注释是用户交互产物，不是 Agent 快照；
 * 与快照生命周期解耦：画布迭代 revision 增加后注释仍挂在元素上）
 */

export type AnnotationTarget =
  | { readonly kind: 'node'; readonly id: string; readonly label: string }
  | {
      /** S7 元素级点选（对齐 workbuddy/DevTools 精度）：选中 node 内部的具体 DOM 元素 */
      readonly kind: 'element'
      /** 所属画布节点 id（badge 定位/DSL 注入用） */
      readonly id: string
      /** 人类可读摘要（tag + 文本节选） */
      readonly label: string
      /** 元素标签名（小写，如 span/div/path） */
      readonly tag: string
      /** 从 [data-canvas-node] 到该元素的 CSS 路径（如 `div > span.delta`） */
      readonly domPath: string
      /** 元素文本节选（前 40 字符，可空） */
      readonly text?: string | undefined
    }
  | {
      readonly kind: 'text'
      readonly excerpt: string
      /** 划选文本所属的节点 id（S7.1 增强：Agent 不再只靠文本猜位置） */
      readonly nodeId?: string | undefined
    }
  | {
      /** 0.12：html 节点 shadow DOM 内的元素命中（同文档直接标注） */
      readonly kind: 'html-element'
      /** 所属 html 节点 id */
      readonly id: string
      readonly label: string
      /** shadow 内 CSS 路径（带 :nth-of-type） */
      readonly domPath: string
      readonly tag: string
      readonly text?: string | undefined
      /** 命中元素 outerHTML 截断（~600 字符）——Agent 按源码片段文本匹配定位修改 */
      readonly snippet: string
    }

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

/**
 * 进 composer 的草稿格式（S6 结构化重做，2026-09-06 用户拍板）：
 * 标注是给 Agent 消费的结构化上下文（Qoder「注释即 API 文档」），不是给人看的标签。
 * 每个 node target 带：document 路径（nodes[i]）+ 节点类型 + id + 【完整 DSL 源码片段】
 * ——Agent 拿到后能精确定位 canvas 工具的 document 里改哪一段。
 */
type SnapshotLike = { canvasId: string; revision: number; canvas: { title: string; nodes?: readonly { id: string; type: string; props: Readonly<Record<string, unknown>> }[] } }

/** 单个 target 的结构化块（node/element 带 DSL 源码；text 带所属节点定位；html-element 带 snippet） */
function formatTargetBlock(t: AnnotationTarget, nodes: readonly { id: string; type: string; props: Readonly<Record<string, unknown>> }[]): string {
  if (t.kind === 'html-element') {
    return formatHtmlElementTarget(t, nodes)
  }
  if (t.kind === 'node' || t.kind === 'element') {
    const idx = nodes.findIndex(n => n.id === t.id)
    const node = idx >= 0 ? nodes[idx] : undefined
    // 元素级：额外带 element（DOM 路径）+ tag + text——Agent 知道用户指的是节点内哪个子元素
    const elementAttrs = t.kind === 'element'
      ? ` element="${t.domPath}" tag="${t.tag}"${t.text !== undefined && t.text.length > 0 ? ` text="${t.text.replace(/"/g, '&quot;')}"` : ''}`
      : ''
    if (node !== undefined) {
      return `<target type="${node.type}" id="${node.id}" path="nodes[${idx}]"${elementAttrs}>\n${JSON.stringify(node, null, 2)}\n</target>`
    }
    // 节点不在当前快照（快照迭代后被删）——降级为 id 引用
    return `<target id="${t.id}" note="not found in current revision"${elementAttrs}>${t.label}</target>`
  }
  // 划字：带所属节点定位（S7.1——只给文本 Agent 只能猜它在哪个节点）
  const idx = t.nodeId !== undefined ? nodes.findIndex(n => n.id === t.nodeId) : -1
  const inAttr = idx >= 0 ? ` in="nodes[${idx}]"` : t.nodeId !== undefined ? ` in="${t.nodeId}"` : ''
  return `<target type="text"${inAttr}>"${t.excerpt}"</target>`
}

/** html-element target 块（0.12）：snippet 是 Agent 定位修改的主线索 */
function formatHtmlElementTarget(t: Extract<AnnotationTarget, { kind: 'html-element' }>, nodes: readonly { id: string; type: string }[]): string {
  const idx = nodes.findIndex(n => n.id === t.id)
  const pathAttr = idx >= 0 ? `nodes[${idx}]` : t.id
  const textAttr = t.text !== undefined && t.text.length > 0 ? ` text="${escapeAttr(t.text)}"` : ''
  // snippet 首字符防御：防 [ / @ / 1) 等触发 Lexical composer 魔法转换——起头补换行
  const snippet = t.snippet.length > 0 && /[[@\d]/.test(t.snippet[0] ?? '') ? `\n${t.snippet}` : t.snippet
  return `<target type="html" id="${t.id}" path="${pathAttr}" element="${escapeAttr(t.domPath)}" tag="${t.tag}"${textAttr}>\n${snippet}\n</target>\n定位说明：该元素在 html 节点 ${pathAttr} 的 source 内，无结构化路径——请以上方源码片段做文本匹配定位，修改后重发完整 source`
}

/** 属性值转义（防注入破坏 XML 结构） */
function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/\n/g, ' ')
}

export function formatAnnotationDraft(
  snapshot: SnapshotLike,
  targets: readonly AnnotationTarget[],
  note: string,
): string {
  return formatAnnotationBatch(snapshot, [{ targets, note }])
}

/**
 * 同画布多条注释合并注入（S7.1）：共享一个定位头，逐条编号。
 * 头部不带方括号（真机教训：Lexical composer 的 markdown 插件会把 `[...]`
 * 误识别为 link 语法）；条目序号用 `#1`（`[1]` 有 link 风险、`1)` 行首有
 * 有序列表转换风险，`#1` 无 markdown 语义——`#` 后必须跟空格才是 heading）。
 */
export function formatAnnotationBatch(
  snapshot: SnapshotLike,
  anns: readonly { targets: readonly AnnotationTarget[]; note: string }[],
): string {
  const nodes = snapshot.canvas.nodes ?? []
  const multi = anns.length > 1
  // 头部不带 @（真机教训：cv@r1 的 @ 会触发 Lexical composer 的 mention 弹窗，
  // 干扰插入落点/发送）；不带方括号（markdown link 误识别）
  const head = `画布标注 · ${snapshot.canvas.title} ${snapshot.canvasId} · r${snapshot.revision}${multi ? `（${anns.length} 条）` : ''}`
  const body = anns.map((ann, i) => {
    const block = ann.targets.map(t => formatTargetBlock(t, nodes)).join('\n')
    const prefix = multi ? `#${i + 1} ` : ''
    return `${prefix}${block}\n评注：${ann.note}`
  })
  return `${head}\n${body.join('\n')}`
}
