/**
 * runtime 资产构建（DSH_PANELS_DESIGN §8.2/§9；S3 收尾）。
 *
 * 用 esbuild（包 devDependency，createRequire 从包内 require）打包
 * [react, react-dom, src/sandbox/runtime-entry.tsx] → assets/runtime.js
 * （bundle + minify + format=iife + target=es2020）。runtime-entry 运行在 iframe 内、
 * 独立于宿主，故 react/react-dom 全部打进 bundle，不引宿主环境。
 *
 * 构建后回写两份产物（保证 client 内嵌哈希与生成的 runtime.js 一致）：
 * - assets/runtime.manifest.json：内容哈希 + 规范 URL；server 侧 assets.runtimeUrlFor() 读取
 * - src/client/runtime-url.gen.ts：client 端 runtimeUrl()（PanelCard 生成 iframe 资产 URL）
 *
 * 注意：本脚本在 build 链中先于 tsdown 执行（package.json build），使 client bundle
 * 内嵌的 RUNTIME_ASSET_HASH 与本次生成的 assets/runtime.js 对齐，避免 immutable 缓存
 * 因哈希滞后而命中旧资产。
 */
import { createRequire } from 'node:module'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const esbuild = require('esbuild')

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const ENTRY = join(ROOT, 'src/sandbox/runtime-entry.tsx')
const OUT_JS = join(ROOT, 'assets/runtime.js')
const OUT_MANIFEST = join(ROOT, 'assets/runtime.manifest.json')
const OUT_GEN = join(ROOT, 'src/client/runtime-url.gen.ts')

const result = await esbuild.build({
  entryPoints: [ENTRY],
  outfile: OUT_JS,
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
})

if (result.errors.length > 0) {
  throw new Error(`runtime bundle failed: ${result.errors.map(error => error.text).join('; ')}`)
}

const body = await readFile(OUT_JS)
const hash = createHash('sha256').update(body).digest('hex').slice(0, 16)
// §8.2：runtime URL 带 React 主版本前缀（runtime.react18.<hash>.js；react19 梯队预留同规则），
// 磁盘文件仍为 assets/runtime.js，assets.ts 经 name 别名映射回读（见 src/assets.ts）
const url = `/openloop/runtime/runtime.react18.${hash}.js`

await mkdir(dirname(OUT_MANIFEST), { recursive: true })
await mkdir(dirname(OUT_GEN), { recursive: true })
await writeFile(
  OUT_MANIFEST,
  `${JSON.stringify({ name: 'runtime.react18', hash, url, bytes: body.byteLength, builtAt: new Date().toISOString() }, null, 2)}\n`,
  'utf8',
)
await writeFile(
  OUT_GEN,
  `/**
 * 生成文件（scripts/build-runtime.mjs 构建时回写）——请勿手改。
 * RUNTIME_ASSET_HASH 与 assets/runtime.js 的内容哈希一致；§9 路由以
 * runtime.<hash>.js 分发（hash 只作 URL 标识，immutable 缓存靠 URL 变化失效）。
 */
export const RUNTIME_ASSET_HASH = '${hash}'

/** 最新 runtime 资产相对 URL（§9；build:runtime 后更新） */
export const RUNTIME_ASSET_PATH = '${url}'

/** 沙箱 iframe 的 runtime 资产 URL（默认宿主 origin；非宿主环境可传 baseOrigin） */
export function runtimeUrl(baseOrigin = globalThis.location?.origin ?? ''): string {
  return baseOrigin === '' ? RUNTIME_ASSET_PATH : \`\${baseOrigin}\${RUNTIME_ASSET_PATH}\`
}
`,
  'utf8',
)

console.log(`built ${OUT_JS} (${body.byteLength} bytes, sha256 ${hash})`)
console.log(`manifest: ${OUT_MANIFEST}`)
console.log(`generated: ${OUT_GEN}`)
