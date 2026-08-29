/**
 * panel 工具定义（IMPL_NOTES §2 模式）。
 * execute 先做 §5.4 全量校验（fail-closed），再组装 PanelMeta（§5.3）
 * 经 output.presentationMeta 返回；client 端以 tool 名 'panel' 挂载渲染。
 */
import { defineTool, type ToolDefinition } from '@deepseek-ai/dsh-tools'
import type { PanelDefinition, PanelMeta } from './contract.ts'
import { resolvePanelData } from './datasource.ts'
import { validatePanel } from './validation.ts'

/**
 * dsh 输出契约要求返回 lossless JSON（JsonValue）。
 * PanelDefinition 是 interface（无 index signature），不能隐式赋给
 * `{ [key: string]: JsonValue }`，故此处定义等价结构并在运行时经
 * validatePanel 校验后显式收敛。
 */
type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

function toJsonValue(value: unknown): JsonValue {
  return value as unknown as JsonValue
}

/** 工具名常量；与 client 注入 key（src/client/index.tsx）逐字一致 */
export const PANEL_TOOL = 'panel'

/** 工具参数 schema（PanelDefinition 形状；persist 为 §11 持久化开关；load 为按 id 唤起已存档面板） */
export const PANEL_PARAMETERS = {
  panel: {
    // 双通道（2026-08-22 真机事故修复）：object 分支给模型结构引导（主路径）；
    // string 分支 + execute 内 coercePanelArg 解析 = 模型仍字符串化时的兜底容错。
    // 细节校验始终由 validatePanel 承担。
    oneOf: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          $schema: { type: 'string', const: 'openloop.panel/v1' },
          id: { type: 'string', required: true, description: 'kebab-case，面板内唯一；同 id 再调用 = 更新' },
          title: { type: 'string', required: true },
          description: { type: 'string' },
          layout: { type: 'object', additionalProperties: true },
          widgets: { type: 'array', required: true, description: '1–24 个 WidgetUnit' },
          persist: { type: 'boolean' },
        },
      },
      { type: 'string' },
    ],
    description: 'A PanelDefinition (openloop.panel/v1). Strongly prefer passing the JSON object itself; a stringified JSON text is also accepted and will be parsed. Omit when using load or panelFile.',
  },
  panelFile: {
    type: 'string',
    description: 'Read the PanelDefinition from a JSON file in the workspace (recommended for large panels: write the JSON to e.g. "panels/<id>.json" with the write tool first — single-layer encoding avoids string-escape corruption — then pass its path here). Priority: panel > panelFile > load. To modify, read the file, edit, write back, and call again.',
  },
  load: {
    type: 'string',
    description: 'Recall a previously persisted panel by its id (saved earlier with persist: true). When given without panel, the stored PanelDefinition is loaded, re-validated and re-rendered with fresh data.',
  },
  persist: {
    type: 'boolean',
    description: 'Write the panel to disk when true (persisted panels can be recalled later via the load parameter).',
  },
} as const

/**
 * panel 参数的字符串容错（真机教训：模型可能把对象序列化成 JSON 文本）。
 * 可解析 → 返回对象；不可解析/非对象 → 抛出面向 Agent 的可自修正错误。
 */
export function coercePanelArg(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) return parsed
    throw new Error('panel string parsed to a non-object JSON value. Pass the PanelDefinition as a JSON object directly — do not stringify it.')
  } catch (error) {
    if (error instanceof SyntaxError) {
      // 字符串化且语法错误（真机实例：尾部多一个 }）——把 parse 细节带给模型便于定点修正
      throw new Error(`panel was received as a string with malformed JSON (${error.message}). Fix the JSON syntax, or better: pass the PanelDefinition as an object directly.`)
    }
    throw error
  }
}

/** 输出 schema：与 §5.3 PanelMeta 逐字段对齐（resolved 为 server 解析的数据快照，无 api widget 时为空对象） */
export const PANEL_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    version: { type: 'integer', const: 1, required: true },
    panel: { type: 'json', required: true },
    resolved: { type: 'json', required: true },
    resolvedAt: { type: 'string', required: true },
  },
} as const

