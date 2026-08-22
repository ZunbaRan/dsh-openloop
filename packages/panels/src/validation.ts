/**
 * §5.4 校验规则实现（fail-closed）。
 * 全部校验失败都会抛出带明确信息的 Error，消息面向 Agent 可自修正。
 * 任何未知/异常输入一律拒绝（fail-closed），不静默放行。
 */
import { isIP } from 'node:net'
import type { JsonObject, PanelDefinition, PresetKind, WidgetUnit } from './contract.ts'
import { getPreset } from './presets/index.ts'

/** §6.1 预设组件 kind 全清单（运行时白名单，与 contract.ts 的 PresetKind 类型逐字对齐） */
export const PRESET_KINDS: readonly PresetKind[] = [
  'text', 'markdown', 'heading', 'badge', 'tag', 'divider', 'avatar',
  'card', 'section', 'stack', 'grid', 'row', 'split', 'scroll-area',
  'metric', 'metric-grid', 'data-table', 'list', 'key-value', 'stat',
  'rating', 'empty-state', 'timeline',
  'chart', 'sparkline', 'gauge', 'funnel', 'heatmap',
  'flow', 'comparison', 'steps', 'tree',
  'callout', 'status', 'progress', 'skeleton',
  'tabs', 'accordion', 'pagination', 'tooltip',
]

/** §12 外部组件包注册表（S0 尚未接入 packs，默认全空；接入时经 registerPack 填充） */
const packRegistry = new Map<string, ReadonlySet<string>>()

/** 注册一个外部组件包及其可用 component 名（§12.1 manifest.components 的键） */
export function registerPack(pack: string, components: readonly string[]): void {
  if (!pack || !components.length) {
    throw new Error('registerPack requires a non-empty pack name and at least one component')
  }
  packRegistry.set(pack, new Set(components))
}

/** 查询 pack 是否已注册且含指定 component（未注册返回 false，fail-closed） */
export function isPackComponent(pack: string, component: string): boolean {
  return packRegistry.get(pack)?.has(component) ?? false
}

/** custom code 禁词表（§5.4 / §8.3）：静态扫描命中即拒，CSP 是主防线、这里是纵深防御 */
const FORBIDDEN_CUSTOM_CODE_TERMS = [
  'import', 'require', 'fetch', 'XMLHttpRequest', 'WebSocket', 'eval',
  'document.cookie', 'localStorage', 'sessionStorage', 'window.parent', 'top.',
] as const

/** custom code 大小上限（§5.4） */
export const CUSTOM_CODE_MAX_BYTES = 32 * 1024

/** 扫描 custom code 是否命中禁词；命中返回命中的词，否则返回 undefined */
export function forbiddenCustomCodeTerm(code: string): string | undefined {
  const lowered = code.toLowerCase()
  for (const term of FORBIDDEN_CUSTOM_CODE_TERMS) {
    if (lowered.includes(term)) return term
  }
  return undefined
}

/** 判断 IP 字面量（去掉方括号后的 hostname）是否落在禁连段 */
function isForbiddenIpLiteral(hostname: string): boolean {
  const ipv = isIP(hostname)
  if (ipv === 4) return isForbiddenIPv4(hostname)
  if (ipv === 6) return isForbiddenIPv6(hostname)
  return false
}

/** IPv4 段判断：0.0.0.0/8、127.0.0.0/8、10.0.0.0/8、172.16.0.0/12、192.168.0.0/16、169.254.0.0/16 */
function isForbiddenIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map(part => Number(part))
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true // 非法 IPv4 字形，fail-closed
  }
  const [a, b] = parts as [number, number, number, number]
  if (a === 0) return true // 0.0.0.0/8 本网络
  if (a === 127) return true // 127.0.0.0/8 环回
  if (a === 10) return true // 10.0.0.0/8 私网
  if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12 私网
  if (a === 192 && b === 168) return true // 192.168.0.0/16 私网
  if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local
  return false
}

