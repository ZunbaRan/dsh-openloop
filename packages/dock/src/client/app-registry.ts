/**
 * AppRegistry（M2 内置实现 + M3 门面合并，DOCK_V2_FRONTEND_IMPL §5）：
 * - 内置 APP `openloop`（本地实现，恒有）：components = panels 预设清单（渲染器同源，
 *   可 pin）；M3 起第三方/自研 APP 来自 dsh-app 门面（/openloop/app/registry），
 *   其组件仅浏览（entry 契约待方向 1 协议定义，pinnable=false）
 * - kind 清单运行时读 panels client 的 allPresetKinds()（panels 未装 → panelsMissing，
 *   UI 降级提示）；title/desc/示例 props 是 dock 内建表（tests 锁定）
 * - 命名即寻址：资源 ID = `openloop:<kind>`，与 tile 来源 ID 同命名空间
 */
import type { AppKind } from './badges.tsx'
import { getPanelsClient } from './openloop-clients.ts'
import type { DockTileSource } from './store.ts'

type JsonObject = Record<string, unknown>

export interface AppComponentDescriptor {
  /** `包名:组件名`（= openloop:<kind>），与 tile 来源 ID 同命名空间 */
  id: string
  title: string
  /** v2（2026-08-29）：mcp-app = 方向 1 引用形态（MCP Apps 2.0 资源，渲染时取数） */
  type: 'panel' | 'artifact' | 'mcp-app'
  desc: string
  /** panels PresetKind（示例 props 的构造键；门面组件为空串） */
  kind: string
  /** 内置（有示例 props 可渲染）或门面组件带合法 entry → true；否则「待生成」 */
  pinnable: boolean
  /** 门面组件的 entry（v1 契约：{ panel: PanelDefinition } 内联；mcp-app：{ serverId, toolName, resourceUri } 引用） */
  entry?: unknown
}

export interface AppApiDescriptor {
  id: string
  domain: string
  path: string
  auth: 'key' | 'none'
  status: 'ok' | 'warn'
  summary: string
}

export interface AppDescriptor {
  id: string
  name: string
  kind: AppKind
  version: string
  desc: string
  components: AppComponentDescriptor[]
  apis: AppApiDescriptor[]
}

export interface AppRegistry {
  listApps(): AppDescriptor[]
}

interface PresetInfo {
  title: string
  desc: string
  /** 合法最小示例 props（fail-closed 校验下空 props 大多不可渲染） */
  props: JsonObject
}

const textChild = (id: string, text: string): JsonObject => ({
  id,
  source: { type: 'preset', kind: 'text', props: { text } },
})

