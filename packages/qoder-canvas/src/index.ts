/**
 * @openloop/dsh-qoder-canvas host 半（M1）。
 *
 * canvas 工具：Agent 生成/续编画布 → 校验 → 不可变快照 → presentationMeta 内嵌全量。
 * 设计依据：docs/QODER_CANVAS_DESIGN.md v0.2 §3.2/§4.2。
 */
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { CanvasValidationError, generateCanvasId, isValidCanvasId, validateCanvasDocument, type CanvasSnapshot } from './dsl.ts'
import { CanvasStorage, workspaceKeyOf, resolveStorageRoot, type FsLike } from './storage.ts'
import { setupAnnotateAudit } from './annotate.ts'
import { setupCanvasReadEndpoint } from './read.ts'

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

/** 模块级：最近一次写入的 workspaceKey（S4 端点默认 workspace 判定——
 *  工作台与写画布的会话同 cwd，读端点缺省用它定位隔离键） */
let lastWorkspaceKey = '_no-cwd'
/** 诊断：最近一次 save 失败原因（M4 排查用；成功则清空） */
let lastSaveError: string | null = null

/** execute 内构造 storage（对齐 panels/artifact 模式：ctx 断言取 fs + ctx.get('sandboxPolicy')） */
function storageOf(ctx: Context, exec: { agent?: { session?: unknown } | null; signal?: unknown }): CanvasStorage {
  const agent = exec.agent
  const session = agent?.session as { header?: { cwd?: unknown } } | undefined
  const cwdRaw = session?.header?.cwd
  const cwd = typeof cwdRaw === 'string' ? cwdRaw : undefined
  // M4 落盘修复：canvas 是宿主级产物（归 DSH_HOME/data），不属于会话工作区——
  // session policy（workspaceRoot=会话 cwd）必然拒写。落盘用 per-call policy
  // 把 workspaceRoot 定到 DSH_HOME/data（sandbox 白名单按 per-call root 判定）。
  const policy = { mode: 'workspace-write', workspaceRoot: resolveStorageRoot() }
  const fs = (ctx as unknown as { fs: FsLike }).fs
  const wsKey = workspaceKeyOf(cwd)
  lastWorkspaceKey = wsKey
  return new CanvasStorage({ fs, policy, workspaceKey: wsKey })
}

