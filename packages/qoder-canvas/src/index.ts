/**
 * @openloop/dsh-qoder-canvas host 半（M1）。
 *
 * canvas 工具：Agent 生成/续编画布 → 校验 → 不可变快照 → presentationMeta 内嵌全量。
 * 设计依据：docs/QODER_CANVAS_DESIGN.md v0.2 §3.2/§4.2。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { CanvasValidationError, generateCanvasId, isValidCanvasId, validateCanvasDocument, type CanvasSnapshot } from './dsl.ts'
import { CanvasStorage, workspaceKeyOf, type FsLike } from './storage.ts'

export * from './dsl.ts'
export * from './storage.ts'

export const name = 'openloop-qoder-canvas'
export const inject = ['tools', 'fs']

interface CanvasArgs {
  document?: unknown
  canvasId?: unknown
  load?: unknown
  list?: unknown
}

function argsOf(args: CanvasArgs): { document: unknown; canvasId: string | undefined; load: string | undefined; list: boolean } {
  const canvasId = typeof args.canvasId === 'string' && args.canvasId.length > 0 ? args.canvasId : undefined
  const load = typeof args.load === 'string' && args.load.length > 0 ? args.load : undefined
  const list = args.list === true
  return { document: args.document, canvasId, load, list }
}

/** execute 内构造 storage（对齐 panels/artifact 模式：ctx 断言取 fs + ctx.get('sandboxPolicy')） */
function storageOf(ctx: Context, exec: { agent?: { session?: unknown } | null; signal?: unknown }): CanvasStorage {
  const agent = exec.agent
  const session = agent?.session as { header?: { cwd?: unknown } } | undefined
  const cwdRaw = session?.header?.cwd
  const cwd = typeof cwdRaw === 'string' ? cwdRaw : undefined
  const policy = (ctx as unknown as { get?: (name: string) => { resolve(input: unknown): unknown } | undefined }).get?.('sandboxPolicy')?.resolve({ ...(agent ? { session: agent.session } : {}) })
  const fs = (ctx as unknown as { fs: FsLike }).fs
  return new CanvasStorage({ fs, policy, workspaceKey: workspaceKeyOf(cwd) })
}