/** 26 个已实现预设的展示文案 + 示例 props（与 panels tests/presets 单测样例同源） */
const PRESET_INFO: Record<string, PresetInfo> = {
  accordion: {
    title: '折叠面板',
    desc: '可展开收起的条目组',
    props: { title: '使用说明', items: [{ label: '第一步', content: '克隆仓库' }, { label: '第二步', content: '安装依赖' }] },
  },
  avatar: { title: '头像', desc: '姓名首字圆形徽标', props: { name: '王小明' } },
  badge: { title: '徽章', desc: '短状态标签', props: { label: 'Beta', tone: 'info' } },
  callout: { title: '提示条', desc: '醒目的信息 / 警告', props: { tone: 'info', title: '提示', description: '这是一条提示信息' } },
  card: {
    title: '卡片',
    desc: '带标题的内容分组',
    props: { title: '卡片标题', description: '卡片描述', children: [textChild('w1', '卡片内容')] },
  },
  chart: {
    title: '图表',
    desc: '折线 / 柱状 / 环形',
    props: {
      variant: 'line',
      xKey: 'day',
      data: [{ day: '周一', visits: 3 }, { day: '周二', visits: 5 }, { day: '周三', visits: 4 }],
      series: [{ key: 'visits' }],
      area: true,
    },
  },
  comparison: {
    title: '对比表',
    desc: '多方案逐项对比',
    props: {
      title: '方案对比',
      columns: [{ id: 'basic', title: '基础版', subtitle: '免费' }, { id: 'pro', title: '专业版', subtitle: '¥99/月', recommended: true }],
      rows: [{ label: '存储空间', values: ['5 GB', '100 GB'] }, { label: '团队协作', values: ['不支持', '支持'] }],
    },
  },
  'data-table': {
    title: '数据表格',
    desc: '结构化数据表',
    props: {
      title: '订单明细',
      columns: [{ key: 'name', label: '客户' }, { key: 'amount', label: '金额', format: 'currency-cny' }],
      rows: [{ id: 1, name: '甲公司', amount: 1234.5 }, { id: 2, name: '乙公司', amount: 99 }],
    },
  },
  divider: { title: '分隔线', desc: '段落分隔（可带标签）', props: { label: '里程碑' } },
  flow: {
    title: '流程图',
    desc: '节点与连边流程',
    props: {
      title: '发布流程',
      nodes: [{ id: 'a', label: '提交代码', tone: 'info' }, { id: 'b', label: 'CI 构建' }, { id: 'c', label: '部署上线', tone: 'success' }],
      edges: [{ from: 'a', to: 'b', label: 'push' }, { from: 'b', to: 'c' }],
    },
  },
  funnel: {
    title: '漏斗',
    desc: '阶段转化比例',
    props: { title: '转化漏斗', stages: [{ label: '访问', value: 1000 }, { label: '下单', value: 320 }] },
  },
  gauge: { title: '仪表盘', desc: '单值占比仪表', props: { label: '完成率', value: 45, unit: '%' } },
  grid: {
    title: '网格',
    desc: '等宽格子布局',
    props: { columns: 2, children: [textChild('w1', '格子 A'), textChild('w2', '格子 B')] },
  },
  heading: { title: '标题', desc: '章节标题', props: { text: '标题', level: 2 } },
  heatmap: { title: '热力图', desc: '矩阵强度分布', props: { matrix: [[1, 2], [3, 4]] } },
  markdown: {
    title: 'Markdown',
    desc: '富文本渲染',
    props: { content: '# 摘要\n\n支持 **加粗**、`代码` 与列表' },
  },
  'metric-grid': {
    title: '指标网格',
    desc: 'KPI 大数字卡片',
    props: {
      items: [
        { id: 'rev', label: '月营收', value: 48210, format: 'currency-cny', delta: '+12.4%', deltaTone: 'up' },
        { id: 'ord', label: '订单数', value: 1208, delta: '-2.1%', deltaTone: 'down' },
      ],
    },
  },
  progress: { title: '进度条', desc: '目标完成度', props: { label: '完成度', value: 50, max: 100 } },
  // 批 5：本地后端预设族（数据经 /openloop/app/* 同源 fetch，无需注入数据）
  'pb-stats': { title: '后端状态', desc: '本地后端运行统计', props: { autoRefreshMs: 30000 } },
  'db-browser': { title: '数据库浏览', desc: '筛选 + 选库 + 分页查数据', props: { collection: 'apps', perPage: 20 } },
  'storage-usage': { title: '存储占用', desc: 'DSH_HOME 磁盘分解', props: {} },
  'api-credentials': { title: '凭据总览', desc: 'API 凭据配置状态', props: {} },
  'sessions-stats': { title: '会话统计', desc: '会话数/占用/活跃度', props: {} },
  'mcp-status': { title: 'MCP 状态', desc: 'MCP 服务清单与连接', props: {} },
  'plugin-registry': { title: '插件清单', desc: '已加载插件分组', props: {} },
  // 自管理四件套 +1（2026-08-31）：「系统能读懂/管理/观察自己」
  'app-manager': { title: 'APP 管理', desc: '全部应用的管理面板（断开/重连/删除）', props: { autoRefreshMs: 30000 } },
  'api-usage-monitor': { title: '调用监控', desc: 'API 绑定与 MCP 调用统计', props: { autoRefreshMs: 30000 } },
  'system-overview': { title: '系统总览', desc: '后端/MCP/存储/会话一屏聚合', props: { autoRefreshMs: 30000 } },
  'event-log': { title: '系统事件流', desc: '系统行为的历史记录', props: { limit: 50 } },
  'agent-activity': { title: 'Agent 行为', desc: 'Agent 最近动作与工具热度', props: {} },
  row: { title: '横向行', desc: '水平排列子组件', props: { children: [textChild('w1', '项 A'), textChild('w2', '项 B')] } },
  section: { title: '分区', desc: '带标题的内容区块', props: { title: '分区标题' } },
  sparkline: { title: '迷你走势', desc: '数值 + 趋势火花线', props: { label: '近 7 日访问', value: 1280, series: [1, 3, 2, 5, 4, 8, 6] } },
  split: { title: '分栏', desc: '左右两栏布局', props: { children: [textChild('l', '左栏'), textChild('r', '右栏')] } },
  stack: { title: '纵向堆叠', desc: '垂直排列子组件', props: { children: [textChild('w1', '条目一'), textChild('w2', '条目二')] } },
  tag: { title: '标签', desc: '技术 / 分类小标签', props: { label: 'React' } },
  text: { title: '文本', desc: '基础段落文本', props: { text: '一段说明文本' } },
  timeline: {
    title: '时间线',
    desc: '事件先后序列',
    props: {
      title: '迭代节奏',
      items: [
        { id: 't1', title: '需求评审', status: 'past', time: '周一' },
        { id: 't2', title: '开发联调', status: 'current', time: '周三', detail: '进行中' },
      ],
    },
  },
}

