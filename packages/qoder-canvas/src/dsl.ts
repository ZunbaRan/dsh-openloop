/**
 * 画布 DSL：受约束组件树 JSON 的 schema + fail-closed 校验（设计文档 §3.1/§3.2）。
 *
 * 原则（承 openloop 契约哲学）：
 * - Agent 输出不可信任：一切进画布的东西过白名单 + 量级上限
 * - 校验失败 fail-closed，错误消息面向 Agent 可自修正（指出字段/原因/期望）
 * - 节点集开放注册（NODE_REGISTRY）：v0.1 仪表盘 10 节点，
 *   v0.11 增设计原语 4 节点（box/text/icon/divider，可嵌套）——DSL 复刻
 *   baoyu-design：Agent 写结构化设计 JSON，我们的组件生成主 document DOM
 */
import type { JsonObject } from './types.ts'
import { ANIMATIONS, ICONS, checkStyleValue } from './design-system.ts'

// ---- 类型 ----

export type CanvasLayout = 'grid' | 'flow' | 'split-h' | 'split-v'

export interface CanvasNode {
  readonly id: string
  readonly type: string
  readonly props: JsonObject
  /** 0.11 嵌套：仅设计原语节点（box）支持 children（递归 CanvasNode） */
  readonly children?: readonly CanvasNode[]
}

export interface CanvasDocument {
  readonly title: string
  readonly layout: CanvasLayout
  readonly nodes: readonly CanvasNode[]
  readonly edges: readonly { from: string; to: string }[]
}

export interface CanvasSnapshot {
  readonly kind: 'qoder-canvas'
  readonly version: 1
  readonly canvasId: string
  readonly revision: number
  readonly canvas: CanvasDocument
}

// ---- 节点注册表（开放注册） ----

export type NodePropRule =
  | { readonly kind: 'string'; readonly maxLength: number; readonly required?: boolean }
  | { readonly kind: 'number'; readonly min?: number; readonly max?: number; readonly required?: boolean }
  | { readonly kind: 'enum'; readonly values: readonly string[]; readonly required?: boolean }
  | { readonly kind: 'boolean'; readonly required?: boolean }
  | { readonly kind: 'string-array'; readonly maxLength: number; readonly itemMaxLength: number; readonly required?: boolean }
  | { readonly kind: 'kv-pairs'; readonly maxPairs: number; readonly keyMaxLength: number; readonly valueMaxLength: number; readonly required?: boolean }
  | { readonly kind: 'chart-series'; readonly required?: boolean }
  | { readonly kind: 'table-data'; readonly required?: boolean }
  | { readonly kind: 'context-object'; readonly maxBytes: number; readonly required?: boolean }
  /** 0.11 设计原语：style 白名单对象（design-system.ts 单一事实源） */
  | { readonly kind: 'style'; readonly maxProps: number; readonly required?: boolean }
  /** 0.11 设计原语：动画配置（name 枚举 + duration/delay） */
  | { readonly kind: 'animation'; readonly required?: boolean }

export interface NodeDefinition {
  readonly type: string
  readonly description: string
  readonly props: Readonly<Record<string, NodePropRule>>
}

