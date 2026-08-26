/**
 * 内置 APP 种子（北极星载体之一：APP tab 第一眼看到「这套系统现在有什么能用」）。
 *
 * 启动时幂等写入（已存在即跳过——绝不覆盖用户/agent 的修改）：
 * - APP `openloop`（kind: builtin）：33 个预设组件（与 panels 0.4.0 的 kind 清单对齐）
 *   + 3 条本地后端 API
 * - 每个组件 entry = 极简合法 PanelDefinition（单 widget 平铺形态）——
 *   保证目录里内置条目全部「可固定」（渲染走 dock 内置路径的精美示例，
 *   entry 是同 kind 的合法占位，一致性优先）
 *
 * kind 清单与 panels 的 allPresetKinds() 人工同步（app 不依赖 panels——
 * 预设清单的机器同步在 dock 侧已有 presetSamples 覆盖测试兜底，这里加
 * seed 与 dock PRESET_INFO 的数量一致性由 seed.spec 断言锁定）。
 */
import type { AppFacade } from './facade.ts'

/** 与 panels 0.4.0 allPresetKinds() 对齐（33 个） */
export const BUILTIN_KINDS: readonly string[] = [
  'accordion', 'api-credentials', 'avatar', 'badge', 'callout', 'card', 'chart',
  'comparison', 'data-table', 'db-browser', 'divider', 'flow', 'funnel', 'gauge',
  'grid', 'heading', 'heatmap', 'markdown', 'mcp-status', 'metric-grid',
  'pb-stats', 'plugin-registry', 'progress', 'row', 'section', 'sessions-stats',
  'sparkline', 'split', 'stack', 'storage-usage', 'tag', 'text', 'timeline',
]

const BUILTIN_APIS = [
  { rid: 'openloop:boards', domain: 'local.app', path: '/openloop/app/boards', authType: 'none' as const, summary: '看板集合的 CRUD（dock v2 state 全量存取）' },
  { rid: 'openloop:components', domain: 'local.app', path: '/openloop/app/registry', authType: 'none' as const, summary: 'APP 组件资源注册表（工作台数据源）' },
  { rid: 'openloop:apis', domain: 'local.app', path: '/openloop/app/collections/:name/records', authType: 'none' as const, summary: '管理表受控查询（分页 + 关键词筛选）' },
]

/** 组件名段 → 中文标题（dock PRESET_INFO 同表；两边人工同步） */
const KIND_TITLES: Record<string, string> = {
  accordion: '折叠面板', 'api-credentials': '凭据总览', avatar: '头像', badge: '徽章',
  callout: '提示条', card: '卡片', chart: '图表', comparison: '对比表',
  'data-table': '数据表格', 'db-browser': '数据库浏览', divider: '分隔线', flow: '流程图',
  funnel: '漏斗', gauge: '仪表盘', grid: '网格', heading: '标题',
  heatmap: '热力图', markdown: 'Markdown', 'mcp-status': 'MCP 状态', 'metric-grid': '指标网格',
  'pb-stats': '后端状态', 'plugin-registry': '插件清单', progress: '进度条', row: '横向行',
  section: '分区', 'sessions-stats': '会话统计', sparkline: '迷你走势', split: '分栏',
  stack: '纵向堆叠', 'storage-usage': '存储占用', tag: '标签', text: '文本', timeline: '时间线',
}

/** 极简合法 PanelDefinition（单 widget 平铺 entry）——保证目录条目「可固定」 */
function minimalEntry(kind: string): Record<string, unknown> {
  return {
    $schema: 'openloop.panel/v1',
    id: kind,
    title: KIND_TITLES[kind] ?? kind,
    widgets: [{ id: 'w1', source: { type: 'preset', kind, props: {} } }],
  }
}

/**
 * 幂等 seed：APP 存在即跳过全部（用户/agent 改过 openloop 就不再动）；
 * 不存在则完整写入。返回写入的组件数（0 = 已存在跳过）。
 */
export async function seedBuiltinApp(facade: AppFacade): Promise<{ seeded: boolean; components: number; apis: number }> {
  const existing = await facade.listApps()
  if (existing.some(a => a.name === 'openloop')) {
    return { seeded: false, components: 0, apis: 0 }
  }
  await facade.upsertApp({
    name: 'openloop',
    displayName: 'OpenLoop',
    kind: 'builtin',
    version: '0.4.0',
    description: '系统内置 APP：panels 预设组件与本地后端 API，开箱即用。',
    skill: '内置组件目录。用户要「看板/图表/表格/状态」类可视化时直接 pin 这些组件；agent 用 panel 工具生成更复杂的面板。',
  })
  let components = 0
  for (const kind of BUILTIN_KINDS) {
    await facade.registerComponent('openloop', {
      rid: `openloop:${kind}`,
      kind: 'panel',
      title: KIND_TITLES[kind] ?? kind,
      description: 'panels 预设组件（内置）',
      entry: minimalEntry(kind),
    })
    components++
  }
  let apis = 0
  for (const api of BUILTIN_APIS) {
    await facade.registerApi('openloop', api)
    apis++
  }
  return { seeded: true, components, apis }
}