/**
 * M2 内置 APP 的 API 资源（mock）：演示 API 分组的展示形态（状态点 / 鉴权徽章）。
 * M3 接 @openloop/dsh-app 门面后由真实 API 配置替换。
 */
const BUILTIN_APIS: AppApiDescriptor[] = [
  { id: 'openloop:boards', domain: 'local.app', path: '/api/boards', auth: 'none', status: 'ok', summary: '看板集合的 CRUD（本地后端）' },
  { id: 'openloop:tiles', domain: 'local.app', path: '/api/tiles', auth: 'none', status: 'ok', summary: '看板 tile 的排布与快照' },
  { id: 'openloop:components', domain: 'local.app', path: '/api/components', auth: 'none', status: 'ok', summary: 'APP 组件资源注册表' },
]

export interface BuiltinAppsResult {
  apps: AppDescriptor[]
  /** panels 未装 / client 桥不可用（UI 显示 DependencyMissing 同款降级） */
  panelsMissing: boolean
}

/** 内置 APP（openloop）：组件 = panels 已实现预设清单，API = mock */
export function listBuiltinApps(): BuiltinAppsResult {
  const panels = getPanelsClient()
  const kinds = panels?.allPresetKinds()
  if (panels === undefined || kinds === undefined) {
    return { apps: [], panelsMissing: true }
  }
  const components: AppComponentDescriptor[] = kinds
    .map((kind): AppComponentDescriptor | undefined => {
      const info = PRESET_INFO[kind]
      if (info === undefined) return undefined
      return { id: `openloop:${kind}`, title: info.title, type: 'panel', desc: info.desc, kind, pinnable: true }
    })
    .filter((c): c is AppComponentDescriptor => c !== undefined)
  return {
    apps: [{
      id: 'openloop',
      name: 'OpenLoop',
      kind: 'builtin',
      version: '1.0.0',
      desc: '系统内置 APP：预置 panels 组件与本地后端 API，开箱即用。',
      components,
      apis: BUILTIN_APIS,
    }],
    panelsMissing: false,
  }
}

/** 导出示例 props 表（单测用：逐一跑 panels validate 断言全过检） */
export const presetSamples: Readonly<Record<string, JsonObject>> = Object.fromEntries(
  Object.entries(PRESET_INFO).map(([kind, info]) => [kind, info.props]),
)

// ---- M3：门面 registry 合并（/openloop/app/registry） ----

/** 门面 registry 路由的行形态（@openloop/dsh-app routes.ts 契约） */
interface RemoteAppDetail {
  app: { name?: unknown; displayName?: unknown; kind?: unknown; version?: unknown; description?: unknown }
  components: Array<{ rid?: unknown; kind?: unknown; title?: unknown; description?: unknown; entry?: unknown }>
  apis: Array<{ rid?: unknown; domain?: unknown; path?: unknown; authType?: unknown; summary?: unknown; configured?: unknown }>
}

const APP_KINDS_REMOTE: readonly string[] = ['builtin', 'local', 'thirdparty']

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

/** 门面行 → dock AppDescriptor（组件 pinnable：entry.panel 合法即可 pin——v1 渲染闭环；mcp-app 引用形态合法即可 pin——v2） */
function remoteAppToDescriptor(detail: RemoteAppDetail): AppDescriptor | null {
  const name = str(detail.app?.name)
  if (name.length === 0) return null
  const components = (Array.isArray(detail.components) ? detail.components : [])
    .map((c): AppComponentDescriptor | null => {
      const rid = str(c?.rid)
      if (rid.length === 0) return null
      const entry = c?.entry
      if (c?.kind === 'mcp-app') {
        return {
          id: rid,
          title: str(c?.title, rid),
          type: 'mcp-app',
          desc: str(c?.description),
          kind: '',
          pinnable: entryMcpAppOf(entry) !== null,
          entry,
        }
      }
      return {
        id: rid,
        title: str(c?.title, rid),
        type: c?.kind === 'artifact' ? 'artifact' : 'panel',
        desc: str(c?.description),
        kind: '',
        pinnable: entryPanelOf(entry) !== null || entryArtifactOf(entry) !== null,
        entry,
      }
    })
    .filter((c): c is AppComponentDescriptor => c !== null)
  const apis = (Array.isArray(detail.apis) ? detail.apis : [])
    .map(api => ({
      id: str(api?.rid),
      domain: str(api?.domain),
      path: str(api?.path),
      auth: api?.authType === 'key' ? 'key' as const : 'none' as const,
      // 状态点与配置状态一致：configured=false 显示 warn（M2 验收点的真实化）
      status: api?.configured === true ? 'ok' as const : 'warn' as const,
      summary: str(api?.summary),
    }))
    .filter(api => api.id.length > 0)
  return {
    id: name,
    name: str(detail.app?.displayName, name) || name,
    kind: (APP_KINDS_REMOTE.includes(str(detail.app?.kind)) ? detail.app?.kind : 'local') as AppKind,
    version: str(detail.app?.version, '0.0.0'),
    desc: str(detail.app?.description),
    components,
    apis,
  }
}