/** 构建 panel 工具定义；由 src/index.ts 注册进 ctx.tools */
export function definePanelTool(): ToolDefinition {
  return defineTool({
    name: PANEL_TOOL,
    description: 'Render a reusable dashboard panel from preset widgets, custom sandbox code, or external packs. Presets cover metrics, charts (bar/line/donut/gauge/funnel/heatmap), tables, flow/timeline/comparison diagrams, callouts, and layout containers. Widgets can bind live API data (https JSON, server-side fetch, auto refresh) and the panel can persist for later recall. Each widget is { id, source } where source is one of { type: "preset", kind, props } | { type: "custom", code } | { type: "pack", pack, component, props }; the full contract is validated and fails closed. Routing: choose panel for dashboards, monitoring, multi-widget summaries, or a single flow/timeline/comparison diagram (preset kinds exist); choose show_widget for one small temporary card; choose html_artifact for a free-form full HTML page. Load the openloop-panels-widget-authoring skill before the first call.',
    parameters: PANEL_PARAMETERS,
    output: {
      schema: PANEL_OUTPUT_SCHEMA,
      render: (_args, value) => {
        const panel = value.panel as unknown as PanelDefinition
        return [{ type: 'text', text: `Rendered panel: ${panel.title} (${panel.widgets.length} widgets).` }]
      },
      presentationMeta: (_args, value) => {
        // PanelMeta（§5.3）：client 端 toolview 的渲染入口
        const panel = value.panel as unknown as PanelDefinition
        return { kind: 'openloop.panel', version: 1, panel: toJsonValue(panel), resolved: toJsonValue(value.resolved), resolvedAt: value.resolvedAt }
      },
    },
    async execute(args, exec) {
      // 字符串容错（真机教训：type 不明的参数会被模型字符串化）——先归一为对象
      const panelArg = coercePanelArg(args.panel)
      // load/panelFile 唤起：panel 缺省时由 index.ts 包装层从存档/文件注入；
      // 直接调用（单测/未接线场景）下没有注入方，fail-closed 拒绝并指明三条路
      if (panelArg === undefined || panelArg === null) {
        const panelFile = args.panelFile
        const load = args.load
        throw new Error(
          typeof panelFile === 'string' && panelFile.length > 0
            ? `panelFile "${panelFile}" could not be read (file missing, persistence unavailable, or invalid JSON). Write the PanelDefinition JSON to a workspace file with the write tool, then pass its path via panelFile.`
            : typeof load === 'string' && load.length > 0
              ? `panel "${load}" could not be loaded from the store (not found or persistence unavailable). Pass a full PanelDefinition, or persist it first with persist: true.`
              : 'panel is required: pass a full PanelDefinition object (or panelFile: "<path>" for a JSON file written via the write tool, or load: "<id>" to recall a persisted panel).',
        )
      }
      // fail-closed：参数在 execute 内做全量校验（§5.4），失败即拒绝
      validatePanel(panelArg)
      const panel = panelArg as PanelDefinition
      // §10 数据对接：api widget 并行解析填充 resolved（无 api widget 时保持空对象）；
      // 单个 api 失败写入 { __error } 由渲染端处理，不拖垮面板。
      const resolved = await resolvePanelData(panel, { signal: exec.signal })
      const meta: PanelMeta = {
        kind: 'openloop.panel',
        version: 1,
        panel,
        resolved,
        resolvedAt: new Date().toISOString(),
      }
      return {
        version: 1 as const,
        panel: toJsonValue(meta.panel),
        resolved: toJsonValue(meta.resolved),
        resolvedAt: meta.resolvedAt,
      }
    },
    presentCall: () => ({ card: 'generic', title: 'OpenLoop Panel · building', kind: 'other' }),
    presentResult(_args, result) {
      if (result.isError) return undefined
      const meta = result.meta as { panel?: { title?: unknown } } | undefined
      return { card: 'generic', title: typeof meta?.panel?.title === 'string' ? meta.panel.title : 'OpenLoop Panel' }
    },
  })
}
