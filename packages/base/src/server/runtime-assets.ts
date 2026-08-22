/**
 * OpenLoop base · runtime 资产共享路由（/openloop/runtime 前缀，注册制）。
 *
 * 架构（base 重构 2026-08-22）：
 * - **路由唯一供应商 = base**（前缀 /openloop/runtime；与其它插件撞前缀时 register 抛错）。
 * - **资产文件归属各业务包**：包在自己的 server 模块 import 时调用
 *   `registerRuntimeAssets(dir, { 'runtime.react18': 'runtime' })` 完成注册
 *   （import 副作用发生在模块加载期，早于任何 cordis apply，无启动顺序问题）。
 * - 请求 `<name>.<contentHash>.js|css` → 在注册目录中查 `<fileAlias|name>.<ext>`。
 * - `Cache-Control: public, max-age=31536000, immutable`（URL 含 hash，缓存失效靠 URL 变化）。
 *
 * 迁移自 panels/src/assets.ts（v0.2.x 行为保持：URL 不变、别名映射不变、宽松 hash 匹配不变）。
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'

/** §9 路由前缀：绝对路径、无尾部斜杠 */
export const RUNTIME_ASSETS_ROUTE = '/openloop/runtime'

/** 静态资产名：`<name>.<hash>.js|css`；hash 至少 16 位 hex */
const ASSET_PATH_RE = /^([a-zA-Z0-9._-]+)\.([0-9a-f]{16,64})\.(js|css)$/u

const CONTENT_TYPES = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8' } as const

export interface RuntimeAssetEntry {
  /** 目录（绝对路径；资产文件所在处） */
  dir: string
  /** URL name → 磁盘文件名别名（如 'runtime.react18' → 'runtime'） */
  aliases?: Readonly<Record<string, string>>
}

/**
 * runtime 资产注册服务（cordis service：openloop-base/runtime）。
 * 注册表挂在 service 上而非模块级——消费者（panels 等）会把 base/server 的
 * 纯函数打进自己的包（无状态副本安全），模块级单例会因副本分裂而失效；
 * service 由 base 插件的 ctx 持有，天然单例。
 */
export interface RuntimeAssetsService {
  /** 注册一个包的 runtime 资产目录（names 为本目录承担的 URL name 列表） */
  registerRuntimeAssets(names: readonly string[], entry: RuntimeAssetEntry): void
}

export function createRuntimeAssetsService(): RuntimeAssetsService & {
  resolve(name: string): RuntimeAssetEntry | undefined
} {
  const registry = new Map<string, RuntimeAssetEntry>()
  return {
    registerRuntimeAssets(names, entry) {
      for (const name of names) registry.set(name, entry)
    },
    resolve(name) {
      return registry.get(name)
    },
  }
}

/** 路由处理器：按注册 service 解析资产文件并回源 */
export class RuntimeAssetsRoute {
  constructor(
    private readonly webServer: WebServer,
    private readonly resolveAsset: (name: string) => RuntimeAssetEntry | undefined,
  ) {}

  register(ctx: Context): void {
    ctx.effect(
      () => this.webServer.register({
        kind: 'prefix',
        path: RUNTIME_ASSETS_ROUTE,
        handler: (req, res) => this.handle(req, res),
      }),
      'openloop-base: runtime assets',
    )
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'no-referrer')
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405
      res.end()
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://loopback.invalid').pathname
    const rel = pathname.startsWith(`${RUNTIME_ASSETS_ROUTE}/`)
      ? pathname.slice(RUNTIME_ASSETS_ROUTE.length + 1)
      : ''
    const match = rel.match(ASSET_PATH_RE)
    if (!match) {
      res.statusCode = 404
      res.end()
      return
    }
    const name = match[1] as string
    const ext = match[3] as 'js' | 'css'
    const entry = this.resolveAsset(name)
    if (!entry) {
      res.statusCode = 404
      res.end()
      return
    }
    const file = join(entry.dir, `${entry.aliases?.[name] ?? name}.${ext}`)
    try {
      const body = await readFile(file)
      res.statusCode = 200
      res.setHeader('Content-Type', CONTENT_TYPES[ext])
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch {
      res.statusCode = 404
      res.end()
    }
  }
}
