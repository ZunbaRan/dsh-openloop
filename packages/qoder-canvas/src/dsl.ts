/**
 * 画布 DSL：受约束组件树 JSON 的 schema + fail-closed 校验（设计文档 §3.1/§3.2）。
 *
 * 原则（承 openloop 契约哲学）：
 * - Agent 输出不可信任：一切进画布的东西过白名单 + 量级上限
 * - 校验失败 fail-closed，错误消息面向 Agent 可自修正（指出字段/原因/期望）
 * - 节点集开放注册（NODE_REGISTRY）：v0.1 注册仪表盘 10 节点，
 *   v0.2+ 增幻灯片等能力 = 新增节点集 + layout preset 的增量扩展
 */
import type { JsonObject } from './types.ts'

// ---- 类型 ----

export type CanvasLayout = 'grid' | 'flow' | 'split-h' | 'split-v'

export interface CanvasNode {
  readonly id: string
  readonly type: string
  readonly props: JsonObject
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
} as const

// ---- 校验 ----

export class CanvasValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CanvasValidationError'
  }
}

function fail(path: string, why: string, expected?: string): never {
  const hint = expected !== undefined ? ` Expected: ${expected}.` : ''
  throw new CanvasValidationError(`canvas document invalid at ${path}: ${why}.${hint} Fix this field and retry.`)
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
  if (typeof v !== 'string') fail(path, 'must be a string', 'string')
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
      if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'must be a finite number', 'number')
      if (rule.min !== undefined && value < rule.min) fail(path, `${value} < min ${rule.min}`)
      if (rule.max !== undefined && value > rule.max) fail(path, `${value} > max ${rule.max}`)
      return
    case 'enum':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (typeof value !== 'string' || !rule.values.includes(value)) fail(path, `must be one of ${rule.values.join('/')}`, rule.values.join(' | '))
      return
    case 'boolean':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (typeof value !== 'boolean') fail(path, 'must be boolean', 'true | false')
      return
    case 'string-array':
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!Array.isArray(value)) fail(path, 'must be an array', 'string[]')
      if (value.length > rule.maxLength) fail(path, `array length ${value.length} exceeds max ${rule.maxLength}`)
      for (let i = 0; i < value.length; i += 1) checkString(`${path}[${i}]`, value[i], rule.itemMaxLength)
      return
    case 'kv-pairs': {
      if (value === undefined) { if (rule.required === true) fail(path, 'is required'); return }
      if (!isPlainObject(value)) fail(path, 'must be an object', '{ key: value }')
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
      if (!Array.isArray(value)) fail(path, 'must be an array of series', 'series[]')
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
      if (!Array.isArray(value)) fail(path, 'must be an array of rows', 'row[][]')
      if (value.length > LIMITS.maxTableRows) fail(path, `${value.length} rows exceeds max ${LIMITS.maxTableRows}; aggregate the data first`)
      for (let i = 0; i < value.length; i += 1) {
        const row = value[i]
        if (!Array.isArray(row)) fail(`${path}[${i}]`, 'must be an array (one cell per column)')
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
      if (!isPlainObject(value)) fail(path, 'must be a flat object', '{ string|number|boolean }')
      const bytes = byteSize(value)
      if (bytes > rule.maxBytes) fail(path, `size ${bytes}B exceeds max ${rule.maxBytes}B`)
      for (const k of Object.keys(value)) {
        const v = (value as JsonObject)[k]
        if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') fail(`${path}.${k}`, 'must be string/number/boolean (flat object only)')
        if (typeof v === 'string' && v.length > 2000) fail(`${path}.${k}`, 'value exceeds 2000 chars')
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

/** 校验画布 document（fail-closed；抛 CanvasValidationError，消息面向 Agent 自修正） */
export function validateCanvasDocument(value: unknown): CanvasDocument {
  if (!isPlainObject(value)) fail('document', 'must be a JSON object')
  const bytes = byteSize(value)
  if (bytes > LIMITS.maxDocumentBytes) fail('document', `size ${bytes}B exceeds max ${LIMITS.maxDocumentBytes}B; reduce nodes or data volume`)
  const title = value['title']
  if (typeof title !== 'string' || title.length === 0) fail('title', 'must be a non-empty string')
  if (title.length > LIMITS.maxTitleLength) fail('title', `length exceeds max ${LIMITS.maxTitleLength}`)
  const layout = value['layout']
  if (typeof layout !== 'string' || !LAYOUTS.includes(layout as CanvasLayout)) fail('layout', `must be one of ${LAYOUTS.join('/')}`, LAYOUTS.join(' | '))
  const nodes = value['nodes']
  if (!Array.isArray(nodes)) fail('nodes', 'must be an array')
  if (nodes.length === 0) fail('nodes', 'must contain at least 1 node')
  if (nodes.length > LIMITS.maxNodes) fail('nodes', `${nodes.length} nodes exceeds max ${LIMITS.maxNodes}`)
  const seenIds = new Set<string>()
  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i]
    const path = `nodes[${i}]`
    if (!isPlainObject(n)) fail(path, 'must be an object')
    if (byteSize(n) > LIMITS.maxNodeBytes) fail(path, `size exceeds max ${LIMITS.maxNodeBytes}B`)
    const id = n['id']
    if (typeof id !== 'string' || !ID_RE.test(id)) fail(`${path}.id`, 'must match [a-zA-Z0-9_-]{1,32}')
    if (seenIds.has(id)) fail(`${path}.id`, `duplicate node id "${id}"`)
    seenIds.add(id)
    const type = n['type']
    if (typeof type !== 'string') fail(`${path}.type`, 'must be a string')
    const def = NODE_REGISTRY[type]
    if (def === undefined) fail(`${path}.type`, `unknown node type "${type}"`, Object.keys(NODE_REGISTRY).join(' | '))
    const props = n['props']
    if (!isPlainObject(props)) fail(`${path}.props`, 'must be an object')
    for (const [key, rule] of Object.entries(def.props)) {
      checkProp(`${path}.props.${key}`, props[key], rule)
    }
    // link href 白名单（设计文档 §3.1）
    if (type === 'link' && typeof props['href'] === 'string') checkHref(`${path}.props.href`, props['href'])
    // 未知 props 键拒绝（fail-closed：防夹带）
    for (const key of Object.keys(props)) {
      if (!(key in def.props)) fail(`${path}.props.${key}`, `unknown prop for ${type}; allowed: ${Object.keys(def.props).join(', ') || '(none)'}`)
    }
  }
  const edges = value['edges']
  const checkedEdges: { from: string; to: string }[] = []
  if (edges !== undefined) {
    if (!Array.isArray(edges)) fail('edges', 'must be an array')
    if (edges.length > LIMITS.maxEdges) fail('edges', `${edges.length} edges exceeds max ${LIMITS.maxEdges}`)
    for (let i = 0; i < edges.length; i += 1) {
      const e = edges[i]
      if (!isPlainObject(e)) fail(`edges[${i}]`, 'must be { from, to }')
      const from = e['from'], to = e['to']
      if (typeof from !== 'string' || !seenIds.has(from)) fail(`edges[${i}].from`, `must reference an existing node id`)
      if (typeof to !== 'string' || !seenIds.has(to)) fail(`edges[${i}].to`, 'must reference an existing node id')
      checkedEdges.push({ from, to })
    }
  }
  // 未知顶层键拒绝（fail-closed）
  for (const key of Object.keys(value)) {
    if (key !== 'title' && key !== 'layout' && key !== 'nodes' && key !== 'edges') fail(key, 'unknown top-level field', 'title | layout | nodes | edges')
  }
  return { title, layout: layout as CanvasLayout, nodes: nodes as CanvasNode[], edges: checkedEdges }
}