/** IPv6 段判断：::/::1 环回、fc00::/7 ULA、fe80::/10 link-local、::ffff:a.b.c.d IPv4-mapped */
function isForbiddenIPv6(hostname: string): boolean {
  const lower = hostname.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true // fc00::/7
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true // fe80::/10
  const v4Mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)
  if (v4Mapped?.[1]) return isForbiddenIPv4(v4Mapped[1])
  return false
}

/**
 * SSRF 检测（§15 S3）：url 指向环回/内网/不可解析地址时返回 true。
 * 仅做静态判定：hostname 为 IP 字面量或 localhost 时按网段检查；
 * 普通域名无法在编译期解析，默认放行（服务端 fetch 层另有二次防护）。
 */
export function isForbiddenApiUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return true // 无法解析的 URL，fail-closed
  }
  const hostname = parsed.hostname
  if (hostname === '') return true
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return isForbiddenIpLiteral(hostname.slice(1, -1))
  }
  return isForbiddenIpLiteral(hostname)
}

/** 校验 api source（§5.2 / §5.4）：必须 https://，且不指向环回/内网（§15 S3） */
function validateApiSource(url: string, widgetId: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`panel widget "${widgetId}" api source URL "${url}" is not a valid URL; pass an absolute https:// URL`)
  }
  if (parsed.protocol !== 'https:') {
    throw new Error(`panel widget "${widgetId}" api source URL "${url}" must use https:// (insecure http:// is rejected in v1)`)
  }
  if (isForbiddenApiUrl(url)) {
    throw new Error(`panel widget "${widgetId}" api source URL "${url}" points to a loopback/private address, which is forbidden (SSRF guard); use a public https:// endpoint`)
  }
}

/** 校验单个 widget 的数据绑定（§5.2 / §5.4） */
function validateDataBinding(widgetId: string, data: unknown): void {
  if (typeof data !== 'object' || data === null) {
    throw new Error(`panel widget "${widgetId}" data binding must be an object`)
  }
  const binding = data as Record<string, unknown>
  const source = binding.source
  if (typeof source !== 'object' || source === null) {
    throw new Error(`panel widget "${widgetId}" data binding requires a source object`)
  }
  const sourceRecord = source as Record<string, unknown>
  // pick 错位防御（真机教训：文档曾把 pick 画进 source，放错会被静默忽略）
  if (sourceRecord.pick !== undefined) {
    throw new Error(`panel widget "${widgetId}" data binding: pick belongs on the binding (sibling of source), not inside source — move it to data.pick`)
  }
  if (binding.pick !== undefined && typeof binding.pick !== 'string') {
    throw new Error(`panel widget "${widgetId}" data binding pick must be a string like "items[0].total"`)
  }
  if (sourceRecord.type === 'api') {
    const api = sourceRecord as { url?: unknown; timeoutMs?: unknown; credentialRef?: unknown; headers?: unknown }
    if (typeof api.url !== 'string' || api.url.length === 0) {
      throw new Error(`panel widget "${widgetId}" api source requires a non-empty url string`)
    }
    if (api.credentialRef !== undefined) {
      throw new Error(`panel widget "${widgetId}" api source credentialRef is a v2 feature and is not supported in v1`)
    }
    if (typeof api.timeoutMs === 'number' && api.timeoutMs > 30_000) {
      throw new Error(`panel widget "${widgetId}" api source timeoutMs must be at most 30_000`)
    }
    if (api.headers !== undefined && typeof api.headers === 'object' && api.headers !== null) {
      for (const key of Object.keys(api.headers)) {
        if (key.toLowerCase() === 'authorization') {
          throw new Error(`panel widget "${widgetId}" api source must not pass an Authorization header in plain text; v2 credentialRef will cover this`)
        }
      }
    }
    validateApiSource(api.url, widgetId)
  } else if (sourceRecord.type !== 'static') {
    throw new Error(`panel widget "${widgetId}" data binding source.type must be "static" or "api"`)
  }
}

