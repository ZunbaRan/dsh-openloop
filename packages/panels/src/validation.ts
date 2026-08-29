/**
 * §5.4 校验规则实现（fail-closed）。
 * 全部校验失败都会抛出带明确信息的 Error，消息面向 Agent 可自修正。
 * 任何未知/异常输入一律拒绝（fail-closed），不静默放行。
 */
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

/*
 * SSRF 防护已抽离至 @openloop/dsh-base/server（base 重构 2026-08-22），
 * 此处 re-export 保持 panels 既有 API（测试/refresh 路由引用）不变。
 */
import { isForbiddenApiUrl } from '@openloop/dsh-base/server'

export { isForbiddenApiUrl }

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
    const api = sourceRecord as { url?: unknown; timeoutMs?: unknown; headers?: unknown }
    if (typeof api.url !== 'string' || api.url.length === 0) {
      throw new Error(`panel widget "${widgetId}" api source requires a non-empty url string`)
    }
    if (typeof api.timeoutMs === 'number' && api.timeoutMs > 30_000) {
      throw new Error(`panel widget "${widgetId}" api source timeoutMs must be at most 30_000`)
    }
    if (api.headers !== undefined && typeof api.headers === 'object' && api.headers !== null) {
      for (const key of Object.keys(api.headers)) {
        if (key.toLowerCase() === 'authorization') {
          throw new Error(`panel widget "${widgetId}" api source must not pass an Authorization header in plain text; panel datasources are public https-only and must not send credentials through DSH`)
        }
      }
    }
    validateApiSource(api.url, widgetId)
  } else if (sourceRecord.type !== 'static') {
    throw new Error(`panel widget "${widgetId}" data binding source.type must be "static" or "api"`)
  }
}