/** v0.1 仪表盘节点集（10 节点） */
export const NODE_REGISTRY: Readonly<Record<string, NodeDefinition>> = {
  panel: { type: 'panel', description: '容器面板（嵌套子节点，v0.1 不支持嵌套，保留类型占位）', props: {} },
  section: { type: 'section', description: '带标题分组', props: { title: { kind: 'string', maxLength: 120, required: true } } },
  'stat-card': { type: 'stat-card', description: '统计卡：标签/值/变化量', props: { label: { kind: 'string', maxLength: 60, required: true }, value: { kind: 'string', maxLength: 40, required: true }, delta: { kind: 'number', min: -1e12, max: 1e12 }, deltaLabel: { kind: 'string', maxLength: 20 }, tone: { kind: 'enum', values: ['default', 'success', 'warn', 'error', 'info'] } } },
  chart: { type: 'chart', description: '图表（line/bar/pie/area）', props: { chart: { kind: 'enum', values: ['line', 'bar', 'pie', 'area'], required: true }, title: { kind: 'string', maxLength: 120 }, series: { kind: 'chart-series', required: true } } },
  table: { type: 'table', description: '数据表（≤100 行）', props: { title: { kind: 'string', maxLength: 120 }, columns: { kind: 'string-array', maxLength: 12, itemMaxLength: 40, required: true }, rows: { kind: 'table-data', required: true } } },
  'key-value': { type: 'key-value', description: '键值对列表', props: { title: { kind: 'string', maxLength: 120 }, pairs: { kind: 'kv-pairs', maxPairs: 16, keyMaxLength: 60, valueMaxLength: 200, required: true } } },
  markdown: { type: 'markdown', description: '极简 markdown 文本（标题/列表/加粗/代码，无 HTML）', props: { text: { kind: 'string', maxLength: 8000, required: true } } },
  callout: { type: 'callout', description: '高亮提示框', props: { tone: { kind: 'enum', values: ['info', 'success', 'warn', 'error'] }, title: { kind: 'string', maxLength: 120 }, text: { kind: 'string', maxLength: 2000, required: true } } },
  action: { type: 'action', description: '行动按钮：点击把 intent+context 编排为草稿注入输入框', props: { label: { kind: 'string', maxLength: 60, required: true }, intent: { kind: 'string', maxLength: 120, required: true }, context: { kind: 'context-object', maxBytes: 4096 } } },
  link: { type: 'link', description: '外链（仅 http/https）', props: { label: { kind: 'string', maxLength: 120, required: true }, href: { kind: 'string', maxLength: 2048, required: true } } },
  // ---- v0.11 设计原语（DSL 复刻 baoyu-design：结构化设计 JSON → 我们的 DOM）----
  box: { type: 'box', description: '设计容器（可嵌套 children ≤6 层）：布局/间距/背景/边框/阴影/动画', props: { style: { kind: 'style', maxProps: 16 }, animation: { kind: 'animation' } } },
  text: { type: 'text', description: '设计文本：字号/字重/颜色/对齐/动画', props: { content: { kind: 'string', maxLength: 500, required: true }, style: { kind: 'style', maxProps: 12 }, animation: { kind: 'animation' } } },
  icon: { type: 'icon', description: '内置 SVG 图标（lucide 风格白名单）', props: { name: { kind: 'enum', values: [...ICONS], required: true }, size: { kind: 'number', min: 12, max: 96 }, style: { kind: 'style', maxProps: 4 } } },
  divider: { type: 'divider', description: '分隔线', props: { style: { kind: 'style', maxProps: 6 } } },
}

export const LAYOUTS: readonly CanvasLayout[] = ['grid', 'flow', 'split-h', 'split-v']

// ---- 量级上限（设计文档 §3.1 安全规格表） ----

export const LIMITS = {
  maxNodes: 32,
  maxDocumentBytes: 256 * 1024,
  maxNodeBytes: 16 * 1024,
  maxSeries: 8,
  maxPointsPerSeries: 200,
  maxTableRows: 100,
  maxTableColumns: 12,
  maxTitleLength: 120,
  maxEdges: 64,
  // 0.11 设计原语（嵌套）
  maxDepth: 6, // children 递归深度上限（含顶层）
  maxTotalNodes: 128, // 全画布节点总数（含嵌套子节点）
  maxDesignNodeBytes: 32 * 1024, // 含 children 的设计节点字节上限（高于数据节点 16KB）
} as const

/** 允许 children 的节点类型（仅设计容器） */
const NESTABLE_TYPES: ReadonlySet<string> = new Set(['box'])

// ---- 校验 ----

export class CanvasValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanvasValidationError'
  }
}

/**
 * 错误聚合收集器（0.1.2 真机修复）：一轮校验收集【全部】错误统一报出——
 * 真机教训：单错快抛导致模型 32 次重试才收敛（每轮 10s 只买到一个信息点）。
 * 同一节点超过 3 个错误即截断（防错误风暴）；校验函数照旧提前 return 不抛。
 */
