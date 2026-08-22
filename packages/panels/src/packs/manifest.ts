/**
 * pack manifest（§12.1 `dsh-pack.json`）解析与校验。
 *
 * - 校验是 fail-closed 的：任何非法/未知输入一律抛 Error，消息面向开发者可自修正。
 * - 本模块**零依赖**（不含 node:fs / node:net / react），client（loader/PanelCard）与服务端（registry/serve）均可安全引用。
 * - 硬约束（§12.2）：`runtime: "react18"` 走宿主车道；`react19` 标记为待沙箱车道（批 4），v1 在注册层拒绝（见 registry.ts）。
 */

/** pack 运行时车道（§12.2 硬约束 1） */
export type PackRuntime = 'react18' | 'react19'

/** 单个 component 元数据（§12.1） */
export interface PackComponentMeta {
  description?: string
  /** props 的 JSON Schema（v1 仅存证，不做深度校验；§6.3 同源约定） */
  propsSchema?: object
}

/** §12.1 pack manifest（包根 `dsh-pack.json` 的权威形状） */
export interface PackManifest {
  /** 包名：裸名 `dsh-pack-fancy` 或 scoped `@acme/dsh-pack-fancy`（与设计文档示例一致） */
  name: string
  version: string
  runtime: PackRuntime
  /** ESM 入口，相对包根（§12.2 硬约束 2）；v1 由 pack 路由 serve */
  entry: string
  /** 随包 CSS，相对包根（可选；禁止全局 reset/Preflight，§12.2 硬约束 3） */
  styles?: string
  /** component 名 → 元数据；至少 1 个（§12.1） */
  components: Record<string, PackComponentMeta>
}

export const PACK_RUNTIMES: readonly PackRuntime[] = ['react18', 'react19']

/** v1 宿主车道允许的 runtime（§12.2 硬约束 1）；react19 留待批 4 沙箱车道 */
export const HOST_LANE_RUNTIME: PackRuntime = 'react18'

/** pack 资产路由前缀（§9）：绝对路径、无尾部斜杠；panels 独占，撞前缀即 register 抛错（IMPL_NOTES §1.4） */
export const PACKS_ROUTE = '/openloop/packs'

/**
 * pack 路由虚拟入口名（§12 加载契约）：
 * client 加载器固定请求 `<packBaseUrl>/entry.js`，pack 路由（serve.ts）从注册表解析 manifest.entry 实际文件。
 * 这样 client 无需知道 manifest.entry 值，服务端可随时改入口文件路径。
 */
export const PACK_ENTRY_VIRTUAL = 'entry.js'

/** pack 路由虚拟样式名：`<packBaseUrl>/styles.css` → manifest.styles（可选，缺失时 404） */
export const PACK_STYLES_VIRTUAL = 'styles.css'

/**
 * pack 名校验（§12.1 + 路径安全）：裸名或 scoped 名，仅小写字母/数字/`. _ -`；
 * 含 `/` 的 scoped 名至多一个 `/`（`@scope/name`）。
 * 禁止 `..`、反斜杠、空白——保证 pack 名可安全拼进 URL 与文件系统路径（防穿越）。
 */
export const PACK_NAME_RE = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u

/** 包内文件路径校验：相对、无绝对前缀、无 `..` 段、无反斜杠（防路径穿越） */
export function isSafePackRelPath(path: string): boolean {
  if (path.length === 0 || path.length > 512) return false
  if (path.startsWith('/') || path.startsWith('\\')) return false
  if (/\\/u.test(path)) return false
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.' || segment === '..') return false
  }
  return true
}

/** 车道判定（§5.1：pack → 按 manifest.runtime）：react18→host；react19→sandbox（批 4） */
export function packLaneFor(runtime: PackRuntime): 'host' | 'sandbox' {
  return runtime === 'react18' ? 'host' : 'sandbox'
}

/**
 * 解析并校验一个未知输入为 PackManifest（fail-closed）。
 * 任何缺字段/类型错误/非法值都抛 Error；react19 是合法值（解析不拒，注册层按车道策略拒绝）。
 */
export function parsePackManifest(input: unknown): PackManifest {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('dsh-pack.json must be a JSON object conforming to the §12.1 pack manifest contract')
  }
  const record = input as Record<string, unknown>

  const name = record.name
  if (typeof name !== 'string' || !PACK_NAME_RE.test(name)) {
    throw new Error(`pack manifest name must be a kebab-case (or @scope/name) string; got ${describe(name)}`)
  }

  const version = record.version
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u.test(version)) {
    throw new Error(`pack manifest "${name}" version must be a semver string like "0.1.0"; got ${describe(version)}`)
  }

  const runtime = record.runtime
  if (runtime !== 'react18' && runtime !== 'react19') {
    throw new Error(`pack manifest "${name}" runtime must be "react18" or "react19"; got ${describe(runtime)}`)
  }

  const entry = record.entry
  if (typeof entry !== 'string' || !isSafePackRelPath(entry)) {
    throw new Error(`pack manifest "${name}" entry must be a relative pack file path (no leading "/" or ".."); got ${describe(entry)}`)
  }

  const stylesRaw = record.styles
  if (stylesRaw !== undefined && (typeof stylesRaw !== 'string' || !isSafePackRelPath(stylesRaw))) {
    throw new Error(`pack manifest "${name}" styles must be a relative pack file path or omitted; got ${describe(stylesRaw)}`)
  }

  const componentsRaw = record.components
  if (typeof componentsRaw !== 'object' || componentsRaw === null || Array.isArray(componentsRaw)) {
    throw new Error(`pack manifest "${name}" components must be a non-empty object mapping component names to metadata`)
  }
  const componentsEntries = Object.entries(componentsRaw)
  if (componentsEntries.length === 0) {
    throw new Error(`pack manifest "${name}" components must declare at least one component`)
  }
  const components: Record<string, PackComponentMeta> = {}
  for (const [componentName, metaRaw] of componentsEntries) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/u.test(componentName)) {
      throw new Error(`pack manifest "${name}" component name "${componentName}" must be a valid identifier (letters/digits/underscore)`)
    }
    if (typeof metaRaw !== 'object' || metaRaw === null || Array.isArray(metaRaw)) {
      throw new Error(`pack manifest "${name}" component "${componentName}" metadata must be an object`)
    }
    const meta = metaRaw as Record<string, unknown>
    if (meta.description !== undefined && typeof meta.description !== 'string') {
      throw new Error(`pack manifest "${name}" component "${componentName}" description must be a string`)
    }
    if (meta.propsSchema !== undefined && (typeof meta.propsSchema !== 'object' || meta.propsSchema === null || Array.isArray(meta.propsSchema))) {
      throw new Error(`pack manifest "${name}" component "${componentName}" propsSchema must be a JSON Schema object`)
    }
    const componentMeta: PackComponentMeta = {}
    if (typeof meta.description === 'string') componentMeta.description = meta.description
    if (typeof meta.propsSchema === 'object' && meta.propsSchema !== null) componentMeta.propsSchema = meta.propsSchema as object
    components[componentName] = componentMeta
  }

  return { name, version, runtime, entry, ...(stylesRaw !== undefined ? { styles: stylesRaw as string } : {}), components }
}

function describe(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'an array'
  return typeof value
}