/** 校验单个 widget（§5.4 widget 级规则） */
function validateWidget(widget: unknown, widgetId: string, panelId: string, depth = 0): void {
  if (typeof widget !== 'object' || widget === null) {
    throw new Error(`panel "${panelId}" widget "${widgetId}" must be an object`)
  }
  // 深度硬限（防御畸形输入）：契约最深层为 面板 → 布局容器 → 分组容器 → 叶子（depth ≤ 2）
  if (depth > 2) {
    throw new Error(`panel widget "${widgetId}" is nested too deep (max 2 levels of children)`)
  }
  const record = widget as Record<string, unknown>
  if (record.id !== widgetId) {
    throw new Error(`panel "${panelId}" widget "${widgetId}" internal id mismatch`)
  }
  if (record.data !== undefined) validateDataBinding(widgetId, record.data)
  if (record.refresh !== undefined) {
    if (typeof record.refresh !== 'object' || record.refresh === null) {
      throw new Error(`panel widget "${widgetId}" refresh policy must be an object`)
    }
    const refresh = record.refresh as { intervalMs?: unknown }
    if (typeof refresh.intervalMs === 'number' && refresh.intervalMs < 10_000) {
      throw new Error(`panel widget "${widgetId}" refresh.intervalMs must be at least 10_000`)
    }
  }
  const source = record.source
  if (typeof source !== 'object' || source === null) {
    throw new Error(`panel widget "${widgetId}" requires a source object`)
  }
  const sourceRecord = source as Record<string, unknown>
  if (sourceRecord.type === 'preset') {
    const kind = sourceRecord.kind
    if (typeof kind !== 'string' || !(PRESET_KINDS as readonly string[]).includes(kind)) {
      throw new Error(`panel widget "${widgetId}" preset kind "${String(kind)}" is not in the preset whitelist; see §6.1 for the 40 supported kinds`)
    }
    if (sourceRecord.props !== undefined && (typeof sourceRecord.props !== 'object' || sourceRecord.props === null)) {
      throw new Error(`panel widget "${widgetId}" preset props must be an object`)
    }
    // children 错位防御（真机事故：模型把 children 放在 source 层而非 props 内，
    // 此前被静默忽略 → 容器渲染为空且无报错）
    if (sourceRecord.children !== undefined) {
      throw new Error(`panel widget "${widgetId}" preset source must not carry children directly — children is a prop: move it into source.props.children`)
    }
    // 组件级 props 深校验（含容器 children 规则）——必须在服务端做（§5.4 fail-closed）：
    // 真机事故（grid→card 被客户端占位拒绝但工具返回成功）：props 校验只发生在渲染端时，
    // 模型收到 "Rendered panel" 即停手，错误只有用户看得见，无从自修正。
    // 未实现 kind（无渲染器）跳过：契约合法但走运行时占位属已知中间态。
    const preset = getPreset(kind as PresetKind)
    if (preset) {
      const props = (sourceRecord.props ?? {}) as JsonObject
      const result = preset.validate(props)
      if (!result.ok) {
        const first = result.errors[0]
        throw new Error(`panel widget "${widgetId}" (${kind}) props validation failed: ${first ? `${first.path}: ${first.message}` : 'unknown error'}`)
      }
      // 递归校验 children 内子 widget 的完整契约（id/source/自身 props）——
      // validateChildren 只做容器侧结构校验，子组件 props 的深校验在这里闭环
      const children = (props as Record<string, unknown>).children
      if (Array.isArray(children)) {
        children.forEach((child, index) => {
          const childId = typeof (child as { id?: unknown })?.id === 'string'
            ? (child as { id: string }).id
            : `${widgetId}.children[${index}]`
          validateWidget(child, childId, panelId, depth + 1)
        })
      }
    }
  } else if (sourceRecord.type === 'pack') {
    const pack = sourceRecord.pack
    const component = sourceRecord.component
    if (typeof pack !== 'string' || pack.length === 0) {
      throw new Error(`panel widget "${widgetId}" pack source requires a non-empty pack name`)
    }
    if (typeof component !== 'string' || component.length === 0) {
      throw new Error(`panel widget "${widgetId}" pack source requires a non-empty component name`)
    }
    if (!isPackComponent(pack, component)) {
      throw new Error(`panel widget "${widgetId}" pack "${pack}" component "${component}" is not registered (S0 has no packs installed; use a preset or custom widget instead)`)
    }
  } else if (sourceRecord.type === 'custom') {
    const code = sourceRecord.code
    if (typeof code !== 'string') {
      throw new Error(`panel widget "${widgetId}" custom source requires a string code field`)
    }
    if (Buffer.byteLength(code, 'utf8') > CUSTOM_CODE_MAX_BYTES) {
      throw new Error(`panel widget "${widgetId}" custom code exceeds the ${CUSTOM_CODE_MAX_BYTES} byte limit`)
    }
    const term = forbiddenCustomCodeTerm(code)
    if (term !== undefined) {
      throw new Error(`panel widget "${widgetId}" custom code contains the forbidden term "${term}"; network/module/storage/DOM-escape access is not allowed in v1 (CSP enforces this too)`)
    }
  } else {
    throw new Error(`panel widget "${widgetId}" source.type must be "preset", "pack", or "custom"`)
  }
}