class ErrorCollector {
  private readonly items: string[] = []

  fail(path: string, why: string, expected?: string): void {
    const hint = expected !== undefined ? ` Expected: ${expected}.` : ''
    this.items.push(`${path}: ${why}.${hint}`)
  }

  get size(): number { return this.items.length }

  throwIfAny(max = 3): void {
    if (this.items.length === 0) return
    const shown = this.items.slice(0, max)
    const more = this.items.length > max ? ` (+${this.items.length - max} more — fix the listed ones and re-run; remaining errors will be reported next round)` : ''
    throw new CanvasValidationError(`canvas document invalid (${this.items.length} error${this.items.length > 1 ? 's' : ''}):\n${shown.map(s => `  - ${s}`).join('\n')}${more}\nFix ALL listed fields and retry.`)
  }
}

/** 当前校验回合的收集器（validateCanvasDocument 每次调用重建） */
let collector: ErrorCollector | null = null

function fail(path: string, why: string, expected?: string): void {
  if (collector !== null) collector.fail(path, why, expected)
}

const ID_RE = /^[a-zA-Z0-9_-]{1,32}$/
const CANVAS_ID_RE = /^cv_[a-z0-9]{8}$/

export function isValidCanvasId(id: string): boolean {
  return CANVAS_ID_RE.test(id)
}

/** 生成 canvasId：cv_ + 8 位 base32（host 专用） */
export function generateCanvasId(rand: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = 'cv_'
  for (let i = 0; i < 8; i += 1) out += alphabet[Math.floor(rand() * alphabet.length)]
  return out
}

function byteSize(value: unknown): number {
  return JSON.stringify(value)?.length ?? 0
}

function isPlainObject(v: unknown): v is JsonObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function checkString(path: string, v: unknown, maxLength: number): string {
  if (typeof v !== 'string') { fail(path, 'must be a string', 'string'); return '' }
  if (v.length > maxLength) fail(path, `length ${v.length} exceeds max ${maxLength}`, `≤ ${maxLength} chars`)
  return v
}

