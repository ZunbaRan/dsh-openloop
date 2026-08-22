import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const bundleUrl = new URL('../lib/client.js', import.meta.url)
const source = await readFile(bundleUrl, 'utf8')
const requires = [...source.matchAll(/require\(["']([^"']+)["']\)/g)].map(match => match[1])
const allowed = new Set([
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-tool/client',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@openloop/dsh-visual-theme/client',
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
])
const forbidden = [...new Set(requires.filter(id => !allowed.has(id)))]

if (forbidden.length > 0) {
  throw new Error(`Declarative client bundle imports modules unavailable to the DSH browser loader: ${forbidden.join(', ')} (${fileURLToPath(bundleUrl)})`)
}

console.log(`Verified declarative client bundle imports: ${[...new Set(requires)].sort().join(', ')}`)