/**
 * §5.4 面板全量校验（fail-closed）。
 * 校验通过后输入收敛为 PanelDefinition；任何非法形状/规则都以 Error 拒绝。
 */
export function validatePanel(input: unknown): asserts input is PanelDefinition {
  if (typeof input !== 'object' || input === null) {
    throw new Error('panel must be a JSON object conforming to the openloop.panel/v1 contract')
  }
  const panel = input as Record<string, unknown>
  if (panel.$schema !== 'openloop.panel/v1') {
    throw new Error('panel $schema must be "openloop.panel/v1"')
  }
  if (typeof panel.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(panel.id)) {
    throw new Error('panel id must be a non-empty kebab-case string (lowercase letters, digits, and single hyphens)')
  }
  if (typeof panel.title !== 'string' || panel.title.trim().length === 0) {
    throw new Error('panel title must be a non-empty string')
  }
  if (panel.title.length > 120) {
    throw new Error(`panel title is ${panel.title.length} characters; the maximum is 120`)
  }
  if (panel.description !== undefined) {
    if (typeof panel.description !== 'string') throw new Error('panel description must be a string')
    if (panel.description.length > 360) {
      throw new Error(`panel description is ${panel.description.length} characters; the maximum is 360`)
    }
  }
  if (!Array.isArray(panel.widgets)) {
    throw new Error('panel widgets must be an array of widget units')
  }
  if (panel.widgets.length < 1 || panel.widgets.length > 24) {
    throw new Error(`panel widgets must contain 1-24 widgets; got ${panel.widgets.length}`)
  }
  const seenIds = new Set<string>()
  for (const widget of panel.widgets) {
    if (typeof widget !== 'object' || widget === null || typeof (widget as Record<string, unknown>).id !== 'string') {
      throw new Error('every panel widget requires a string id')
    }
    const widgetId = (widget as Record<string, unknown>).id as string
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(widgetId)) {
      throw new Error(`panel widget id "${widgetId}" must be kebab-case (lowercase letters, digits, and single hyphens)`)
    }
    if (seenIds.has(widgetId)) {
      throw new Error(`panel widget id "${widgetId}" is duplicated; widget ids must be unique within a panel`)
    }
    seenIds.add(widgetId)
  }
  if (panel.layout !== undefined) {
    if (typeof panel.layout !== 'object' || panel.layout === null) {
      throw new Error('panel layout must be an object')
    }
    const layout = panel.layout as { mode?: unknown; columns?: unknown }
    if (layout.mode !== undefined && layout.mode !== 'stack' && layout.mode !== 'grid') {
      throw new Error('panel layout.mode must be "stack" or "grid"')
    }
    if (layout.columns !== undefined && layout.columns !== 1 && layout.columns !== 2 && layout.columns !== 3) {
      throw new Error('panel layout.columns must be 1, 2, or 3')
    }
  }
  for (const widget of panel.widgets) {
    validateWidget(widget, (widget as WidgetUnit).id, panel.id as string)
  }
}