function checkProp(path: string, value: unknown, rule: NodePropRule): void {
  switch (rule.kind) {
    case 'string':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      checkString(path, value, rule.maxLength)
      return
    case 'number':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (typeof value !== 'number' || !Number.isFinite(value)) { fail(path, 'must be a finite number', 'number'); return }
      if (rule.min !== undefined && value < rule.min) fail(path, `${value} < min ${rule.min}`)
      if (rule.max !== undefined && value > rule.max) fail(path, `${value} > max ${rule.max}`)
      return
    case 'enum':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (typeof value !== 'string' || !rule.values.includes(value)) { fail(path, `must be one of ${rule.values.join('/')}`, rule.values.join(' | ')); return }
      return
    case 'boolean':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (typeof value !== 'boolean') { fail(path, 'must be boolean', 'true | false'); return }
      return
    case 'string-array':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!Array.isArray(value)) { fail(path, 'must be an array', 'string[]'); return }
      if (value.length > rule.maxLength) fail(path, `array length ${value.length} exceeds max ${rule.maxLength}`)
      for (let i = 0; i < value.length; i += 1) checkString(`${path}[${i}]`, value[i], rule.itemMaxLength)
      return
    case 'kv-pairs': {
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!isPlainObject(value)) { fail(path, 'must be an object', '{ key: value }'); return }
      const keys = Object.keys(value)
      if (keys.length > rule.maxPairs) fail(path, `${keys.length} pairs exceeds max ${rule.maxPairs}`)
      for (const k of keys) {
        checkString(`${path}.${k} (key)`, k, rule.keyMaxLength)
        checkString(`${path}.${k}`, (value as JsonObject)[k], rule.valueMaxLength)
      }
      return
    }
    case 'chart-series': {
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!Array.isArray(value)) { fail(path, 'must be an array of series', 'series[]'); return }
      if (value.length > LIMITS.maxSeries) fail(path, `${value.length} series exceeds max ${LIMITS.maxSeries}`)
      for (let i = 0; i < value.length; i += 1) {
        const s = value[i]
        if (!isPlainObject(s)) fail(`${path}[${i}]`, 'must be an object', '{ name, points }')
        const name = s['name']
        if (typeof name !== 'string' || name.length > 60) fail(`${path}[${i}].name`, 'must be string ≤ 60')
        const points = s['points']
        if (!Array.isArray(points)) fail(`${path}[${i}].points`, 'must be an array', '{x, y}[]')
        if (points.length > LIMITS.maxPointsPerSeries) fail(`${path}[${i}].points`, `${points.length} points exceeds max ${LIMITS.maxPointsPerSeries}`)
        for (let j = 0; j < points.length; j += 1) {
          const p = points[j]
          if (!isPlainObject(p)) fail(`${path}[${i}].points[${j}]`, 'must be { x, y }')
          const x = p['x'], y = p['y']
          if (typeof x !== 'number' && typeof x !== 'string') fail(`${path}[${i}].points[${j}].x`, 'must be number or string')
          if (typeof y !== 'number' || !Number.isFinite(y)) fail(`${path}[${i}].points[${j}].y`, 'must be a finite number')
        }
      }
      return
    }
    case 'table-data': {
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!Array.isArray(value)) { fail(path, 'must be an array of rows', 'row[][]'); return }
      if (value.length > LIMITS.maxTableRows) fail(path, `${value.length} rows exceeds max ${LIMITS.maxTableRows}; aggregate the data first`)
      for (let i = 0; i < value.length; i += 1) {
        const row = value[i]
        if (!Array.isArray(row)) { fail(`${path}[${i}]`, 'must be an array (one cell per column)'); continue }
        if (row.length > LIMITS.maxTableColumns) fail(`${path}[${i}]`, `${row.length} cells exceeds max ${LIMITS.maxTableColumns}`)
        for (let j = 0; j < row.length; j += 1) {
          const cell = row[j]
          if (cell === null || cell === undefined) continue
          if (typeof cell !== 'string' && typeof cell !== 'number' && typeof cell !== 'boolean') fail(`${path}[${i}][${j}]`, 'must be string/number/boolean/null')
          if (typeof cell === 'string' && cell.length > 300) fail(`${path}[${i}][${j}]`, 'cell text exceeds 300 chars')
        }
      }
      return
    }
    case 'context-object': {
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!isPlainObject(value)) { fail(path, 'must be a flat object', '{ string|number|boolean }'); return }
      const bytes = byteSize(value)
      if (bytes > rule.maxBytes) fail(path, `size ${bytes}B exceeds max ${rule.maxBytes}B`)
      for (const k of Object.keys(value)) {
        const v = (value as JsonObject)[k]
        if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') fail(`${path}.${k}`, 'must be string/number/boolean (flat object only)')
        if (typeof v === 'string' && v.length > 2000) fail(`${path}.${k}`, 'value exceeds 2000 chars')
      }
      return
    }
    case 'style': {
      // 0.11 设计原语：白名单对象（design-system.ts 单一事实源校验）
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!isPlainObject(value)) { fail(path, 'must be an object of whitelisted style properties', '{ color, fontSize, padding, … }'); return }
      const keys = Object.keys(value)
      if (keys.length > rule.maxProps) fail(path, `${keys.length} props exceeds max ${rule.maxProps}`)
      for (const k of keys) {
        const err = checkStyleValue(k, (value as JsonObject)[k])
        if (err !== null) fail(`${path}.${k}`, err)
      }
      return
    }
    case 'animation': {
      // 0.11 设计原语：{ name, duration?, delay? }（name 预定义枚举）
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!isPlainObject(value)) { fail(path, 'must be an object', '{ name: "fade-in"|"slide-up"|…, duration?, delay? }'); return }
      const name = value['name']
      if (typeof name !== 'string' || !(ANIMATIONS as readonly string[]).includes(name)) {
        fail(`${path}.name`, `must be one of ${ANIMATIONS.join('/')}`, ANIMATIONS.join(' | '))
      }
      const duration = value['duration']
      if (duration !== undefined && (typeof duration !== 'number' || duration < 0 || duration > 4000)) fail(`${path}.duration`, 'must be a number in [0, 4000] ms')
      const delay = value['delay']
      if (delay !== undefined && (typeof delay !== 'number' || delay < 0 || delay > 4000)) fail(`${path}.delay`, 'must be a number in [0, 4000] ms')
      for (const k of Object.keys(value)) {
        if (k !== 'name' && k !== 'duration' && k !== 'delay') fail(`${path}.${k}`, `unknown animation field; allowed: name, duration, delay`)
      }
      return
    }
  }
}

