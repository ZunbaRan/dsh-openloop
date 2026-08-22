/**
 * §11 面板持久化 store。
 *
 * 存储位置：设计文档定为 `<DSH_HOME>/profiles/web/data/openloop-panels/<panelId>.json`；
 * 真机经 `ctx.fs` + `sandboxPolicy` seams 解析（IMPL_NOTES §3 示例：resolve 相对路径 + cwd 回退链，
 * writeText 第 5 参传 sandboxPolicy），目录由 index.ts 注入；测试注入临时目录/内存 fs，绝不落真 DSH home。
 *
 * 内容：PanelDefinition 全量 + savedAt + pluginVersion（自包含快照，§11）。
 * 读盘容错：损坏 JSON / 形状不符一律返回 undefined，不允许整面板失败。
 */
import type { PanelDefinition } from './contract.ts'
import { validatePanel } from './validation.ts'

export const PANELS_SUBDIR = 'openloop-panels'
/** 插件版本，写盘记录用（与 package.json 保持同步） */
export const PLUGIN_VERSION = '0.1.0'

/** 落盘记录：PanelDefinition 全量 + 元数据（§11） */
export interface StoredPanel {
  panel: PanelDefinition
  savedAt: string
  pluginVersion: string
}

/**
 * 最小文件系统 seam（路径相对 DSH fs 执行世界根 / cwd）。
 * 真机由 createCtxPanelFs 包装 ctx.fs 实现；测试注入内存实现。
 */
export interface PanelFs {
  /** 原子写文本（父目录由 backend 保证可写） */
  writeText(relPath: string, content: string): Promise<void>
  /** 读文本；不存在或读失败返回 undefined */
  readText(relPath: string): Promise<string | undefined>
  /** 列目录直接子项名（不递归、不读内容） */
  listDir(relDir: string): Promise<string[]>
}

export interface PanelStoreOptions {
  /** 面板存储根目录（真机 = DSH home data 目录，设计文档 §11；测试注入临时目录） */
  dir: string
  fs: PanelFs
}

export interface PanelStore {
  /** 校验并写盘（同 id 覆盖 = 更新面板）；返回相对路径 */
  save(panel: PanelDefinition): Promise<{ path: string }>
  /** 读盘；损坏/不存在返回 undefined */
  load(id: string): Promise<StoredPanel | undefined>
  /** 列出全部可读面板，按 savedAt 新→旧 */
  list(): Promise<StoredPanel[]>
}

/** 面板 id 文件名校验：与 §5.4 kebab-case 规则一致，杜绝路径穿越 */
const PANEL_ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function safeId(id: string): boolean {
  return PANEL_ID_RE.test(id)
}

/** 解析落盘记录；形状不符/损坏返回 undefined（容错，§11 降级） */
function decodeStoredPanel(value: unknown, expectedId: string): StoredPanel | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const record = value as Record<string, unknown>
  const panel = record.panel
  if (typeof panel !== 'object' || panel === null) return undefined
  const panelRecord = panel as Record<string, unknown>
  if (panelRecord.$schema !== 'openloop.panel/v1') return undefined
  if (panelRecord.id !== expectedId) return undefined
  if (typeof record.savedAt !== 'string' || typeof record.pluginVersion !== 'string') return undefined
  return { panel: panel as PanelDefinition, savedAt: record.savedAt, pluginVersion: record.pluginVersion }
}

export function createPanelStore(options: PanelStoreOptions): PanelStore {
  const filePath = (id: string) => `${options.dir}/${id}.json`
  return {
    async save(panel) {
      // fail-closed：非法面板拒绝写盘（校验失败抛 Error，消息面向 Agent 可自修正）
      validatePanel(panel)
      const record: StoredPanel = { panel, savedAt: new Date().toISOString(), pluginVersion: PLUGIN_VERSION }
      const relPath = filePath(panel.id)
      await options.fs.writeText(relPath, JSON.stringify(record, null, 2))
      return { path: relPath }
    },
    async load(id) {
      if (!safeId(id)) return undefined
      const content = await options.fs.readText(filePath(id))
      if (content === undefined) return undefined
      try {
        return decodeStoredPanel(JSON.parse(content) as unknown, id)
      } catch {
        return undefined // 损坏 JSON：容错返回 undefined
      }
    },
    async list() {
      let names: string[]
      try {
        names = await options.fs.listDir(options.dir)
      } catch {
        return [] // 目录不存在等：按空列表处理，不抛错
      }
      const ids = names.filter(name => name.endsWith('.json')).map(name => name.slice(0, -'.json'.length))
      const panels: StoredPanel[] = []
      for (const id of ids) {
        const stored = await this.load(id)
        if (stored) panels.push(stored)
      }
      panels.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1))
      return panels
    },
  }
}

