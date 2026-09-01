// 同步 README.md 包矩阵表的版本列 ← packages/*/package.json 实际版本。
// 幂等：只在版本不一致时改写对应行，说明列与其他内容一律不动。
// 用法：node scripts/sync-readme-versions.mjs [--check]
//   --check：只报告漂移、不写文件，有漂移时 exit 1（CI 用）
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const checkOnly = process.argv.includes('--check')

// 1. 收集 workspace 包实际版本：name → version
const packagesDir = resolve(root, 'packages')
const actual = new Map()
for (const dir of readdirSync(packagesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const manifest = resolve(packagesDir, dir.name, 'package.json')
  if (!existsSync(manifest)) continue
  const { name, version } = JSON.parse(readFileSync(manifest, 'utf8'))
  if (name && version) actual.set(name, version)
}

// 2. 扫描 README，重写「| `包名` | 版本 |」行
const readmePath = resolve(root, 'README.md')
const lines = readFileSync(readmePath, 'utf8').split('\n')
const drift = []
const rewritten = lines.map((line) => {
  const m = line.match(/^(\|\s*`(@[^`]+)`\s*\|\s*)([^\s|]+)(\s*\|)/)
  if (!m) return line
  const [, prefix, name, current, suffix] = m
  const version = actual.get(name)
  if (!version || version === current) return line
  drift.push({ name, readme: current, actual: version })
  // 只替换版本列，行尾剩余部分（说明列）原样保留
  return `${prefix}${version}${suffix}${line.slice(m[0].length)}`
})

if (drift.length === 0) {
  console.log('README 版本表与 packages/*/package.json 一致，无需同步')
  process.exit(0)
}

for (const { name, readme, actual: v } of drift) {
  console.log(`  ${name}: ${readme} → ${v}`)
}

if (checkOnly) {
  console.error(`\n检测到 ${drift.length} 处版本漂移（README 落后于 package.json）`)
  process.exit(1)
}

writeFileSync(readmePath, rewritten.join('\n'))
console.log(`\n已同步 ${drift.length} 处版本到 README.md`)
