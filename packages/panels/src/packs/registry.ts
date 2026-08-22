/**
 * 外部组件包注册表（§12）。
 *
 * - 模块级全局单例 + `PackRegistry` 类（测试可注入独立实例，避免污染全局）。
 * - `registerPack(manifest, baseUrl)`：parsePackManifest 校验（fail-closed）后登记；
 *   `runtime: "react19"` 在注册层拒绝（§12.2 硬约束 1：react19 走沙箱车道，批 4 未实现，报错提示）。
 * - 注册同时同步 `validation.ts` 的 pack 白名单（tool 校验 §5.4 用同一份注册信息）。
 * - `scanPacksDir(dir, fs)`：读 `dir` 下每个子目录的 `dsh-pack.json` 批量注册（§12 启用方式 v1）；
 *   `fs` 可注入（测试用内存 fs），目录不存在容错返回空结果。
 *
 * 注意：本模块仅服务端/测试引用；client（loader/PanelCard）**不**引用它（见 loader.ts）。
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { registerPack as registerValidationPack } from '../validation.ts'
import {
  HOST_LANE_RUNTIME,
  PACKS_ROUTE,
  parsePackManifest,
  type PackManifest,
} from './manifest.ts'

/** 文件系统 seam（§12 scanPacksDir 可注入；真实实现 = node:fs/promises 适配） */
export interface PackFs {
  /** 列目录直接子项名（不递归） */
  readdir(dir: string): Promise<string[]>
  /** 读 UTF-8 文本；文件不存在/不可读时抛错（由调用方容错） */
  readFile(path: string): Promise<string>
}

/** node:fs/promises 适配（scanPacksDir 默认实现） */
export const nodePackFs: PackFs = {
  readdir: dir => readdir(dir),
  readFile: path => readFile(path, 'utf8'),
}

/** 已注册 pack（§12）：manifest + 资产 URL 前缀 + 文件系统根 */
export interface RegisteredPack {
  manifest: PackManifest
  /** pack 资产 URL 前缀（以 `/` 结尾）：`${PACKS_ROUTE}/${manifest.name}/`（§9 pack 路由解析用） */
  baseUrl: string
  /** 包文件系统根（pack 路由 serve 时读文件的根目录）；未提供则 pack 资产不可用（404） */
  fsRoot: string
}

/** scanPacksDir 结果：注册成功名单 + 每包跳过原因（目录不存在整体返回空，不抛错） */
export interface ScanResult {
  registered: string[]
  errors: string[]
}

export class PackRegistry {
  private readonly packs = new Map<string, RegisteredPack>()

  /**
   * 校验并注册一个 pack（重复 name = 覆盖更新，幂等，scan 重跑安全）。
   * react19 runtime 抛错（v1 宿主车道仅 react18）；baseUrl 必须为绝对 URL 前缀（`/` 开头、`/` 结尾）。
   */
  registerPack(manifest: PackManifest, baseUrl: string, fsRoot = ''): void {
    // fail-closed：运行时对象重新过一遍 manifest 校验（防御直接构造绕过 parse 的调用方）
    const parsed = parsePackManifest(manifest)
    if (parsed.runtime !== HOST_LANE_RUNTIME) {
      throw new Error(
        `pack "${parsed.name}" runtime "${parsed.runtime}" targets the sandbox lane (react19 runtime ships in batch 4); ` +
        `v1 registers only "${HOST_LANE_RUNTIME}" on the host lane — rebuild the pack with "runtime": "${HOST_LANE_RUNTIME}"`,
      )
    }
    if (typeof baseUrl !== 'string' || !baseUrl.startsWith('/') || !baseUrl.endsWith('/')) {
      throw new Error(`pack "${parsed.name}" baseUrl must be an absolute URL prefix (e.g. "${PACKS_ROUTE}/${parsed.name}/"); got ${JSON.stringify(baseUrl)}`)
    }
    this.packs.set(parsed.name, { manifest: parsed, baseUrl, fsRoot })
    // 同步 tool 校验白名单（§5.4 pack 校验；validation.ts 的 registerPack 要求 components 非空——manifest 已保证）
    registerValidationPack(parsed.name, Object.keys(parsed.components))
  }

  getPack(name: string): RegisteredPack | undefined {
    return this.packs.get(name)
  }

  hasPack(name: string): boolean {
    return this.packs.has(name)
  }

  listPacks(): RegisteredPack[] {
    return [...this.packs.values()]
  }

  /** 清空注册表（测试用；不影响 validation.ts 的白名单） */
  clear(): void {
    this.packs.clear()
  }
}

/** 全局单例（服务端 index.ts 接线用） */
export const packRegistry = new PackRegistry()

// ---- 模块级便捷 API（操作全局单例；测试可注入独立 PackRegistry 实例） ----

export function registerPack(manifest: PackManifest, baseUrl: string, fsRoot = '', registry: PackRegistry = packRegistry): void {
  registry.registerPack(manifest, baseUrl, fsRoot)
}

export function getPack(name: string, registry: PackRegistry = packRegistry): RegisteredPack | undefined {
  return registry.getPack(name)
}

export function hasPack(name: string, registry: PackRegistry = packRegistry): boolean {
  return registry.hasPack(name)
}

export function listPacks(registry: PackRegistry = packRegistry): RegisteredPack[] {
  return registry.listPacks()
}

/** 清空全局注册表（测试隔离用） */
export function resetPackRegistry(registry: PackRegistry = packRegistry): void {
  registry.clear()
}

/**
 * 扫描 `dir` 下每个子目录的 `dsh-pack.json` 批量注册（§12 启用方式 v1）。
 * - 每个子目录若无 `dsh-pack.json` / 解析失败 / 注册被拒（如 react19）→ 记录 errors 并跳过，不中断整体。
 * - 目录本身不存在/不可读 → 返回空结果（v1 启动容错：pack 目录未建时不打扰）。
 * - fsRoot 恒为该子目录（pack 资产路由从 fsRoot 相对读文件）。
 */
export async function scanPacksDir(dir: string, fs: PackFs = nodePackFs, registry: PackRegistry = packRegistry): Promise<ScanResult> {
  const result: ScanResult = { registered: [], errors: [] }
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return result // 目录缺失/不可读：按空扫描处理
  }
  for (const entry of entries) {
    const packDir = join(dir, entry)
    const manifestPath = join(packDir, 'dsh-pack.json')
    let manifest: PackManifest
    try {
      const raw = await fs.readFile(manifestPath)
      manifest = parsePackManifest(JSON.parse(raw) as unknown)
    } catch (error) {
      result.errors.push(`${entry}: ${describe(error)}`)
      continue
    }
    try {
      registry.registerPack(manifest, `${PACKS_ROUTE}/${manifest.name}/`, packDir)
      result.registered.push(manifest.name)
    } catch (error) {
      result.errors.push(`${manifest.name}: ${describe(error)}`)
    }
  }
  return result
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
