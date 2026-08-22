/**
 * pack 资产路由（DSH_PANELS_DESIGN §9 / §12，服务端模块；写法参照 IMPL_NOTES §1）。
 *
 * - 经 `ctx.webServer.register` 注册 `kind: 'prefix'` 路由 `PACKS_ROUTE`（`/openloop/packs`，panels 独占前缀）。
 * - 路径 `/openloop/packs/<pack>/<path>`：
 *   - `<pack>` 从注册表解析（`registry.getPack`）；scoped 名（`@scope/name`）允许 `/` 作为第二段。
 *   - 虚拟名 `entry.js` / `styles.css` 从注册表映射到 manifest.entry / manifest.styles（§12 加载契约）；
 *     其余路径直接相对 pack.fsRoot 静态 serve。
 *   - 只 serve `.js` / `.mjs` / `.css`（v1 资产类型；CSP `script-src`/`style-src` 白名单同源）。
 * - 安全：包名走 `PACK_NAME_RE`（禁 `..`/反斜杠/空白）；文件相对路径经 `isSafePackRelPath`
 *   校验 + `resolve` 越界检查（纵深防御，防路径穿越）。
 * - `Cache-Control: public, max-age=31536000, immutable`（D10 传输层策略，pack 资产按内容 hash 命名）。
 * - 注册必须包在 `ctx.effect` 里做生命周期回收（IMPL_NOTES §1.4）。
 */
import { readFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { extname } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Context } from '@deepseek-ai/cordis'
import type { WebServer } from '@deepseek-ai/dsh-host-webserver'
import {
  PACKS_ROUTE,
  PACK_ENTRY_VIRTUAL,
  PACK_STYLES_VIRTUAL,
  PACK_NAME_RE,
  isSafePackRelPath,
} from './manifest.ts'
import { packRegistry, type PackRegistry } from './registry.ts'

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8',
}

/** 允许 serve 的资产扩展名（§9 pack 资产 = JS/CSS；其他扩展一律 404，fail-closed） */
const ALLOWED_EXTENSIONS = new Set(['js', 'mjs', 'css'])

/** 解析 `/openloop/packs/<pack>/<path>`；无法解析返回 null（404） */
function parsePackRef(rel: string): { name: string; path: string } | null {
  const segments = rel.split('/').filter(Boolean)
  if (segments.length === 0) return null
  const [first, second, ...rest] = segments
  if (first === undefined) return null
  let name: string
  let pathParts: string[]
  if (first.startsWith('@')) {
    // scoped 名：`@scope/name/<path>`
    if (second === undefined) return null
    name = `${first}/${second}`
    pathParts = rest
  } else {
    name = first
    pathParts = [second, ...rest].filter((part): part is string => part !== undefined)
  }
  let decoded: string
  try {
    decoded = decodeURIComponent(name)
  } catch {
    return null
  }
  // 包名白名单校验（禁 `..`/反斜杠/空白；含 %2F 编码的 scoped 名也在此放行）
  if (!PACK_NAME_RE.test(decoded)) return null
  return { name: decoded, path: pathParts.join('/') }
}

export class PanelsPackAssets {
  constructor(
    private readonly webServer: WebServer,
    private readonly registry: PackRegistry = packRegistry,
  ) {}

  register(ctx: Context): void {
    ctx.effect(
      () => this.webServer.register({
        kind: 'prefix',
        path: PACKS_ROUTE,
        handler: (req, res) => this.handle(req, res),
      }),
      'openloop-panels: pack assets',
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
    const rel = pathname.startsWith(`${PACKS_ROUTE}/`) ? pathname.slice(PACKS_ROUTE.length + 1) : ''
    const ref = parsePackRef(rel)
    if (ref === null) {
      res.statusCode = 404
      res.end()
      return
    }
    // 从注册表解析 pack（§9 / §12：serve 与注册表强绑定）
    const pack = this.registry.getPack(ref.name)
    if (pack === undefined) {
      res.statusCode = 404
      res.end()
      return
    }
    // 虚拟入口/样式名 → manifest 实际路径
    let relPath = ref.path
    if (relPath === PACK_ENTRY_VIRTUAL) {
      relPath = pack.manifest.entry
    } else if (relPath === PACK_STYLES_VIRTUAL) {
      if (pack.manifest.styles === undefined) {
        res.statusCode = 404
        res.end()
        return
      }
      relPath = pack.manifest.styles
    }
    // 安全：相对路径形状校验（禁 `..`/绝对前缀/反斜杠）+ 扩展名白名单
    if (!isSafePackRelPath(relPath) || pack.fsRoot === '') {
      res.statusCode = 404
      res.end()
      return
    }
    const ext = extname(relPath).slice(1)
    const contentType = CONTENT_TYPES[ext]
    if (contentType === undefined || !ALLOWED_EXTENSIONS.has(ext)) {
      res.statusCode = 404
      res.end()
      return
    }
    const target = join(pack.fsRoot, ...relPath.split('/'))
    const root = resolve(pack.fsRoot)
    const resolvedTarget = resolve(target)
    // 越界防护（纵深防御）：解析后的文件必须位于 pack 根内
    if (resolvedTarget !== root && !resolvedTarget.startsWith(`${root}${sep}`)) {
      res.statusCode = 404
      res.end()
      return
    }
    try {
      const body = await readFile(resolvedTarget)
      res.statusCode = 200
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Length', String(body.byteLength))
      res.end(req.method === 'HEAD' ? undefined : body)
    } catch {
      res.statusCode = 404
      res.end()
    }
  }
}
