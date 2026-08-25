import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const bundleUrl = new URL('../lib/client.js', import.meta.url)
const source = await readFile(bundleUrl, 'utf8')
const requires = [...source.matchAll(/require\(["']([^"']+)["']\)/g)].map(match => match[1])
const allowed = new Set([
  '@deepseek-ai/dsh-client-runtime/client',
  '@openloop/dsh-base/client',
  '@openloop/dsh-panels/client',
  '@openloop/dsh-html-artifact/client',
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  // react-grid-layout v2 的内部依赖，tsdown 保持为外部 require。DSH loader 对
  // 未注册 id 的解析是惰性/分支内的——0.3.x 全系列在生产实测可用（面板与拖拽正常），
  // 静态加白以固定该事实；若 loader 行为变化需重新评估。
  'react-resizable',
])
const forbidden = [...new Set(requires.filter(id => !allowed.has(id)))]

if (forbidden.length > 0) {
  throw new Error(`Dock client bundle imports modules unavailable to the DSH browser loader: ${forbidden.join(', ')} (${fileURLToPath(bundleUrl)})`)
}

console.log(`Verified dock client bundle imports: ${[...new Set(requires)].sort().join(', ')}`)
