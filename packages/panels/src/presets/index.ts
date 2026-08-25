/**
 * 预设组件库 registry（§6）。
 * kind → { schema, validate, Render }；kind 与 contract.ts PresetKind 一致。
 * 批次 1（六个数据/反馈件）+ 批次 2（排版 7 + 容器 6）已实现；未实现 kind 的 getPreset 返回 undefined（HostLane 降级占位）。
 */
import type { ComponentType } from 'react'
import type { JsonObject, PresetKind } from '../contract.ts'
import { accordionPreset } from './accordion/index.ts'
import { apiCredentialsPreset } from './api-credentials/index.ts'
import { avatarPreset } from './avatar/index.ts'
import { badgePreset } from './badge/index.ts'
import { calloutPreset } from './callout/index.ts'
import { cardPreset } from './card/index.ts'
import { chartPreset } from './chart/index.ts'
import { comparisonPreset } from './comparison/index.ts'
import { dataTablePreset } from './data-table/index.ts'
import { dbBrowserPreset } from './db-browser/index.ts'
import { dividerPreset } from './divider/index.ts'
import { flowPreset } from './flow/index.ts'
import { funnelPreset } from './funnel/index.ts'
import { gaugePreset } from './gauge/index.ts'
import { gridPreset } from './grid/index.ts'
import { headingPreset } from './heading/index.ts'
import { heatmapPreset } from './heatmap/index.ts'
import { markdownPreset } from './markdown/index.ts'
import { mcpStatusPreset } from './mcp-status/index.ts'
import { metricGridPreset } from './metric-grid/index.ts'
import { pbStatsPreset } from './pb-stats/index.ts'
import { pluginRegistryPreset } from './plugin-registry/index.ts'
import { progressPreset } from './progress/index.ts'
import { rowPreset } from './row/index.ts'
import { sectionPreset } from './section/index.ts'
import { sessionsStatsPreset } from './sessions-stats/index.ts'
import { sparklinePreset } from './sparkline/index.ts'
import { splitPreset } from './split/index.ts'
import { stackPreset } from './stack/index.ts'
import { storageUsagePreset } from './storage-usage/index.ts'
import { tagPreset } from './tag/index.ts'
import { textPreset } from './text/index.ts'
import { timelinePreset } from './timeline/index.ts'
import type { PresetError, PresetValidation } from './common.ts'

/** Render 统一入参：已通过 validate 的 props（JsonObject 形态） */
export interface PresetRenderProps {
  props: JsonObject
}

export interface PresetModule {
  kind: PresetKind
  /** props JSON Schema（bounds：数量/长度/枚举上限） */
  schema: object
  /** fail-closed 校验；错误消息面向 Agent 可自修正 */
  validate: (props: unknown) => PresetValidation
  /** 渲染器：样式 100% 来自 var(--openloop-*) */
  Render: ComponentType<PresetRenderProps>
}

export type { PresetError, PresetValidation } from './common.ts'

const registry: Readonly<Partial<Record<PresetKind, PresetModule>>> = {
  // 批 1：数据展示 / 反馈交互
  'metric-grid': metricGridPreset,
  'data-table': dataTablePreset,
  progress: progressPreset,
  sparkline: sparklinePreset,
  callout: calloutPreset,
  accordion: accordionPreset,
  // 批 3：图表族 5（chart 多 variant + sparkline + gauge + funnel + heatmap）
  chart: chartPreset,
  gauge: gaugePreset,
  funnel: funnelPreset,
  heatmap: heatmapPreset,
  // 批 2：排版基础 7
  text: textPreset,
  markdown: markdownPreset,
  heading: headingPreset,
  badge: badgePreset,
  tag: tagPreset,
  divider: dividerPreset,
  avatar: avatarPreset,
  // 批 2：容器布局 6
  card: cardPreset,
  section: sectionPreset,
  stack: stackPreset,
  grid: gridPreset,
  row: rowPreset,
  split: splitPreset,
  // 批 4：结构化文档 3（flow / timeline / comparison，移植自 declarative 包）
  flow: flowPreset,
  timeline: timelinePreset,
  comparison: comparisonPreset,
  // 批 5：本地后端预设族 7（数据经 /openloop/app/* 同源 fetch 或 boot 载荷）
  'pb-stats': pbStatsPreset,
  'db-browser': dbBrowserPreset,
  'storage-usage': storageUsagePreset,
  'api-credentials': apiCredentialsPreset,
  'sessions-stats': sessionsStatsPreset,
  'mcp-status': mcpStatusPreset,
  'plugin-registry': pluginRegistryPreset,
}

/** 取预设模块；未实现/未知 kind 返回 undefined */
export function getPreset(kind: PresetKind): PresetModule | undefined {
  return registry[kind]
}

/** 已注册的全部预设 kind（批 1 + 批 2 + 批 3 + 批 4，共 26 个） */
export function allPresetKinds(): PresetKind[] {
  return (Object.keys(registry) as PresetKind[]).sort()
}
