/**
 * 画布存储：不可变快照 + workspace 隔离 + sandboxPolicy seams（设计文档 §4.2）。
 *
 * - 落点：ctx.fs.resolve 相对解析 → <DSH_HOME>/profiles/<profile>/data/qoder-canvas/<workspaceKey>/cv_<id>/<rev>.json
 * - 每次 revision 写新文件，永不覆盖（回放与审计地基）
 * - canvasId 只由本模块生成；Agent 自带 id 不存在 → 报错；跨 workspace → 「不存在」
 * - 写入必须带 sandboxPolicy（IMPL_NOTES §3.3：漏传 = 后端可能 read-only 静默失败）
 */
import type { CanvasSnapshot } from './dsl.ts'

export interface FsLike {
  /** 相对路径解析（cwd 回退链），返回绝对路径或 null */
  resolve(path: string, options?: { cwd?: string }): string | null
  readText(path: string): Promise<string | null>
  /** dsh-fs 形态：writeText(path, content, encoding?, signal?, policy?) */
  writeText(path: string, content: string, encoding?: unknown, signal?: unknown, policy?: unknown): Promise<void>
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

  private pathFor(canvasId: string, rev: number): string | null {
    return this.fs.resolve(`${this.rootDir}/${this.workspaceKey}/${canvasId}/${rev}.json`)
  }

  async save(snapshot: CanvasSnapshot, signal?: unknown): Promise<void> {
    const path = this.pathFor(snapshot.canvasId, snapshot.revision)
    if (path === null) throw new Error('qoder-canvas storage: fs.resolve returned null')
    await this.fs.writeText(path, JSON.stringify(snapshot), undefined, signal, this.policy)
  }

  /** 读最新快照（扫描 rev 递减；v0.1 不存索引文件，快照数 ≤ 轮数，线性可接受） */
  async latest(canvasId: string): Promise<CanvasSnapshot | null> {
    for (let rev = 999; rev >= 1; rev -= 1) {
      const snap = await this.read(canvasId, rev)
      if (snap !== null) return snap
    }
    return null
  }

  async read(canvasId: string, revision: number): Promise<CanvasSnapshot | null> {
    if (!Number.isInteger(revision) || revision < 1 || revision > 999) return null
    const path = this.pathFor(canvasId, revision)
    if (path === null) return null
    const raw = await this.fs.readText(path)
    if (raw === null) return null
    try {
      const parsed = JSON.parse(raw) as CanvasSnapshot
      if (parsed?.kind !== 'qoder-canvas' || parsed.canvasId !== canvasId || parsed.revision !== revision) return null
      return parsed
    } catch {
      return null
    }
  }

  /** 画布清单（list 参数）：扫 workspace 目录下全部 canvasId 取各自最新 rev */
  async list(): Promise<readonly { canvasId: string; title: string; revision: number }[]> {
    // v0.1：ctx.fs 无 readdir 约定，latest() 已按 canvasId 精确读；清单功能挂 M3（T1.4 list 参数返回空数组 + TODO）
    return []
  }
}