/** GET /openloop/app/registry —— 门面不可用/未装返回 []（APP tab 只剩内置，静默） */
export async function fetchRemoteApps(): Promise<AppDescriptor[]> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    try {
      const res = await fetch('/openloop/app/registry', { signal: controller.signal })
      if (!res.ok) return []
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) return []
      const body = await res.json() as { apps?: unknown }
      const details = Array.isArray(body?.apps) ? body.apps : []
      return details
        .map((d): AppDescriptor | null => remoteAppToDescriptor(d as RemoteAppDetail))
        .filter((a): a is AppDescriptor => a !== null)
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return []
  }
}

/** 轻探：GET /openloop/app/status 只为拿 registryRev（代次变了才拉全量 registry） */
export async function fetchRegistryRev(): Promise<number | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3000)
    try {
      const res = await fetch('/openloop/app/status', { signal: controller.signal })
      if (!res.ok) return null
      const contentType = res.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) return null
      const body = await res.json() as { registryRev?: unknown }
      return typeof body?.registryRev === 'number' ? body.registryRev : null
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

/**
 * M3 合并：内置 APP（本地，渲染器同源）恒在；门面 APP 追加（同 id 去重——本地优先，
 * 门面里重复注册的 openloop 不产生第二个条目）。
 */
export function mergeApps(builtin: AppDescriptor[], remote: AppDescriptor[]): AppDescriptor[] {
  const seen = new Set<string>()
  const merged: AppDescriptor[] = []
  // 0.5.3 组件级合并（真机事故修复）：openloop 同时存在于 builtin（panels 预设本地
  // 清单）与 remote（PB registry——artifact 范例 / mcp-app / agent 注册物）。旧「同 id
  // 整 APP 去重、本地优先」会把 remote 的 openloop 整个吞掉——artifact 范例永远
  // 不可见。改为：同 id 的 APP 组件按 rid 合并去重（remote 条目覆盖同 rid 的本地
  // 条目——registry 是权威；纯本地的 panels 预设保留），apis 取并集。
  for (const app of builtin) {
    const remoteApp = remote.find(r => r.id === app.id)
    if (remoteApp === undefined) {
      merged.push(app)
      continue
    }
    const byRid = new Map<string, AppDescriptor['components'][number]>()
    for (const c of app.components) byRid.set(c.id, c)
    for (const c of remoteApp.components) byRid.set(c.id, c) // remote 覆盖同 rid
    const apisById = new Map<string, AppDescriptor['apis'][number]>()
    for (const a of app.apis) apisById.set(a.id, a)
    for (const a of remoteApp.apis) apisById.set(a.id, a)
    merged.push({
      ...app,
      version: remoteApp.version !== '0.0.0' ? remoteApp.version : app.version,
      desc: remoteApp.desc.length > 0 ? remoteApp.desc : app.desc,
      components: [...byRid.values()].sort((a, b) => a.id.localeCompare(b.id)),
      apis: [...apisById.values()],
    })
    seen.add(app.id)
  }
  for (const r of remote) {
    if (!seen.has(r.id)) merged.push(r)
  }
  return merged
}

/**
 * artifact entry 提取（0.5.2 few-shot 库）：entry = { artifact: ArtifactMeta }
 * （kind 'openloop.html-artifact' + title + runtime + html + path——与
 * html_artifact 工具产出的 ArtifactMeta 同构）。合法即 pinnable/可预览。
 */
export function entryArtifactOf(entry: unknown): Record<string, unknown> | null {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return null
  const wrapped = (entry as { artifact?: unknown }).artifact
  const meta = typeof entry === 'object' && (entry as Record<string, unknown>).kind === 'openloop.html-artifact'
    ? entry
    : wrapped
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  const record = meta as Record<string, unknown>
  if (record.kind !== 'openloop.html-artifact') return null
  if (typeof record.html !== 'string' || record.html.length === 0) return null
  if (record.runtime !== 'static' && record.runtime !== 'scripts' && record.runtime !== 'network') return null
  if (typeof record.title !== 'string' || record.title.length === 0) return null
  return record
}