function checkHref(path: string, href: string): void {
  const normalized = href.trim().toLowerCase()
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    fail(path, 'href scheme must be http or https', 'https://…')
  }
}

/** 结构性错误（无法继续校验）——抛哨兵异常中断本轮回合，由 validateCanvasDocument 的 finally 统一报错 */
function unreachable(): never {
  throw new CanvasValidationError('__structural__')
}

/** 校验画布 document（fail-closed；错误聚合后统一抛 CanvasValidationError，面向 Agent 自修正） */
export function validateCanvasDocument(value: unknown): CanvasDocument {
  collector = new ErrorCollector()
  try {
    return validateInner(value)
  } catch (error) {
    if (error instanceof CanvasValidationError && error.message === '__structural__') {
      // 结构哨兵：本轮已有收集的错误，直接进 finally 汇总
    } else {
      throw error
    }
    return { title: '', layout: 'grid', nodes: [], edges: [] } // 不会被消费（throwIfAny 必抛）
  } finally {
    try { collector.throwIfAny() } finally { collector = null }
  }
}

function validateInner(value: unknown): CanvasDocument {
  if (!isPlainObject(value)) { fail('document', 'must be a JSON object'); throw unreachable() }
  const bytes = byteSize(value)
  if (bytes > LIMITS.maxDocumentBytes) fail('document', `size ${bytes}B exceeds max ${LIMITS.maxDocumentBytes}B; reduce nodes or data volume`)
  const title = value['title']
  if (typeof title !== 'string' || title.length === 0) fail('title', 'must be a non-empty string')
  else if (title.length > LIMITS.maxTitleLength) fail('title', `length exceeds max ${LIMITS.maxTitleLength}`)
  const layout = value['layout']
  if (typeof layout !== 'string' || !LAYOUTS.includes(layout as CanvasLayout)) fail('layout', `must be one of ${LAYOUTS.join('/')}`, LAYOUTS.join(' | '))
  const nodes = value['nodes']
  if (!Array.isArray(nodes)) { fail('nodes', 'must be an array'); throw unreachable() }
  if (nodes.length === 0) fail('nodes', 'must contain at least 1 node')
  if (nodes.length > LIMITS.maxNodes) fail('nodes', `${nodes.length} nodes exceeds max ${LIMITS.maxNodes}`)
  const seenIds = new Set<string>()
  let totalNodes = 0
  /** 0.11 递归节点校验（设计原语嵌套）：深度/总数守卫 + id 全局查重 */
  const validateNode = (n: unknown, path: string, depth: number): void => {
    if (!isPlainObject(n)) { fail(path, 'must be an object'); return }
    totalNodes += 1
    if (totalNodes > LIMITS.maxTotalNodes) { fail(path, `total node count exceeds max ${LIMITS.maxTotalNodes} (including nested children)`); return }
    const byteLimit = NESTABLE_TYPES.has(String(n['type'])) ? LIMITS.maxDesignNodeBytes : LIMITS.maxNodeBytes
    if (byteSize(n) > byteLimit) fail(path, `size exceeds max ${byteLimit}B`)
    const id = n['id']
    if (typeof id !== 'string' || !ID_RE.test(id)) fail(`${path}.id`, 'must match [a-zA-Z0-9_-]{1,32}')
    else if (seenIds.has(id)) fail(`${path}.id`, `duplicate node id "${id}" (ids must be unique across the whole canvas including nested children)`)
    else seenIds.add(id)
    const type = n['type']
    if (typeof type !== 'string') { fail(`${path}.type`, 'must be a string'); return }
    const def = NODE_REGISTRY[type]
    if (def === undefined) { fail(`${path}.type`, `unknown node type "${type}"`, Object.keys(NODE_REGISTRY).join(' | ')); return }
    const props = n['props']
    if (!isPlainObject(props)) { fail(`${path}.props`, 'must be an object'); return }
    for (const [key, rule] of Object.entries(def.props)) {
      checkProp(`${path}.props.${key}`, props[key], rule)
    }
    // link href 白名单（设计文档 §3.1）
    if (type === 'link' && typeof props['href'] === 'string') checkHref(`${path}.props.href`, props['href'])
    // 未知 props 键拒绝（fail-closed：防夹带）
    for (const key of Object.keys(props)) {
      if (!(key in def.props)) fail(`${path}.props.${key}`, `unknown prop for ${type}; allowed: ${Object.keys(def.props).join(', ') || '(none)'}`)
    }
    // 嵌套 children（仅设计容器；fail-closed）
    const children = n['children']
    if (children !== undefined) {
      if (!NESTABLE_TYPES.has(type)) { fail(`${path}.children`, `nodes of type "${type}" do not support children; only ${[...NESTABLE_TYPES].join('/')} can nest`); return }
      if (!Array.isArray(children)) { fail(`${path}.children`, 'must be an array of nodes'); return }
      if (children.length > LIMITS.maxNodes) fail(`${path}.children`, `${children.length} children exceeds max ${LIMITS.maxNodes}`)
      if (depth + 1 > LIMITS.maxDepth) fail(`${path}.children`, `nesting depth exceeds max ${LIMITS.maxDepth}`)
      for (let i = 0; i < children.length; i += 1) {
        validateNode(children[i], `${path}.children[${i}]`, depth + 1)
      }
    }
    // 未知节点键拒绝（children/id/type/props 之外）
    for (const key of Object.keys(n)) {
      if (key !== 'id' && key !== 'type' && key !== 'props' && key !== 'children') fail(`${path}.${key}`, `unknown node field; allowed: id, type, props, children`)
    }
  }
  for (let i = 0; i < nodes.length; i += 1) {
    validateNode(nodes[i], `nodes[${i}]`, 1)
  }
  const edges = value['edges']
  const checkedEdges: { from: string; to: string }[] = []
  if (edges !== undefined) {
    if (!Array.isArray(edges)) { fail('edges', 'must be an array'); throw unreachable() }
    if (edges.length > LIMITS.maxEdges) fail('edges', `${edges.length} edges exceeds max ${LIMITS.maxEdges}`)
    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i]
      if (!isPlainObject(e)) { fail(`edges[${i}]`, 'must be { from, to }'); continue }
      const from = e['from'], to = e['to']
      const fromOk = typeof from === 'string' && seenIds.has(from)
      const toOk = typeof to === 'string' && seenIds.has(to)
      if (!fromOk) fail(`edges[${i}].from`, `must reference an existing node id`)
      if (!toOk) fail(`edges[${i}].to`, 'must reference an existing node id')
      if (fromOk && toOk) checkedEdges.push({ from: from as string, to: to as string })
    }
  }
  // 未知顶层键拒绝（fail-closed）
  for (const key of Object.keys(value)) {
    if (key !== 'title' && key !== 'layout' && key !== 'nodes' && key !== 'edges') fail(key, 'unknown top-level field', 'title | layout | nodes | edges')
  }
  return { title: title as string, layout: layout as CanvasLayout, nodes: nodes as CanvasNode[], edges: checkedEdges }
}