export function apply(ctx: Context): void {
  const originOf = (): string => {
    const origin = (globalThis as unknown as { location?: { origin?: string } }).location?.origin
    return typeof origin === 'string' && origin.length > 0 ? origin : 'http://127.0.0.1:3080'
  }
  // M2 T2.5：标注审计端点（尽力而为；webServer 运行时注入，headless 静默降级）
  setupAnnotateAudit(ctx, {
    origin: originOf,
    writeLog: (line) => {
      try {
        ctx.logger?.info?.(`[annotate] ${line}`)
      } catch { /* 审计尽力而为 */ }
    },
  })
  // S4：画布真身拉取端点（GET /qoder-canvas/canvas/:id；缺省 workspace 用最近写入的隔离键）
  setupCanvasReadEndpoint(ctx, {
    origin: originOf,
    storageFor: (workspaceKey) => new CanvasStorage({ fs: (ctx as unknown as { fs: import('./storage.ts').FsLike }).fs, workspaceKey: workspaceKey === '_no-cwd' ? lastWorkspaceKey : workspaceKey }),
    diag: () => ({ lastSaveError, lastWorkspaceKey }),
  })
  ctx.tools.register(defineTool({
    name: 'canvas',
    description: 'Render a visual canvas — your PRIMARY first-draft output medium (prototypes, plans, structured findings, rich designs). POSITIONING: canvas is an ideal agent-to-user bridge — it carries dense info AND the user annotates it (click/marquee/text-select elements + comments) that flows back to you as structured <target> context (nodes[i] path + full DSL, or HTML source snippets for html nodes); it does NOT replace artifacts (interactive HTML/apps), but it excels at first drafts and iteration: engineering plans, product/UX prototypes, small design prototypes, flow diagrams, PPT-style decks, dashboards, comparison matrices, landing-page-quality designs. MIXED COMPOSITION: use structured node types (stat-card/chart/table/…) for data content; use the html node for rich/free layouts — it renders arbitrary HTML/CSS/JS in a sandboxed iframe with full element-level annotation support (users can click/marquee/text-select INSIDE it; annotated elements come back with their source snippet — locate by text-matching the snippet and re-emit the full source). If a design/PPT/typography skill is available, its HTML output belongs in an html node. When the user message contains a 画布标注 block, they are pointing at specific nodes — edit exactly those (match path/nodes[i] or the snippet) and re-emit the full document with the same canvasId; each call creates a NEW immutable revision (users may revert to older ones). The user\'s current open canvas is referenced in messages as 当前画布 when the canvas dock is open. Prefer this over raw HTML for structured/visual content; prefer show_widget for tiny single-metric cards.',
    parameters: {
      document: { type: 'json', description: 'REQUIRED (unless list=true). Canvas document — ALL fields verified strictly, extra props are REJECTED. Shape: { "title": string (REQUIRED, non-empty, ≤120 chars — the canvas heading; never omit it), "layout": "grid"|"flow"|"split-h"|"split-v" (REQUIRED), "nodes": array (REQUIRED, 1-32 items, each { "id": [a-zA-Z0-9_-]{1,32} unique, "type": one of the 11 below, "props": EXACTLY the listed fields — no others }), "edges": optional array of { from, to } referencing node ids }. NODE TYPES with exact allowed props — stat-card: { label*: string≤60, value*: string≤40, delta?: number, deltaLabel?: string≤20, tone?: "default"|"success"|"warn"|"error"|"info" }; chart: { chart*: "line"|"bar"|"pie"|"area", series*: array≤8 of { name: string≤60, points: array≤200 of { x: number|string, y: number } }, title?: string≤120 }; table: { columns*: string[]≤12 (each ≤40 chars), rows*: array≤100 of arrays (cells: string≤300/number/boolean/null), title?: string≤120 }; key-value: { pairs*: object ≤16 of key(≤60)→string value(≤200), title?: string≤120 }; markdown: { text*: string≤8000 — supports # headings, - lists, **bold**, `code` only, no HTML }; callout: { text*: string≤2000, tone?: "info"|"success"|"warn"|"error", title?: string≤120 }; section: { title*: string≤120 }; action: { label*: string≤60, intent*: string≤120, context?: flat object ≤4KB of string/number/boolean values }; link: { label*: string≤120, href*: "http(s)://…" only }; panel: {} (placeholder); html: { source*: string — complete HTML document or fragment ≤100KB, rendered in a sandboxed iframe WITH element-level annotation (use for rich layouts/design decks/PPT; inline JS allowed; reference external assets by http(s) URL), title?: string≤120 }. (* = required). Limits: whole document ≤256KB (html node source ≤100KB). Example: { "title": "Deploys", "layout": "grid", "nodes": [{ "id": "n1", "type": "stat-card", "props": { "label": "Deploys 24h", "value": "142", "delta": 12, "tone": "success" } }, { "id": "n2", "type": "chart", "props": { "chart": "line", "series": [{ "name": "ok", "points": [{ "x": 1, "y": 8 }] }] } }] }' },
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
        return { text: items.map((i: { canvasId: string; revision: number; title: string; revisions?: readonly number[] }) => {
          const revs = i.revisions !== undefined && i.revisions.length > 1 ? ` [versions: ${i.revisions.join(',')}]` : ''
          return `${i.canvasId} (r${i.revision}) — ${i.title}${revs}`
        }).join('\n') }
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
        lastSaveError = null
      } catch (error) {
        // 存储失败不阻断渲染（meta 内嵌快照，卡片仍可用）——记录诊断 + 日志
        lastSaveError = error instanceof Error ? `${error.message} :: ${String(error.stack ?? '').slice(0, 400)}` : String(error)
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
