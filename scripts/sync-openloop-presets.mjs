// 生成 packages/theme/src/presets.generated.ts 的 46 个上游键（8 预设 × light/dark）。
// 注意：presets.generated.ts 还含 4 个人工策展键（foreground-subtle/foreground-strong/border-muted/border-strong），
// 值取自 docs/token-v2-values.md §二，本脚本不维护；重跑本脚本会丢弃它们，需按表回填。
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const themeCss = await readFile(resolve(root, '../openchamber/packages/ui/src/styles/ocix-theme.css'), 'utf8')
const presetCss = await readFile(resolve(root, '../openchamber/packages/ui/src/styles/ocix-presets.css'), 'utf8')
const ids = ['linear', 'vercel', 'notion', 'claude', 'apple', 'figma', 'binance', 'slack']
const wanted = [
  'surface', 'surface-muted', 'surface-subtle', 'border', 'foreground', 'muted-foreground',
  'selection', 'selection-foreground', 'focus-ring', 'primary', 'primary-foreground', 'primary-tint', 'primary-shade',
  'success', 'success-background', 'success-border', 'warning', 'warning-background', 'warning-border',
  'error', 'error-background', 'error-border', 'info', 'info-background', 'info-border',
  ...Array.from({ length: 8 }, (_, index) => `chart-${index + 1}`),
  ...Array.from({ length: 5 }, (_, index) => `chart-seq-${index + 1}`),
  'delta-up', 'delta-down', 'delta-flat', 'radius-sm', 'radius-md', 'radius-lg', 'shadow-1', 'shadow-2',
]

function declarations(body) {
  return Object.fromEntries([...body.matchAll(/--ocix-([\w-]+)\s*:\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]))
}
function blocks(css) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(match => ({ selector: match[1].trim(), values: declarations(match[2]) }))
}
const themeBlocks = blocks(themeCss)
const presetBlocks = blocks(presetCss)
const linearLight = themeBlocks.find(block => block.selector.endsWith('.ocix-scope') && !block.selector.includes("[data-theme='dark']"))?.values ?? {}
const linearDark = themeBlocks.find(block => block.selector.includes("[data-theme='dark'] .ocix-scope") && !block.selector.includes('data-ocix-preset'))?.values ?? {}

function valuesFor(id, mode) {
  if (id === 'linear') return { ...linearLight, ...(mode === 'dark' ? linearDark : {}) }
  const light = presetBlocks.find(block => block.selector.endsWith(`.ocix-scope[data-ocix-preset='${id}']`) && !block.selector.includes("[data-theme='dark']"))?.values ?? {}
  const dark = presetBlocks.find(block => block.selector.includes("[data-theme='dark']") && block.selector.includes(`data-ocix-preset='${id}'`))?.values ?? {}
  return { ...linearLight, ...light, ...(mode === 'dark' ? { ...linearDark, ...dark } : {}) }
}
const palettes = Object.fromEntries(ids.map(id => [id, { light: valuesFor(id, 'light'), dark: valuesFor(id, 'dark') }]))
for (const [id, modes] of Object.entries(palettes)) for (const [mode, values] of Object.entries(modes)) {
  const missing = wanted.filter(token => !values[token])
  if (missing.length) throw new Error(`${id}/${mode} missing: ${missing.join(', ')}`)
}
const output = `// Generated from OpenChamber OCIX Style v2 by scripts/sync-openloop-presets.mjs.\n` +
  `export const OPENLOOP_PRESET_IDS = ${JSON.stringify(ids)} as const\n` +
  `export const OPENLOOP_PRESETS = ${JSON.stringify(palettes, null, 2)} as const\n`
await writeFile(resolve(root, 'packages/theme/src/presets.generated.ts'), output)
