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
}

export interface PanelDefinition {
  $schema: 'openloop.panel/v1'
  /** kebab-case；同 id 再调用 = 更新该面板 */
  id: string
  title: string                 // ≤ 120 字符
  description?: string          // ≤ 360 字符
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