// ---- 命名 API（S4 skill 唤起面板用，§11 降级语义在调用侧处理） ----

export function savePanel(panel: PanelDefinition, store: PanelStore): Promise<{ path: string }> {
  return store.save(panel)
}

export function loadPanel(id: string, store: PanelStore): Promise<StoredPanel | undefined> {
  return store.load(id)
}

export function listPanels(store: PanelStore): Promise<StoredPanel[]> {
  return store.list()
}

// ---- ctx.fs + sandboxPolicy 真机 backend ----

/**
 * ctx.fs 最小结构化类型（不引入 @deepseek-ai/dsh-fs 依赖；
 * 运行期对象即 ctx.fs，方法签名与 dsh-fs FileSystem 对齐，见 IMPL_NOTES §3.1）。
 */
export interface FsTargetLike {
  displayPath: string
  targetKey: unknown
}

export interface DshFsLike {
  resolve(path: string, opts?: { cwd?: string; signal?: AbortSignal }): Promise<FsTargetLike>
  stat(target: FsTargetLike, signal?: AbortSignal): Promise<unknown>
  readText(target: FsTargetLike, signal?: AbortSignal): Promise<string>
  writeText(target: FsTargetLike, content: string, expected?: unknown, signal?: AbortSignal, sandboxPolicy?: unknown): Promise<unknown>
  listDir(target: FsTargetLike, signal?: AbortSignal): Promise<Array<{ name: string }>>
}

export interface CtxPanelFsOptions {
  fs: DshFsLike
  /** 相对路径解析基（sandboxPolicy.workspaceRoot 优先，session cwd 兜底，IMPL_NOTES §3.2） */
  cwd?: string | undefined
  signal?: AbortSignal
  /** 第 5 参必须传 sandboxPolicy，漏传沙箱后端可能静默拒写（§3.3） */
  sandboxPolicy?: unknown
}

/** 用 ctx.fs + sandboxPolicy 实现 PanelFs（resolve 相对路径 + cwd，S10 seams） */
export function createCtxPanelFs(opts: CtxPanelFsOptions): PanelFs {
  const resolve = (path: string) => opts.fs.resolve(path, { ...(opts.cwd ? { cwd: opts.cwd } : {}), ...(opts.signal ? { signal: opts.signal } : {}) })
  return {
    async writeText(relPath, content) {
      const target = await resolve(relPath)
      await opts.fs.writeText(target, content, undefined, opts.signal, opts.sandboxPolicy)
    },
    async readText(relPath) {
      const target = await resolve(relPath)
      const info = await opts.fs.stat(target, opts.signal)
      if (!info) return undefined
      return opts.fs.readText(target, opts.signal)
    },
    async listDir(relDir) {
      const target = await resolve(relDir)
      const entries = await opts.fs.listDir(target, opts.signal)
      return entries.map(entry => entry.name)
    },
  }
}

// ---- 测试用内存 fs（注入即可测，不落盘） ----

export function createMemoryPanelFs(): PanelFs & { snapshot(): Map<string, string> } {
  const files = new Map<string, string>()
  return {
    async writeText(relPath, content) {
      files.set(relPath, content)
    },
    async readText(relPath) {
      return files.get(relPath)
    },
    async listDir(relDir) {
      const prefix = `${relDir}/`
      return [...files.keys()]
        .filter(key => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
        .map(key => key.slice(prefix.length))
    },
    snapshot() {
      return files
    },
  }
}