export function apply(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'canvas',
    description: 'Render a visual canvas panel (dashboard-style layout of stat cards, charts, tables, callouts, action buttons) in the conversation. Use for: analysis reports, deployment/QA dashboards, structured findings. Iterate the same canvas by passing canvasId from the previous result. Prefer this over raw HTML for structured data views; prefer show_widget for tiny single-metric cards.',
    parameters: {
      document: { type: 'json', description: 'REQUIRED (unless list=true). Canvas document — ALL fields verified strictly, extra props are REJECTED. Shape: { "title": string (REQUIRED, non-empty, ≤120 chars — the canvas heading; never omit it), "layout": "grid"|"flow"|"split-h"|"split-v" (REQUIRED), "nodes": array (REQUIRED, 1-32 items, each { "id": [a-zA-Z0-9_-]{1,32} unique, "type": one of the 10 below, "props": EXACTLY the listed fields — no others }), "edges": optional array of { from, to } referencing node ids }. NODE TYPES with exact allowed props — stat-card: { label*: string≤60, value*: string≤40, delta?: number, deltaLabel?: string≤20, tone?: "default"|"success"|"warn"|"error"|"info" }; chart: { chart*: "line"|"bar"|"pie"|"area", series*: array≤8 of { name: string≤60, points: array≤200 of { x: number|string, y: number } }, title?: string≤120 }; table: { columns*: string[]≤12 (each ≤40 chars), rows*: array≤100 of arrays (cells: string≤300/number/boolean/null), title?: string≤120 }; key-value: { pairs*: object ≤16 of key(≤60)→string value(≤200), title?: string≤120 }; markdown: { text*: string≤8000 — supports # headings, - lists, **bold**, `code` only, no HTML }; callout: { text*: string≤2000, tone?: "info"|"success"|"warn"|"error", title?: string≤120 }; section: { title*: string≤120 }; action: { label*: string≤60, intent*: string≤120, context?: flat object ≤4KB of string/number/boolean values }; link: { label*: string≤120, href*: "http(s)://…" only }; panel: {} (placeholder). (* = required). Limits: whole document ≤256KB. Example: { "title": "Deploys", "layout": "grid", "nodes": [{ "id": "n1", "type": "stat-card", "props": { "label": "Deploys 24h", "value": "142", "delta": 12, "tone": "success" } }, { "id": "n2", "type": "chart", "props": { "chart": "line", "series": [{ "name": "ok", "points": [{ "x": 1, "y": 8 }] }] } }] }' },
      canvasId: { type: 'string', description: 'Existing canvas id (cv_xxxxxxxx) to iterate; omit to create new.' },
      load: { type: 'string', description: 'Load an existing canvas by id as the base, then apply document on top (iterate continuation).' },
      list: { type: 'boolean', description: 'List existing canvases in this workspace (id/title/revision).' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
      presentationMeta: (_args, value) => {
        const v = value as { snapshot?: unknown } | undefined
        const snap = v?.snapshot
        if (snap === undefined) return {} as never
        return snap as never
      },
    },
    async execute(args, exec) {
      const { document, canvasId, load, list } = argsOf(args as CanvasArgs)
      const storage = storageOf(ctx, exec)
      // list：纯文本清单，无 meta 无卡片
      if (list) {
        const items = await storage.list()
        if (items.length === 0) return { text: 'No canvases in this workspace yet. Create one by calling canvas with a document.' }
        return { text: items.map((i: { canvasId: string; revision: number; title: string }) => `${i.canvasId} (r${i.revision}) — ${i.title}`).join('\n') }
      }
      // canvasId / load 校验
      const targetId = canvasId ?? load
      if (targetId !== undefined && !isValidCanvasId(targetId)) {
        return { __error: `canvasId "${targetId}" is malformed; expected cv_ + 8 chars (e.g. cv_7f3k2a9q). Use the exact id from the previous canvas result.` }
      }
      // 续编：读旧快照定基准 revision
      let baseRevision = 0
      if (targetId !== undefined) {
        const existing = await storage.latest(targetId)
        if (existing === null) {
          return { __error: `Canvas ${targetId} does not exist in this workspace. Call canvas with only a document to create a new one, or use list to see existing ids.` }
        }
        baseRevision = existing.revision
      }
      // document 校验（fail-closed）
      if (document === undefined) {
        return { __error: 'document is required unless using list. Provide { title, layout, nodes }.' }
      }
      let validated
      try {
        validated = validateCanvasDocument(document)
      } catch (error) {
        if (error instanceof CanvasValidationError) return { __error: error.message }
        return { __error: `canvas document validation failed: ${String(error)}` }
      }
      const finalId = targetId ?? generateCanvasId()
      const revision = baseRevision + 1
      const snapshot: CanvasSnapshot = { kind: 'qoder-canvas', version: 1, canvasId: finalId, revision, canvas: validated }
      try {
        await storage.save(snapshot, exec.signal)
      } catch (error) {
        // 存储失败不阻断渲染（meta 内嵌快照，卡片仍可用）——但日志明示
        ctx.logger?.warn?.(`qoder-canvas storage save failed: ${String(error)}`)
      }
      // JsonValue 兼容：snapshot 整体作为 meta 载荷（presentationMeta 通道直通）
      return JSON.parse(JSON.stringify({ snapshot })) as unknown as Record<string, never>
    },
    presentCall: () => ({ card: 'generic', title: 'Canvas · rendering', kind: 'other' }),
    presentResult(_args, result) {
      if (result.isError) return undefined
      const meta = result.meta as { snapshot?: { canvas?: { title?: unknown } } } | undefined
      const title = meta?.snapshot?.canvas?.title
      return { card: 'generic', title: typeof title === 'string' && title.length > 0 ? title : 'Canvas' }
    },
  }) as never)
}