/**
 * entry 面板提取（v1 渲染闭环契约——宽松形态）：
 * - 规范形态：`{ panel: <完整 PanelDefinition> }`（v1 文档原写法）
 * - 宽松形态：直接是 `PanelDefinition`（agent 实际写法——平铺更直觉，免一层套娃）
 *   通过形状识别：含 `$schema: 'openloop.panel/v1'` 或 ≥1 widget 且有 id/title 即可
 * - 都不是：文件路径 / 畸形 → null（待生成）
 * 注意：文件路径无效（浏览器读不到 workspace 文件）
 */
export function entryPanelOf(entry: unknown): JsonObject | null {
  // 形态 1：裸 PanelDefinition（直接是 entry 内容）
  if (looksLikePanelDefinition(entry)) return entry as JsonObject
  // 形态 2：{ panel: ... } 包装
  if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
    const panel = (entry as { panel?: unknown }).panel
    if (looksLikePanelDefinition(panel)) return panel as JsonObject
  }
  return null
}

function looksLikePanelDefinition(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  // 必须有 id + title + ≥1 widget（核心门）—— $schema 是 hints，不是必要条件
  if (typeof record.id !== 'string' || record.id.length === 0) return false
  if (typeof record.title !== 'string' || record.title.length === 0) return false
  if (!Array.isArray(record.widgets) || record.widgets.length === 0) return false
  return true
}

/**
 * mcp-app 引用形态提取（方向 1 v2 渲染时取数契约）：
 * entry = { serverId, toolName, resourceUri }（三 string 即合法；connect_server 写入）。
 */
export function entryMcpAppOf(entry: unknown): { serverId: string; toolName: string; resourceUri: string } | null {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return null
  const record = entry as Record<string, unknown>
  if (typeof record.serverId !== 'string' || record.serverId.length === 0) return null
  if (typeof record.toolName !== 'string' || record.toolName.length === 0) return null
  if (typeof record.resourceUri !== 'string' || record.resourceUri.length === 0) return null
  return { serverId: record.serverId, toolName: record.toolName, resourceUri: record.resourceUri }
}

/**
 * pin 一个组件资源 = 构造可渲染 tile source（统一入口，2026-08-29）：
 * - mcp-app 组件（entry 引用形态合法）→ mcp-app tile（渲染时取数，不复制内容）
 * - 其余走 buildPanelMetaForComponent 的 panel 通道：
 *   内置（PRESET_INFO[kind]）→ 合法最小示例 props 实例；
 *   门面组件（entry.panel 合法）→ 直接用 agent 内联的完整 PanelDefinition
 *   （resolved 置空——api 绑定 widget 由 panels 的 onLoad 刷新在打开时自动拉取）
 * 两者皆无 → null（「待生成」态，pin 拒绝）。
 */
export function buildTileSourceForComponent(component: AppComponentDescriptor): DockTileSource | null {
  if (component.type === 'mcp-app') {
    const reference = entryMcpAppOf(component.entry)
    if (reference === null) return null
    return {
      kind: 'mcp-app',
      meta: { ...reference, ...(component.id ? { rid: component.id } : {}) },
    }
  }
  if (component.type === 'artifact') {
    const meta = entryArtifactOf(component.entry)
    if (meta === null) return null
    return { kind: 'artifact', meta }
  }
  return buildPanelMetaForComponent(component)
}
export function buildPanelMetaForComponent(component: AppComponentDescriptor): { kind: 'panel'; meta: unknown } | null {
  const info = PRESET_INFO[component.kind]
  if (info !== undefined) {
    const props = info.props
    return {
      kind: 'panel',
      meta: {
        kind: 'openloop.panel',
        version: 1,
        panel: {
          $schema: 'openloop.panel/v1',
          id: component.kind,
          title: component.title,
          description: info.desc,
          widgets: [{ id: 'w1', source: { type: 'preset', kind: component.kind, props } }],
        },
        resolved: {},
        resolvedAt: new Date().toISOString(),
      },
    }
  }
  const entryPanel = entryPanelOf(component.entry)
  if (entryPanel !== null) {
    return {
      kind: 'panel',
      meta: {
        kind: 'openloop.panel',
        version: 1,
        panel: entryPanel,
        resolved: {},
        resolvedAt: new Date().toISOString(),
      },
    }
  }
  return null
}
