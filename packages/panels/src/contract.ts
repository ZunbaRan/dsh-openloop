/**
 * 数据契约（设计文档 §5，client/server 共享）。
 * 权威定义：字段名 / 默认值 / 注释与 DSH_PANELS_DESIGN.md §5 保持一致。
 */

export type JsonObject = Record<string, unknown>

/** 预设组件 kind，§6 全清单 */
export type PresetKind =
  | 'text' | 'markdown' | 'heading' | 'badge' | 'tag' | 'divider' | 'avatar'
  | 'card' | 'section' | 'stack' | 'grid' | 'row' | 'split' | 'scroll-area'
  | 'metric' | 'metric-grid' | 'data-table' | 'list' | 'key-value' | 'stat'
  | 'rating' | 'empty-state' | 'timeline'
  | 'chart' | 'sparkline' | 'gauge' | 'funnel' | 'heatmap'
  | 'flow' | 'comparison' | 'steps' | 'tree'
  | 'callout' | 'status' | 'progress' | 'skeleton'
  | 'tabs' | 'accordion' | 'pagination' | 'tooltip'
  | 'pb-stats' | 'db-browser' | 'storage-usage' | 'api-credentials' | 'sessions-stats' | 'mcp-status' | 'plugin-registry'
  | 'app-manager' | 'api-usage-monitor' | 'system-overview' | 'event-log' | 'agent-activity'

export type WidgetSource =
  | { type: 'preset'; kind: PresetKind; props: JsonObject }
  | { type: 'pack'; pack: string; component: string; props: JsonObject }
  | { type: 'custom'; code: string }  // JSX 函数组件源码，契约见 §8.3

export type Lane = 'host' | 'sandbox'

export interface WidgetUnit {
  /** 面板内唯一 id，kebab-case */
  id: string
  /** 缺省推导：preset→host；pack→按 manifest.runtime；custom→sandbox */
  lane?: Lane
  source: WidgetSource
  data?: WidgetDataBinding
  refresh?: RefreshPolicy
}

export interface RefreshPolicy {
  /** 面板打开时重新拉取，默认 true（D4 实时语义） */
  onLoad?: boolean
  /** 定时刷新间隔；缺省不定时。最小 10_000 */
  intervalMs?: number
  /** 渲染手动刷新按钮，默认 true（有 api 数据时） */
  manual?: boolean
}

export type WidgetDataSource =
  | { type: 'static'; value: unknown }
  | {
      type: 'api'
      url: string               // 必须 https?://，禁止内网/环回（见 §15）
      method?: 'GET' | 'POST'   // 默认 GET
      query?: Record<string, string>
      body?: unknown
      headers?: Record<string, string>  // 禁止 Authorization 明文；凭据永不过 DSH
      timeoutMs?: number        // 默认 10_000，上限 30_000
    }

export interface WidgetDataBinding {
  source: WidgetDataSource
  /** JSONPath 子集取值路径（v1：仅 a.b[0].c 形态），缺省取整个响应 */
  pick?: string
  /**
   * 参数化取数（联动特性 v1）：url/query/body 中的 `{{paramName}}` 模板变量，
   * 渲染时用关联事件映射来的参数值替换（如 leadId）。未提供参数的变量替换为空串。
   */
  params?: Record<string, string>
}

/**
 * 页面关联（relations）契约 v1（2026-09-02 联动特性）。
 *
 * 面板可声明两类关系：
 * - emits：本面板产生的事件（如列表点行）——payload 模板值支持 `$row.<path>`
 *   / `$panel.<path>` 取自触发上下文（被点行数据 / 面板当前数据）。
 * - consumes：本面板响应的事件——事件 payload 的某字段映射为本面板数据参数，
 *   渲染时经 refresh 端点带参取数（binding.params 声明模板变量）。
 *
 * 事件命名空间：`{app}:{entity}:{action}`（如 my-crm:lead:selected），
 * 与 rid 命名空间（`app:component`）对齐，避免跨 APP 撞名。
 */
export interface PanelEmitsDecl {
  /** 事件名：`{app}:{entity}:{action}` */
  event: string
  /** payload 模板：值支持 `$row.x` / `$panel.x` 引用（其余按字面值下发） */
  payload?: JsonObject
  /** 渲染目标（可选）：显式指向消费方 rid；缺省按事件名推断 `{app}:{entity}-detail` */
  target?: { rid: string }
  /** 事件说明（资源列表展示用，建议中英双语） */
  note?: string
}

export interface PanelConsumesDecl {
  /** 响应的事件名（须与某 emits 方的事件名一致才成对） */
  event: string
  /** 事件 payload 的哪个字段映射为本面板参数（如 leadId） */
  param: string
  /** 参数说明（资源列表展示用） */
  note?: string
}

export interface PanelRelationsDecl {
  /** 本面板触发的事件 */
  emits?: PanelEmitsDecl[]
  /** 本面板响应的事件（事件参数 → 本面板数据参数） */
  consumes?: PanelConsumesDecl[]
}

export interface PanelDefinition {
  $schema: 'openloop.panel/v1'
  /** kebab-case；同 id 再调用 = 更新该面板 */
  id: string
  title: string                 // ≤ 120 字符
  description?: string          // ≤ 360 字符
  /** 页面关联声明（联动特性 v1） */
  relations?: PanelRelationsDecl
  layout?: {
    mode: 'stack' | 'grid'      // 默认 stack
    columns?: 1 | 2 | 3         // grid 时有效，默认 2
  }
  widgets: WidgetUnit[]         // 1–24 个；id 唯一
  persist?: boolean             // true → 写盘（§11）
}

/** 工具返回的 meta（渲染入口） */
export interface PanelMeta {
  kind: 'openloop.panel'
  version: 1
  panel: PanelDefinition
  /** server 解析完成的数据快照：widgetId → data */
  resolved: Record<string, unknown>
  resolvedAt: string            // ISO 时间
}
