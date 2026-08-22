/**
 * Runtime/静态资产服务（DSH_PANELS_DESIGN §9，服务端模块；写法参照 IMPL_NOTES §1）。
 *
 * - 经 `ctx.webServer.register` 注册 `kind: 'prefix'` 路由 `/openloop/runtime`
 *   （稳定前缀，panels 独占；与既有插件撞前缀时 register 会抛错——这是组合级契约，不能改前缀）。
 * - 请求 `<name>.<contentHash>.js|css` → 从 `packages/panels/assets/` 读 `<name>.<ext>`
 *   （contentHash 仅作 URL 标识，immutable 缓存依赖 URL 变化即缓存失效，文件本身由构建产物放置）。
 * - `Cache-Control: public, max-age=31536000, immutable`（D10 传输层策略）。
 * - 注册必须包在 `ctx.effect` 里做生命周期回收（IMPL_NOTES §1.4）。
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'

/** §9 路由前缀：绝对路径、无尾部斜杠（IMPL_NOTES §1.1 path 契约） */
export const RUNTIME_ASSETS_ROUTE = '/openloop/runtime'

/** 静态资产名：`<name>.<64hex>.js|css`；hash 至少 16 位 hex，防止与占位文件误匹配 */
const ASSET_PATH_RE = /^([a-zA-Z0-9._-]+)\.([0-9a-f]{16,64})\.(js|css)$/u

/**
 * URL name → 磁盘文件名别名（§8.2）：runtime 资产 URL 带 React 主版本前缀
 * `runtime.react18.<hash>.js`（react19 梯队预留 `runtime.react19.*`），
 * 磁盘文件恒为 assets/runtime.js（由 build:runtime 生成）；缺省一一对应。
 */
const ASSET_FILE_ALIASES: Readonly<Record<string, string>> = { 'runtime.react18': 'runtime' }

/** build:runtime 生成的 manifest 形状（assets/runtime.manifest.json） */
export interface RuntimeManifest {
  name: string
  hash: string
  url: string
  bytes: number
  builtAt: string
}

const CONTENT_TYPES = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8' } as const

function defaultAssetsDir(): string {
  // src/assets.ts 与 lib/assets.js 均在 packages/panels/ 子目录下，../assets/ 恒指向包内 assets/
  return fileURLToPath(new URL('../assets/', import.meta.url))
}

/** manifest 进程级缓存：构建后单进程内 URL 稳定（跨进程由 URL 中 hash 保证一致性） */
let manifestCache: RuntimeManifest | null = null

/** 读取 build:runtime 生成的 manifest（缺失时抛错，调用方决定降级） */
async function readRuntimeManifest(dir: string): Promise<RuntimeManifest> {
  if (manifestCache !== null) return manifestCache
  const body = await readFile(join(dir, 'runtime.manifest.json'), 'utf8')
  manifestCache = JSON.parse(body) as RuntimeManifest
  return manifestCache
}

/**
 * runtime 资产 URL（§9 / §8.2）：读 manifest 的规范 URL `runtime.react18.<hash>.js`。
 * baseOrigin 缺省返回相对路径（server 侧生成 srcDoc 时传宿主 origin 拼绝对 URL）。
 */
export async function runtimeUrlFor(baseOrigin = ''): Promise<string> {
  const manifest = await readRuntimeManifest(defaultAssetsDir())
  return baseOrigin === '' ? manifest.url : `${baseOrigin}${manifest.url}`
}

export class PanelsAssets {
  constructor(
    private readonly webServer: WebServer,
    private readonly assetsDir: string = defaultAssetsDir(),
  ) {}

  register(ctx: Context): void {
    ctx.effect(
      () => this.webServer.register({
        kind: 'prefix',
        path: RUNTIME_ASSETS_ROUTE,
        handler: (req, res) => this.handle(req, res),
      }),
      'openloop-panels: runtime assets',
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
    // §8.2：runtime.react18.<hash>.js 经别名映射读 assets/runtime.js（URL 版本前缀仅作标识）
    const file = join(this.assetsDir, `${ASSET_FILE_ALIASES[name] ?? name}.${ext}`)
    try {
      const body = await readFile(file)
      res.statusCode = 200
      res.setHeader('Content-Type', CONTENT_TYPES[ext])
      res.setHeader('Content-Length', String(body.byteLength))
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch {
      res.statusCode = 404
      res.end()
    }
  }
}
