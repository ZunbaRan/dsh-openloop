/**
 * 画布存储：不可变快照 + workspace 隔离 + sandboxPolicy seams（设计文档 §4.2）。
 *
 * - 落点：ctx.fs.resolve 相对解析 → <DSH_HOME>/profiles/<profile>/data/qoder-canvas/<workspaceKey>/cv_<id>/<rev>.json
 * - 每次 revision 写新文件，永不覆盖（回放与审计地基）
 * - canvasId 只由本模块生成；Agent 自带 id 不存在 → 报错；跨 workspace → 「不存在」
 * - 写入必须带 sandboxPolicy（IMPL_NOTES §3.3：漏传 = 后端可能 read-only 静默失败）
 *
 * 0.1.2 fs API 适配（M4，2026-09-06 实证修复）：真实 FileSystem 的
 * resolve 是 async 返回 FsTarget，readText/writeText 收 target；旧 FsLike
 * 声明 resolve 同步返回 string——适配层从未正确工作，存储一直静默失败
 * （save catch 静默 + list 恒空 + 读端点 404 静默三重掩盖；meta 内嵌快照
 * 让渲染照常，掩盖了落盘缺失）。本版本对齐真实 API，list() 走 listDir 扫描。
 */
import type { CanvasSnapshot } from './dsl.ts'

/** 结构化路径身份（真实 FsTarget 的最小形态；宽松声明兼容测试桩） */
export interface FsTargetLike {
  readonly targetKey?: string
}

export interface FsDirEntryLike {
  readonly name: string
  readonly type: 'file' | 'directory' | 'other'
}

export interface FsLike {
  resolve(path: string, opts?: { cwd?: string }): Promise<FsTargetLike>
  readText(target: FsTargetLike, signal?: unknown): Promise<string>
  /** dsh-fs 形态：writeText(target, content, expected?, signal?, sandboxPolicy?) */
  writeText(target: FsTargetLike, content: string, expected?: unknown, signal?: unknown, policy?: unknown): Promise<unknown>
  listDir?(target: FsTargetLike, signal?: unknown): Promise<readonly FsDirEntryLike[]>
}

export interface StorageOptions {
  readonly fs: FsLike
  /** sandboxPolicy.resolve({session}) 的产物；writeText 第 5 参 */
  readonly policy?: unknown
  /** workspace 隔离键（session cwd 编码） */
  readonly workspaceKey: string
  /** 存储根（默认 'qoder-canvas'，测试可注入） */
  readonly rootDir?: string
}

/** 画布清单条目（工作区目录 + 版本管理 UI 的数据源） */
export interface CanvasIndexEntry {
  readonly canvasId: string
  readonly title: string
  /** 最新 revision */
  readonly revision: number
  /** 全部历史版本号（升序，含最新） */
  readonly revisions: readonly number[]
  /** 最近一次写入时间（ISO；listDir 无 mtime 时为空串，UI 自行容错） */
  readonly updatedAt: string
}

const DEFAULT_ROOT = 'qoder-canvas'

/** workspace 路径 → 隔离键（与 dsh 会话编码同风格：路径分隔符转下划线） */
export function workspaceKeyOf(cwd: string | undefined): string {
  if (cwd === undefined || cwd.length === 0) return '_no-cwd'
  return cwd.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
}

export class CanvasStorage {
  private readonly fs: FsLike
  private readonly policy: unknown
  private readonly workspaceKey: string
  private readonly rootDir: string

  constructor(options: StorageOptions) {
    this.fs = options.fs
    this.policy = options.policy
    this.workspaceKey = options.workspaceKey
    this.rootDir = options.rootDir ?? DEFAULT_ROOT
  }

  private async targetFor(canvasId: string, rev: number): Promise<FsTargetLike | null> {
    try {
      return await this.fs.resolve(`${this.rootDir}/${this.workspaceKey}/${canvasId}/${rev}.json`)
    } catch {
      return null
    }
  }

  async save(snapshot: CanvasSnapshot, signal?: unknown): Promise<void> {
    const target = await this.targetFor(snapshot.canvasId, snapshot.revision)
    if (target === null) throw new Error('qoder-canvas storage: fs.resolve failed')
    await this.fs.writeText(target, JSON.stringify(snapshot), undefined, signal, this.policy)
  }

  /** 目录列举（listDir 可用时；canvasId 目录内的 rev 文件名） */
  private async revisionsOfDir(canvasId: string): Promise<number[] | null> {
    if (typeof this.fs.listDir !== 'function') return null
    try {
      const dir = await this.fs.resolve(`${this.rootDir}/${this.workspaceKey}/${canvasId}`)
      const entries = await this.fs.listDir(dir)
      const revs: number[] = []
      for (const e of entries) {
        const m = /^(\d+)\.json$/.exec(e.name)
        if (e.type === 'file' && m !== null) revs.push(Number(m[1]))
      }
      return revs
    } catch {
      return null
    }
  }

  /** 读最新快照（listDir 优先；降级线性扫描——listDir 不可用的桩环境） */
  async latest(canvasId: string): Promise<CanvasSnapshot | null> {
    const revs = await this.revisionsOfDir(canvasId)
    if (revs !== null && revs.length > 0) {
      const max = Math.max(...revs)
      return await this.read(canvasId, max)
    }
    for (let rev = 999; rev >= 1; rev -= 1) {
      const snap = await this.read(canvasId, rev)
      if (snap !== null) return snap
    }
    return null
  }

  async read(canvasId: string, revision: number): Promise<CanvasSnapshot | null> {
    if (!Number.isInteger(revision) || revision < 1 || revision > 999) return null
    const target = await this.targetFor(canvasId, revision)
    if (target === null) return null
    let raw: string
    try {
      raw = await this.fs.readText(target)
    } catch {
      return null // 不存在 / 不可读
    }
    try {
      const parsed = JSON.parse(raw) as CanvasSnapshot
      if (parsed?.kind !== 'qoder-canvas' || parsed.canvasId !== canvasId || parsed.revision !== revision) return null
      return parsed
    } catch {
      return null
    }
  }

  /**
   * 画布清单（工作区目录/工具 list 参数）：listDir 扫 workspace 根，
   * 每个 cv_* 目录列 rev 文件，读最新 rev 拿标题。listDir 不可用（旧桩）返回空。
   */
  async list(): Promise<readonly CanvasIndexEntry[]> {
    if (typeof this.fs.listDir !== 'function') return []
    let entries: readonly FsDirEntryLike[]
    try {
      const wsDir = await this.fs.resolve(`${this.rootDir}/${this.workspaceKey}`)
      entries = await this.fs.listDir(wsDir)
    } catch {
      return []
    }
    const out: CanvasIndexEntry[] = []
    for (const e of entries) {
      if (e.type !== 'directory' || !/^cv_[a-z0-9]{8}$/.test(e.name)) continue
      const revs = (await this.revisionsOfDir(e.name)) ?? []
      if (revs.length === 0) continue
      const latestSnap = await this.read(e.name, Math.max(...revs))
      if (latestSnap === null) continue
      out.push({
        canvasId: e.name,
        title: latestSnap.canvas.title,
        revision: latestSnap.revision,
        revisions: [...revs].sort((a, b) => a - b),
        updatedAt: '',
      })
    }
    return out
  }
}
